import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  boeDailySummary, boeSearch, fetchFeed, gdelt, googleNews, heuristicIsPublic, isAfter, lastDays, matchBoeEntry,
  matchFeedItem, titleKey, GDELT_MIN_INTERVAL_MS, type BoeEntry, type Candidate, type ConnectorResult, type Feed, type FeedItem,
} from "./lib.ts";
import { classify, DEFAULT_MODEL, type ClassifierConfig, type Verdict } from "./classifier.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Optional. When set, callers must send it in the x-hrct-tracker-secret header.
const TRACKER_SECRET = Deno.env.get("LIVE_TRACKER_SECRET");
// Optional. Without it, candidates are triaged by keyword heuristics only.
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const CLASSIFIER: ClassifierConfig | null = GEMINI_API_KEY
  ? { apiKey: GEMINI_API_KEY, model: Deno.env.get("HRCT_CLASSIFIER_MODEL") || DEFAULT_MODEL }
  : null;
// Optional. A caller presenting it may pass ?force=1 to skip the cooldown (used for backfills).
const ADMIN_SECRET = Deno.env.get("LIVE_TRACKER_ADMIN_SECRET");
const REST = `${SUPABASE_URL}/rest/v1`;
// One refresh cycle per day: a profile or a feed sweep done within the last twelve hours is up to date,
// so repeated calls during the daily batch only pick up what is still pending. Twelve hours, not
// twenty-four, because the scheduler can start a run hours late and the next one must still find work.
const REFRESH_MS = 12 * 60 * 60 * 1000;
// Hidden, unreviewed candidates older than this are deleted so the queue does not pile up.
const RETENTION_DAYS = 45;
const PROFILE_BATCH = 6;
const SWEEP_PARALLEL = 6;
// Stop starting new profiles well before the Edge Function wall-clock limit.
const DEADLINE_MS = 110 * 1000;
const AI_PUBLIC_RELEVANCE = 0.8;

