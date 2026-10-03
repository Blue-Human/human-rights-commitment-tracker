import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REST = `${SUPABASE_URL}/rest/v1`;

const stop = new Set(["españa","spain","para","contra","sobre","desde","hasta","entre","como","that","with","from","this","their","rights","human","national","continue","strengthen","combat","ensure","adopt","efforts","measures","implementation","effective"]);

function tokens(s: string) {
  return (s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9áéíóúñ]{4,}/g) || []).filter((x) => !stop.has(x));
}
function score(title: string, query: string) {
  const a = new Set(tokens(title));
  const b = new Set(tokens(query));
  let hit = 0;
  for (const x of b) if (a.has(x)) hit++;
  return Math.min(0.98, 0.58 + (hit / Math.max(2, b.size)) * 0.4);
}
function isoDate(raw: unknown) {
  if (!raw) return null;
  const s = String(raw);
  if (/^\d{14}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function domain(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; }
}
function xmlDecode(s: string) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function tag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? xmlDecode(m[1].replace(/<[^>]+>/g, "").trim()) : null;
}

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${REST}/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

async function upsertItem(item: Record<string, unknown>) {
  const r = await fetch(`${REST}/monitoring_items?on_conflict=commitment_id,url`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(item),
  });
  if (!r.ok) throw new Error(`insert ${r.status} ${await r.text()}`);
}

async function gdelt(commitmentId: string, query: string, kind: "need_context" | "implementation_candidate", relation: "supports_need" | "supports_progress", days: number) {
  const endpoint = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("mode", "artlist");
  endpoint.searchParams.set("maxrecords", "12");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("sort", "datedesc");
  endpoint.searchParams.set("timespan", `${Math.min(30, Math.max(1, days))}d`);
  const r = await fetch(endpoint, { headers: { "User-Agent": "BlueHuman-HRCT/1.0 (+https://bluehuman.org)" } });
  if (!r.ok) return 0;
  const data = await r.json().catch(() => ({}));
  const articles = Array.isArray(data?.articles) ? data.articles : [];
  let n = 0;
  for (const a of articles) {
    if (!a?.url || !a?.title) continue;
    const rel = score(a.title, query);
    if (rel < 0.62) continue;
    const d = domain(a.url);
    const official = !!d && ["boe.es", "interior.gob.es", "inclusion.gob.es", "igualdad.gob.es", "lamoncloa.gob.es", "defensordelpueblo.es", "congreso.es", "senado.es", "poderjudicial.es"].some((x) => d === x || d.endsWith(`.${x}`));
    await upsertItem({
      commitment_id: commitmentId,
      kind: official && kind === "need_context" ? "statement" : kind,
      relation: official && kind === "need_context" ? "context" : relation,
      title: a.title,
      url: a.url,
      publisher: a.domain || d,
      source_domain: d,
      source_type: official ? "official_web" : "news",
      published_at: isoDate(a.seendate),
      summary: null,
      excerpt: null,
      relevance_score: rel,
      status: "auto",
      is_public: rel >= 0.72,
      last_seen_at: new Date().toISOString(),
    });
    n++;
  }
  return n;
}

async function boe(commitmentId: string, query: string) {
  const u = new URL("https://www.boe.es/datosabiertos/api/legislacion-consolidada");
  u.searchParams.set("query", query);
  u.searchParams.set("limit", "8");
  const r = await fetch(u, { headers: { Accept: "application/xml", "User-Agent": "BlueHuman-HRCT/1.0 (+https://bluehuman.org)" } });
  if (!r.ok) return 0;
  const xml = await r.text();
  const blocks = [...xml.matchAll(/<(?:item|norma)\b[^>]*>([\s\S]*?)<\/(?:item|norma)>/gi)].map((m) => m[1]);
  let n = 0;
  for (const b of blocks) {
    const id = tag(b, "id") || tag(b, "identificador");
    const title = tag(b, "titulo") || tag(b, "title");
    if (!id || !title) continue;
    const rel = score(title, query);
    if (rel < 0.62) continue;
    await upsertItem({
      commitment_id: commitmentId,
      kind: "legal_change",
      relation: "supports_progress",
      title,
      url: `https://www.boe.es/buscar/act.php?id=${encodeURIComponent(id)}`,
      publisher: "Agencia Estatal Boletín Oficial del Estado",
      source_domain: "boe.es",
      source_type: "legislation",
      published_at: null,
      summary: "Automatically discovered in BOE consolidated legislation search. Human review is required before treating this as implementation evidence.",
      excerpt: null,
      relevance_score: rel,
      status: "auto",
      is_public: rel >= 0.78,
      last_seen_at: new Date().toISOString(),
    });
    n++;
  }
  return n;
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  let runId: string | null = null;
  let found = 0;
  let processed = 0;
  try {
    const last = await rest("monitoring_runs?select=started_at&status=eq.running&order=started_at.desc&limit=1");
    if (last?.[0] && Date.now() - new Date(last[0].started_at).getTime() < 20 * 60 * 1000) return Response.json({ ok: true, skipped: "run_in_progress" });
    const run = await rest("monitoring_runs", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "running" }) });
    runId = run?.[0]?.id;
    const profiles = await rest("monitoring_profiles?select=id,commitment_id,news_query,implementation_query,boe_query,lookback_days,last_run_at&enabled=eq.true&order=last_run_at.asc.nullsfirst&limit=12");
    for (const p of profiles || []) {
      found += await gdelt(p.commitment_id, p.news_query, "need_context", "supports_need", p.lookback_days || 7);
      if (p.implementation_query) found += await gdelt(p.commitment_id, p.implementation_query, "implementation_candidate", "supports_progress", Math.max(14, p.lookback_days || 7));
      if (p.boe_query) found += await boe(p.commitment_id, p.boe_query);
      await rest(`monitoring_profiles?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify({ last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
      processed++;
    }
    if (runId) await rest(`monitoring_runs?id=eq.${runId}`, { method: "PATCH", body: JSON.stringify({ finished_at: new Date().toISOString(), profiles_processed: processed, items_found: found, items_inserted: found, status: "success" }) });
    return Response.json({ ok: true, processed, found });
  } catch (e) {
    if (runId) try { await rest(`monitoring_runs?id=eq.${runId}`, { method: "PATCH", body: JSON.stringify({ finished_at: new Date().toISOString(), profiles_processed: processed, items_found: found, status: "error", error: String(e).slice(0, 1000) }) }); } catch {}
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
