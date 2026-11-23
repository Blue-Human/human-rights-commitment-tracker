import { getBodies, getCountries, getInstruments, getProcedures, getRights } from "@/lib/atlas/data";
import { bodyPath, countryPath, instrumentPath, instrumentTitle, kindNames, procedurePath, rightPath, systemNames } from "@/lib/atlas/labels";
import { developmentPath, dimensionCodes, dimensionNames, formatDate, getCommitments, getDimensionDescriptions, getRecentMonitoringItems, groupByUrl } from "@/lib/hrct";
import { getIndicatorOverview } from "@/lib/indicators/data";
import { sdgGoals } from "@/lib/sdg";
import type { SearchEntry } from "@/lib/search";

// The same for every visitor: built once and refreshed with the public data.
export const dynamic = "force-static";
export const revalidate = 300;

// What the search of the site header looks through, apart from the pages it already knows
// (`sitePages`). Each source is read on its own: if one fails, the rest can still be found.
export async function GET() {
  const [commitments, descriptions, monitoring, indicators, atlas] = await Promise.all([
    getCommitments().catch(() => []),
    getDimensionDescriptions(),
    getRecentMonitoringItems().catch(() => []),
    getIndicatorOverview().catch(() => null),
    // The Atlas, without its articles (they are searched on its own search page).
    Promise.all([getRights(), getInstruments(), getBodies(), getProcedures(), getCountries()]).catch(() => null),
  ]);
  const numbers = new Map(commitments.map((c) => [c.public_id, c.recommendation_number || c.public_id]));

  const entries: SearchEntry[] = [
    ...commitments.map((c) => ({
      kind: "recommendation" as const,
      title: c.title,
      note: `Recomendación ${c.recommendation_number || c.public_id}`,
      href: `/commitments/${encodeURIComponent(c.public_id)}`,
      text: c.normalized_summary || c.original_text,
    })),
    ...sdgGoals.map((goal) => ({
      kind: "sdg" as const,
      title: `ODS ${goal.number} · ${goal.name}`,
      href: `/ods/${goal.number}`,
      text: `${goal.title}. ${goal.targets.map(([code, text]) => `Meta ${code}: ${text}.`).join(" ")}`,
    })),
    ...dimensionCodes.map((code) => ({
      kind: "dimension" as const,
      title: dimensionNames[code],
      note: "Recomendaciones de esta dimensión",
      href: `/commitments?seguridad=${code}`,
      text: descriptions[code],
    })),
    ...(indicators?.cards ?? []).flatMap((card) => {
      const indicator = card.bundle.indicators.find((i) => i.id === card.indicator_id);
      return indicator ? [{
        kind: "data" as const,
        title: indicator.name,
        note: `Recomendación ${numbers.get(card.public_id) ?? card.public_id.split("-").at(-1)}`,
        href: `/commitments/${encodeURIComponent(card.public_id)}#indicadores`,
        text: indicator.description ?? undefined,
      }] : [];
    }),
    ...groupByUrl(monitoring).map((item) => ({
      kind: "news" as const,
      title: item.title,
      note: [item.publisher, item.published_at && formatDate(item.published_at)].filter(Boolean).join(" · ") || undefined,
      href: developmentPath(item),
    })),
    ...(atlas ? [
      ...atlas[0].map((r) => ({ kind: "right" as const, title: r.name, href: rightPath(r.id), text: r.phrases.join(" · ") })),
      ...atlas[1].map((i) => ({ kind: "instrument" as const, title: instrumentTitle(i), note: `${systemNames[i.system]} · ${kindNames[i.kind]}`, href: instrumentPath(i.id), text: [i.title_en, i.popular_name_es].filter(Boolean).join(" · ") || undefined })),
      ...atlas[2].map((b) => ({ kind: "body" as const, title: b.name_es, note: systemNames[b.system], href: bodyPath(b.id), text: b.name_en })),
      ...atlas[3].map((p) => ({ kind: "procedure" as const, title: p.name_es, note: systemNames[p.system], href: procedurePath(p.id) })),
      ...atlas[4].map((c) => ({ kind: "country" as const, title: c.name_es || c.name_en, note: "Tratados, reservas y procedimientos", href: countryPath(c.iso3), text: c.name_en })),
    ] : []),
  ];
  return Response.json(entries);
}
