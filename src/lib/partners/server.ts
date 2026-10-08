import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminRest, adminRpc } from '@/lib/admin/db';
import { encodePartnerSession, decodePartnerSession } from './cookie';
export type PartnerAccount = { id: string; partner_id: string; email: string; display_name: string; active: boolean; activated_at: string | null; session_version: number };
export type SharedRecord = { id: string } & Record<string, string | number | null>;
export type PartnerProject = { project: SharedRecord; activities: SharedRecord[]; outputs: SharedRecord[]; outcomes: SharedRecord[]; indicators: SharedRecord[]; evidence: SharedRecord[]; submissions: SharedRecord[] };
const cookieName = 'hrct_partner';
export const tokenHash = async (value: string) => (await import('node:crypto')).createHash('sha256').update(value).digest('hex');
export async function authRequest<T>(path: string, body: Record<string, unknown>, admin = false, method?: 'DELETE'): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = admin ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Auth unavailable');
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: method || (path.startsWith('admin/users/') ? 'PUT' : 'POST'),
    headers: { apikey: key, ...(admin ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Auth request rejected');
  return response.json() as Promise<T>;
}
export async function accountById(id: string) {
  const rows = await adminRest<PartnerAccount[]>(`partner_accounts?select=id,partner_id,email,display_name,active,activated_at,session_version&id=eq.${encodeURIComponent(id)}&archived_at=is.null&limit=1`);
  const account = rows[0];
  if (!account?.active || !account.activated_at) return null;
  const org = await adminRest<{ id: string }[]>(`partners?select=id&id=eq.${account.partner_id}&archived_at=is.null&limit=1`);
  return org.length ? account : null;
}
export async function currentPartner() {
  const cookie = (await cookies()).get(cookieName)?.value;
  const parsed = cookie && decodePartnerSession(cookie, process.env.ADMIN_SESSION_SECRET || '');
  if (!parsed) return null;
  const account = await accountById(parsed.id);
  return account?.session_version === parsed.version ? account : null;
}
export async function requirePartner() {
  const account = await currentPartner();
  if (!account) redirect('/partners/login');
  return account;
}
export async function startPartnerSession(id: string, version: number) {
  (await cookies()).set(cookieName, encodePartnerSession(id, version, process.env.ADMIN_SESSION_SECRET || ''), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 60 * 60,
  });
}
export async function endPartnerSession() { (await cookies()).delete(cookieName); }
export const partnerProjects = (account: PartnerAccount) => adminRpc<SharedRecord[]>('hrct_partner_projects', { p_account: account.id });
export const partnerProject = (account: PartnerAccount, id: string) => adminRpc<PartnerProject | null>('hrct_partner_project', { p_account: account.id, p_project: id });
