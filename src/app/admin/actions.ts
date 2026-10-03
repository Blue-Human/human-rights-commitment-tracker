"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminPatch, adminRest, adminRpc } from "@/lib/admin/db";
import { checkCredentials, endSession, requireAdmin, startSession } from "@/lib/admin/session";

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

// Public pages are cached; refresh them so a change is visible straight away.
function refresh(publicId?: string) {
  revalidatePath("/");
  revalidatePath("/monitoring");
  revalidatePath("/admin", "layout");
  if (publicId) revalidatePath(`/commitments/${publicId}`);
}

export async function login(form: FormData) {
  if (!checkCredentials(text(form, "user"), text(form, "password"))) redirect("/admin/login?error=1");
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

export async function setAssessment(form: FormData) {
  await requireAdmin();
  const publicId = text(form, "public_id");
  await adminRpc("hrct_admin_set_assessment", {
    p_public_id: publicId, p_status: text(form, "status"), p_confidence: text(form, "confidence"),
    p_rationale: text(form, "rationale"), p_reason: text(form, "reason"),
  });
  refresh(publicId);
}

export async function confirmAssessment(form: FormData) {
  await requireAdmin();
  const publicId = text(form, "public_id");
  await adminRpc("hrct_admin_confirm_assessment", { p_public_id: publicId });
  refresh(publicId);
}

export async function resolveProposal(form: FormData) {
  await requireAdmin();
  const publicId = text(form, "public_id");
  const decision = text(form, "decision") === "confirm" ? "confirm" : "reject";
  await adminRpc("hrct_resolve_research_review", { p_public_id: publicId, p_decision: decision, p_resolved_by: process.env.ADMIN_USER || "admin" });
  refresh(publicId);
}

export async function reviewEvidence(form: FormData) {
  await requireAdmin();
  const op = text(form, "op");
  const values = op === "confirm" ? { reviewed_at: new Date().toISOString(), is_public: true } : op === "hide" ? { is_public: false } : { is_public: true };
  await adminPatch("evidence", text(form, "id"), values);
  refresh(text(form, "public_id"));
}

export async function moderateItem(form: FormData) {
  await requireAdmin();
  const op = text(form, "op");
  const summary = text(form, "summary");
  const relation = text(form, "relation");
  const values: Record<string, unknown> =
    op === "reject" ? { status: "rejected", is_public: false }
    : op === "hide" ? { is_public: false }
    : { status: "reviewed", is_public: true };
  if (op !== "reject" && op !== "hide") {
    if (form.has("summary")) values.summary = summary || null;
    if (["supports_need", "supports_progress", "contradicts_progress", "context"].includes(relation)) values.relation = relation;
  }
  await adminPatch("monitoring_items", text(form, "id"), values);
  refresh(text(form, "public_id"));
}

export async function toggleFeed(form: FormData) {
  await requireAdmin();
  await adminPatch("monitoring_feeds", text(form, "id"), { enabled: text(form, "enabled") === "true" });
  refresh();
}

export async function addFeed(form: FormData) {
  await requireAdmin();
  const url = text(form, "url");
  const name = text(form, "name");
  if (!name || !/^https?:\/\//.test(url)) redirect("/admin/feeds?error=1");
  const sourceType = ["news", "official_web", "un_body", "civil_society"].includes(text(form, "source_type")) ? text(form, "source_type") : "news";
  await adminRest("monitoring_feeds?on_conflict=url", {
    method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ name, url, source_type: sourceType, spain_focused: form.get("spain_focused") === "on" }),
  });
  refresh();
}