type Profile = {
  id: string; commitment_id: string; news_query: string; implementation_query: string | null;
  boe_query: string | null; lookback_days: number | null; last_run_at: string | null;
};
type Recommendation = {
  id: string; public_id: string; title: string; original_text: string;
  commitment_date: string | null; sources: { publication_date: string | null } | null;
};
// The date from which a legal change can count as following the recommendation.
const since = (r: Recommendation) => r.commitment_date || r.sources?.publication_date || null;
type SourceStat = { requests: number; rate_limited: number; errors: number; candidates: number; skipped?: number; last_error?: string };

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${REST}/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toRow(commitmentId: string, c: Candidate, verdict: Verdict | undefined, classifier: string | null) {
  const now = new Date().toISOString();
  const base = {
    commitment_id: commitmentId, title: c.title, url: c.url, publisher: c.publisher, source_domain: c.source_domain,
    source_type: c.source_type, published_at: c.published_at, summary: c.summary, excerpt: c.excerpt ?? null,
    status: "auto", connector: c.connector, last_seen_at: now,
  };
  if (!verdict) {
    return { ...base, kind: c.kind, relation: c.relation, relevance_score: c.relevance_score, is_public: heuristicIsPublic(c) };
  }
  // The classifier can move an item between monitoring channels, never into evidence.
  let kind = c.kind, relation = c.relation;
  if (verdict.category === "need_context") { kind = c.official ? "statement" : "need_context"; relation = c.official ? "context" : "supports_need"; }
  if (verdict.category === "implementation_candidate") { kind = c.kind === "legal_change" ? "legal_change" : "implementation_candidate"; relation = "supports_progress"; }
  if (verdict.category === "contradiction") { kind = c.kind === "legal_change" ? "legal_change" : "implementation_candidate"; relation = "contradicts_progress"; }
  return {
    ...base, kind, relation, relevance_score: Number(verdict.relevance.toFixed(3)),
    is_public: verdict.category !== "noise" && verdict.relevance >= AI_PUBLIC_RELEVANCE,
    classification: verdict.category, classification_note: verdict.note, classifier, classified_at: now,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  if (TRACKER_SECRET && req.headers.get("x-hrct-tracker-secret") !== TRACKER_SECRET) return new Response("Unauthorized", { status: 401 });

  const force = !!ADMIN_SECRET && req.headers.get("x-hrct-admin-secret") === ADMIN_SECRET && new URL(req.url).searchParams.get("force") === "1";

  const started = Date.now();
  const stats: Record<string, SourceStat> = {};
  const record = (source: string, r: { outcome: ConnectorResult["outcome"]; detail?: string }, candidates: number) => {
    const s = stats[source] ??= { requests: 0, rate_limited: 0, errors: 0, candidates: 0 };
    s.requests++;
    s.candidates += candidates;
    if (r.outcome === "rate_limited") s.rate_limited++;
    if (r.outcome === "error") { s.errors++; s.last_error = r.detail; }
  };

  let runId: string | null = null, found = 0, inserted = 0, processed = 0;
  let lastGdelt = 0, gdeltRefusals = 0;
  const throttledGdelt = async (...args: Parameters<typeof gdelt>) => {
    // GDELT rate-limits by IP and Edge Functions share theirs. Once it has refused twice
    // in a row, stop asking for the rest of this run instead of burning the time budget.
    if (gdeltRefusals >= 2) {
      (stats.gdelt ??= { requests: 0, rate_limited: 0, errors: 0, candidates: 0 }).skipped = (stats.gdelt.skipped ?? 0) + 1;
      return [];
    }
    const wait = lastGdelt + GDELT_MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    const r = await gdelt(...args);
    lastGdelt = Date.now();
    gdeltRefusals = r.outcome === "rate_limited" ? gdeltRefusals + 1 : 0;
    record("gdelt", r, r.candidates.length);
    return r.candidates;
  };

  const news = async (...args: Parameters<typeof googleNews>) => {
    await sleep(800);
    const r = await googleNews(...args);
    record("google_news", r, r.candidates.length);
    return r.candidates;
  };

  // Items a person has reviewed or rejected are never reset: rediscovery only refreshes last_seen_at.
  const store = async (rec: Recommendation, candidates: Candidate[]) => {
    const unique = [...new Map(candidates.map((c) => [c.url, c])).values()];
    found += unique.length;
    if (!unique.length) return;
    const existing: Array<{ id: string; url: string; title: string }> = await rest(`monitoring_items?select=id,url,title&commitment_id=eq.${rec.id}&limit=5000`) || [];
    const known = new Map(existing.map((x) => [x.url, x.id]));
    const knownTitles = new Set(existing.map((x) => titleKey(x.title)));
    const seenIds = unique.map((c) => known.get(c.url)).filter(Boolean);
    if (seenIds.length) {
      await rest(`monitoring_items?id=in.(${seenIds.join(",")})`, { method: "PATCH", body: JSON.stringify({ last_seen_at: new Date().toISOString() }) });
    }
    const fresh = unique.filter((c) => {
      const key = titleKey(c.title);
      if (known.has(c.url) || knownTitles.has(key)) return false;
      knownTitles.add(key);
      return true;
    });
    if (!fresh.length) return;
    const triage = CLASSIFIER ? await classify(CLASSIFIER, rec, fresh) : null;
    const verdicts = triage?.verdicts ?? null;
    if (CLASSIFIER) {
      const s = stats.classifier ??= { requests: 0, rate_limited: 0, errors: 0, candidates: 0 };
      s.requests++;
      if (verdicts) s.candidates += verdicts.size; else { s.errors++; s.last_error = triage?.error; }
    }
    const rows = fresh.map((c, i) => toRow(rec.id, c, verdicts?.get(i), CLASSIFIER?.model ?? null));
    await rest("monitoring_items?on_conflict=commitment_id,url", {
      method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(rows),
    });
    inserted += rows.length;
  };

  try {
    const recent = await rest("monitoring_runs?select=started_at,status&order=started_at.desc&limit=1");
    if (recent?.[0]?.status === "running" && Date.now() - new Date(recent[0].started_at).getTime() < 20 * 60 * 1000) {
      return Response.json({ ok: true, skipped: "run_in_progress", remaining: 0 });
    }

    const profiles: Profile[] = await rest("monitoring_profiles?select=id,commitment_id,news_query,implementation_query,boe_query,lookback_days,last_run_at&enabled=eq.true&order=last_run_at.asc.nullsfirst") || [];
    const cutoff = Date.now() - REFRESH_MS;
    const due = profiles.filter((p) => force || !p.last_run_at || new Date(p.last_run_at).getTime() < cutoff);
    const lastSweep = await rest("monitoring_runs?select=started_at&status=eq.success&source_stats->rss=not.is.null&order=started_at.desc&limit=1");
    const sweepDue = force || !lastSweep?.[0] || new Date(lastSweep[0].started_at).getTime() < cutoff;
    if (!sweepDue && !due.length) return Response.json({ ok: true, skipped: "up_to_date", remaining: 0 });

    const run = await rest("monitoring_runs", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "running" }) });
    runId = run?.[0]?.id;

    const recs: Recommendation[] = profiles.length
      ? await rest(`commitments?select=id,public_id,title,original_text,commitment_date,sources(publication_date)&id=in.(${profiles.map((p) => p.commitment_id).join(",")})`) || []
      : [];
    const recById = new Map(recs.map((r) => [r.id, r]));

    if (sweepDue) {
      await rest(`monitoring_items?status=eq.auto&is_public=eq.false&connector=in.(rss,google_news,gdelt,boe_summary)&discovered_at=lt.${new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString()}`, { method: "DELETE" });

      // Official gazette: every profile is checked against the past week's dispositions.
      const gazette: BoeEntry[] = [];
      for (const day of lastDays(8)) {
        const r = await boeDailySummary(day);
        record("boe_summary", r, r.entries.length);
        gazette.push(...r.entries);
      }

      // Configured RSS/Atom feeds, fetched once per run and checked against every profile.
      const feeds: Feed[] = await rest("monitoring_feeds?select=id,name,url,source_type,spain_focused&enabled=eq.true") || [];
      const feedItems: Array<{ feed: Feed; item: FeedItem }> = [];
      await Promise.all(feeds.map(async (feed) => {
        const r = await fetchFeed(feed);
        record("rss", r, r.items.length);
        for (const item of r.items) feedItems.push({ feed, item });
        await rest(`monitoring_feeds?id=eq.${feed.id}`, {
          method: "PATCH",
          body: JSON.stringify({ last_fetched_at: new Date().toISOString(), last_status: r.outcome === "ok" ? "ok" : (r.detail || r.outcome), last_item_count: r.items.length }),
        });
      }));

      // Stored a few profiles at a time: one by one, the full catalogue does not fit in one call.
      for (let i = 0; i < profiles.length; i += SWEEP_PARALLEL) {
        await Promise.all(profiles.slice(i, i + SWEEP_PARALLEL).map(async (p) => {
          const rec = recById.get(p.commitment_id);
          if (!rec) return;
          const matches: Candidate[] = [];
          for (const { feed, item } of feedItems) {
            const c = matchFeedItem(feed, item, p.news_query, "need_context", "supports_need")
              || (p.implementation_query ? matchFeedItem(feed, item, p.implementation_query, "implementation_candidate", "supports_progress") : null);
            if (c) matches.push(c);
          }
          const query = p.boe_query || p.implementation_query;
          if (query) matches.push(...gazette.map((e) => matchBoeEntry(e, query)).filter((c): c is Candidate => !!c && isAfter(c, since(rec))));
          await store(rec, matches);
        }));
      }
    }

    // News and legislation search: the profiles that have waited longest, a batch per call.
    for (const p of due.slice(0, PROFILE_BATCH)) {
      if (Date.now() - started > DEADLINE_MS) break;
      const rec = recById.get(p.commitment_id);
      if (!rec) continue;
      const days = p.lookback_days || 7;
      const candidates: Candidate[] = [];
      for (const search of [news, throttledGdelt]) {
        candidates.push(...await search(p.news_query, "need_context", "supports_need", days));
        if (p.implementation_query) candidates.push(...await search(p.implementation_query, "implementation_candidate", "supports_progress", Math.max(14, days)));
      }
      if (p.boe_query) {
        const r = await boeSearch(p.boe_query);
        record("boe_search", r, r.candidates.length);
        candidates.push(...r.candidates.filter((c) => isAfter(c, since(rec))));
      }
      await store(rec, candidates);
      const now = new Date().toISOString();
      await rest(`monitoring_profiles?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify({ last_run_at: now, updated_at: now }) });
      processed++;
    }

    if (runId) {
      await rest(`monitoring_runs?id=eq.${runId}`, {
        method: "PATCH",
        body: JSON.stringify({ finished_at: new Date().toISOString(), profiles_processed: processed, items_found: found, items_inserted: inserted, status: "success", source_stats: stats }),
      });
    }
    return Response.json({ ok: true, processed, found, inserted, remaining: Math.max(0, due.length - processed), classifier: CLASSIFIER?.model ?? null, sources: stats });
  } catch (e) {
    if (runId) {
      try {
        await rest(`monitoring_runs?id=eq.${runId}`, {
          method: "PATCH",
          body: JSON.stringify({ finished_at: new Date().toISOString(), profiles_processed: processed, items_found: found, items_inserted: inserted, status: "error", error: String(e).slice(0, 1000), source_stats: stats }),
        });
      } catch { /* the run record is best-effort once the run has already failed */ }
    }
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
