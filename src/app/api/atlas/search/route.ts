import { atlasIndex, type AtlasEntry } from "@/lib/atlas/searchIndex";
import { search, type SearchKind } from "@/lib/search";

// Search of the Atlas: every word must be found (accents and case ignored), within the filters.
// Read-only: it takes a query and returns public records.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").slice(0, 200);
  const type = url.searchParams.get("type") as SearchKind | null;
  const system = url.searchParams.get("system");
  const country = (url.searchParams.get("country") || "").toUpperCase();
  const instrument = url.searchParams.get("instrument");
  const body = url.searchParams.get("body");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const { prepared } = await atlasIndex();
  const pool = prepared.filter((item) => {
    const meta = (item.entry as AtlasEntry).meta || {};
    if (type && item.entry.kind !== type) return false;
    if (system && !(meta.system || "").split(" ").includes(system)) return false;
    if (country && !(meta.country || "").split(" ").includes(country)) return false;
    if (instrument && meta.instrument !== instrument) return false;
    if (body && meta.body !== body) return false;
    if (from && (!meta.date || meta.date < from)) return false;
    if (to && (!meta.date || meta.date.slice(0, to.length) > to)) return false;
    return true;
  });
  const groups = search(pool, q, type ? 60 : 8, type || undefined);
  return Response.json({ query: q, groups }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
