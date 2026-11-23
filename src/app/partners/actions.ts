'use server';
import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminRest, adminRpc } from '@/lib/admin/db';
import { requireAdmin } from '@/lib/admin/session';
import { validId, parseValues } from '@/lib/programmes/model';
import { accountById, authRequest, startPartnerSession, endPartnerSession, requirePartner, tokenHash, type PartnerAccount } from '@/lib/partners/server';
type Result = { error?: string; success?: string; invitation?: string };
const text = (form: FormData, name: string) => String(form.get(name) || '').trim();
const actor = () => process.env.ADMIN_USER!;
export async function loginPartner(form: FormData): Promise<Result> {
  let account: PartnerAccount | null;
  try {
    const email = text(form, 'email').toLowerCase(), password = String(form.get('password') || '');
    if (email.length > 254 || password.length > 1024 || !email || !password) return { error: 'Email o contraseña incorrectos, o acceso desactivado.' };
    const auth = await authRequest<{ user: { id: string } }>('token?grant_type=password', { email, password });
    account = await accountById(auth.user.id);
    if (!account) return { error: 'Email o contraseña incorrectos, o acceso desactivado.' };
    await startPartnerSession(account.id, account.session_version);
  } catch { return { error: 'Email o contraseña incorrectos, o acceso desactivado.' }; }
  redirect('/partners');
}
export async function logoutPartner() { await endPartnerSession(); redirect('/partners/login'); }
export async function activatePartner(form: FormData): Promise<Result> {
  const token = text(form, 'token'), password = String(form.get('password') || '');
  if (!/^[a-f0-9]{64}$/.test(token)) return { error: 'La invitación no es válida o ha caducado. Pide una nueva a Blue Human.' };
  if (password.length < 12 || password.length > 128 || password !== String(form.get('confirmation') || '')) return { error: 'Usa al menos 12 caracteres y repite la misma contraseña.' };
  const hash = await tokenHash(token), claim = await tokenHash(randomBytes(32).toString('hex'));
  let claimed = false;
  try {
    const account = await adminRpc<{ id: string }>('hrct_partner_activation', { p_hash: hash, p_claim: claim, p_operation: 'claim' });
    claimed = true;
    await authRequest(`admin/users/${account.id}`, { password }, true);
    const activated = await adminRpc<{ id: string; session_version: number }>('hrct_partner_activation', { p_hash: hash, p_claim: claim, p_operation: 'finish' });
    await startPartnerSession(activated.id, activated.session_version);
  } catch {
    if (claimed) await adminRpc('hrct_partner_activation', { p_hash: hash, p_claim: claim, p_operation: 'release' }).catch(() => undefined);
    return { error: 'No se pudo activar el acceso. Comprueba la invitación y la contraseña o pide una nueva a Blue Human.' };
  }
  redirect('/partners');
}
export async function invitePartner(form: FormData): Promise<Result> {
  await requireAdmin();
  const partner = text(form, 'partner_id'), email = text(form, 'email').toLowerCase(), name = text(form, 'display_name');
  if (!validId(partner) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 200) return { error: 'Completa un nombre y un email válidos.' };
  let createdIdentity: string | undefined;
  try {
    const org = await adminRest<{ id: string }[]>(`partners?select=id&id=eq.${partner}&archived_at=is.null&limit=1`);
    if (!org.length) return { error: 'El partner no está disponible.' };
    const accounts = await adminRest<PartnerAccount[]>(`partner_accounts?select=id,partner_id,active,email&email=eq.${encodeURIComponent(email)}&archived_at=is.null&limit=1`);
    if (accounts[0] && (accounts[0].partner_id !== partner || !accounts[0].active)) return { error: 'Este email ya tiene una cuenta o su acceso está desactivado.' };
    const id = accounts[0]?.id || (await authRequest<{ id: string }>('admin/users', { email, password: randomBytes(48).toString('base64url'), email_confirm: true }, true)).id;
    if (!accounts.length) createdIdentity = id;
    const token = randomBytes(32).toString('hex');
    await adminRpc('hrct_partner_invite', { p_id: id, p_partner: partner, p_email: email, p_name: name, p_hash: await tokenHash(token), p_actor: actor() });
    revalidatePath(`/admin/programmes/partners/${partner}`);
    return { invitation: `/partners/activate?token=${token}`, success: 'Invitación creada. Copia el enlace y compártelo con esta persona. Caduca en 7 días.' };
  } catch {
    if (createdIdentity) await authRequest(`admin/users/${createdIdentity}`, {}, true, 'DELETE').catch(() => undefined);
    return { error: 'No se pudo crear la invitación. Comprueba si el email ya tiene una cuenta.' };
  }
}
export async function changePartnerAccess(form: FormData): Promise<Result> {
  await requireAdmin();
  const id = text(form, 'id'), partner = text(form, 'partner_id'), active = text(form, 'active');
  if (!validId(id) || !validId(partner) || !['true', 'false'].includes(active)) return { error: 'Cuenta inválida.' };
  try { await adminRpc('hrct_partner_account_status', { p_id: id, p_partner: partner, p_active: active === 'true', p_actor: actor() }); }
  catch { return { error: 'No se pudo cambiar el acceso.' }; }
  revalidatePath(`/admin/programmes/partners/${partner}`);
  return { success: active === 'true' ? 'Acceso activado.' : 'Acceso desactivado. Las sesiones anteriores ya no son válidas.' };
}
export async function submitPartnerEvidence(form: FormData): Promise<Result> {
  const account = await requirePartner(), project = text(form, 'project_id');
  if (!validId(project)) return { error: 'Proyecto inválido.' };
  try {
    // Reuse validation, then explicitly select the only partner-editable fields.
    const normalized = new FormData();
    for (const field of ['title', 'description', 'evidence_type', 'source', 'source_url', 'evidence_date', 'activity_id']) normalized.set(field, text(form, field));
    normalized.set('project_id', project);
    const parsed = parseValues('evidence', normalized);
    const values = Object.fromEntries(['title', 'description', 'evidence_type', 'source', 'source_url', 'evidence_date', 'activity_id'].map(field => [field, parsed[field]]));
    await adminRpc('hrct_partner_submit_evidence', { p_account: account.id, p_project: project, p_values: values });
  } catch (error) {
    return { error: error instanceof Error && !error.message.startsWith('Supabase') ? error.message : 'No se pudo enviar la evidencia. Comprueba que conservas acceso al proyecto.' };
  }
  revalidatePath(`/partners/projects/${project}`);
  revalidatePath('/admin/programmes', 'layout');
  return { success: 'Evidencia enviada. Blue Human la revisará antes de compartirla.' };
}
