// Mirrors research reviews into the Jira Commitment Review issue of each recommendation.
// Jira stays the human workflow record: this only sets the proposed assessment, comments and
// labels, and moves the issue toward Peer Review. It never moves an issue to Approved.

const BASE = Deno.env.get("JIRA_BASE_URL");
const EMAIL = Deno.env.get("JIRA_EMAIL");
const TOKEN = Deno.env.get("JIRA_API_TOKEN");

// Jira custom field contract (see BH-HRCT context): Proposed Assessment and Confidence options.
const PROPOSED_ASSESSMENT_FIELD = "customfield_10335";
const CONFIDENCE_FIELD = "customfield_10336";
const STATUS_OPTION: Record<string, string> = {
  unable_to_assess: "10112", not_implemented: "10113", limited_progress: "10114",
  substantially_implemented: "10115", implemented: "10116", regressed: "10117",
};
const CONFIDENCE_OPTION: Record<string, string> = { low: "10118", medium: "10119", high: "10120" };

export type JiraUpdate = {
  status?: string;
  confidence?: string;
  addLabels?: string[];
  removeLabels?: string[];
  // Plain paragraphs, then optional links listed under them.
  comment: string[];
  links?: Array<{ title: string; url: string }>;
  // Workflow transitions to apply in order, by name; ones not available from the issue's current status are skipped.
  transitions?: string[];
};
export type JiraResult = { ok: boolean; issue?: string; detail?: string };

async function jira(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}/rest/api/3/${path}`, {
    ...init,
    headers: { Authorization: `Basic ${btoa(`${EMAIL}:${TOKEN}`)}`, "Content-Type": "application/json", Accept: "application/json", ...(init.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`Jira ${r.status} ${(await r.text()).slice(0, 200)}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

function commentBody(paragraphs: string[], links: Array<{ title: string; url: string }> = []) {
  const content: unknown[] = paragraphs.filter(Boolean).map((text) => ({ type: "paragraph", content: [{ type: "text", text }] }));
  if (links.length) {
    content.push({
      type: "bulletList",
      content: links.map((l) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text: l.title, marks: [{ type: "link", attrs: { href: l.url } }] }] }],
      })),
    });
  }
  return { body: { type: "doc", version: 1, content } };
}

export async function recordInJira(issueKey: string | null, update: JiraUpdate): Promise<JiraResult> {
  if (!BASE || !EMAIL || !TOKEN) return { ok: false, detail: "Jira is not configured" };
  if (!issueKey) return { ok: false, detail: "recommendation has no Jira issue" };
  try {
    const fields: Record<string, unknown> = {};
    if (update.status && STATUS_OPTION[update.status]) fields[PROPOSED_ASSESSMENT_FIELD] = { id: STATUS_OPTION[update.status] };
    if (update.confidence && CONFIDENCE_OPTION[update.confidence]) fields[CONFIDENCE_FIELD] = { id: CONFIDENCE_OPTION[update.confidence] };
    const labels = [...(update.addLabels || []).map((l) => ({ add: l })), ...(update.removeLabels || []).map((l) => ({ remove: l }))];
    if (Object.keys(fields).length || labels.length) {
      await jira(`issue/${issueKey}?notifyUsers=false`, { method: "PUT", body: JSON.stringify({ fields, update: labels.length ? { labels } : undefined }) });
    }
    await jira(`issue/${issueKey}/comment`, { method: "POST", body: JSON.stringify(commentBody(update.comment, update.links)) });
    for (const name of update.transitions || []) {
      const available: { transitions: Array<{ id: string; name: string }> } = await jira(`issue/${issueKey}/transitions`);
      const t = available.transitions.find((x) => x.name === name);
      if (t) await jira(`issue/${issueKey}/transitions`, { method: "POST", body: JSON.stringify({ transition: { id: t.id } }) });
    }
    return { ok: true, issue: issueKey };
  } catch (e) {
    return { ok: false, issue: issueKey, detail: String(e).slice(0, 240) };
  }
}
