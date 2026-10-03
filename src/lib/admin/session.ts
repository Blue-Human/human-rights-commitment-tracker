import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Single admin account, configured in the environment (ADMIN_USER / ADMIN_PASSWORD).
// The session is a signed, http-only cookie; nothing is stored server-side.

const COOKIE = "hrct_admin";
const MAX_AGE_SECONDS = 12 * 60 * 60;

const secret = () => process.env.ADMIN_SESSION_SECRET || "";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

function sameText(a: string, b: string) {
  // Compare digests so the comparison takes the same time whatever the lengths.
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export function adminConfigured() {
  return !!(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD && secret() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function checkCredentials(user: string, password: string) {
  if (!adminConfigured()) return false;
  return sameText(user, process.env.ADMIN_USER!) && sameText(password, process.env.ADMIN_PASSWORD!);
}

export async function startSession() {
  const expires = String(Date.now() + MAX_AGE_SECONDS * 1000);
  (await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature || !sameText(signature, sign(expires))) return false;
  return Number(expires) > Date.now();
}

// Call at the top of every admin page and server action.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
