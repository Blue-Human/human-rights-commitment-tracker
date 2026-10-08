import { createHmac, timingSafeEqual } from 'node:crypto';
const duration = 12 * 60 * 60 * 1000;
export function encodePartnerSession(id: string, version: number, secret: string, now = Date.now()) {
  if (!secret) throw new Error('Session configuration unavailable');
  const payload = `${id}.${version}.${now + duration}`;
  return `${payload}.${createHmac('sha256', secret).update(`hrct-partner-v1:${payload}`).digest('hex')}`;
}
export function decodePartnerSession(cookie: string, secret: string, now = Date.now()) {
  const parts = cookie.split('.');
  if (!secret || parts.length !== 4 || !/^[a-f0-9-]{36}$/.test(parts[0]) || !/^\d+$/.test(parts[1]) || !/^\d+$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return null;
  const expected = createHmac('sha256', secret).update(`hrct-partner-v1:${parts.slice(0, 3).join('.')}`).digest();
  if (!timingSafeEqual(expected, Buffer.from(parts[3], 'hex')) || Number(parts[2]) <= now || Number(parts[2]) > now + duration) return null;
  return { id: parts[0], version: Number(parts[1]) };
}
