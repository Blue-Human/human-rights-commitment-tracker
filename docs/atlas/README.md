# Human Rights Atlas (`/atlas`)

Section of the HRCI site that connects human-rights instruments, their articles, the States' participation (signature, ratification, accession, succession, denunciation, reservations, declarations, objections), the bodies that supervise them and the protection procedures, all read from official sources. See also [sources](sources.md) and [coverage](coverage.md).

## Structure of the space

The Atlas is a space of its own inside the site (`/atlas`; the old `/rights` addresses redirect permanently). It carries the site's identity, with no mark or name of its own. Its frame (`AtlasShell`) adds, under the site header, the navigation of the Atlas (home, four areas, search, and the area's pages beneath) and, above the site footer, an index of the Atlas. The areas and their pages are declared once in `src/lib/atlas/sections.ts`, which the bar, the second row of tabs, the footer map and the home page read:

| Area | Pages |
|---|---|
| Derechos | `/atlas/topics` and each right |
| Instrumentos | `/atlas/instruments` (library, instrument, article, other language), `/atlas/timeline` |
| Países | `/atlas/countries` (and each State), `/atlas/ratifications`, `/atlas/compare` |
| Protección | `/atlas/mechanisms` (with the guide form), `/atlas/mechanisms/guide`, `/atlas/bodies`, `/atlas/case-law` |
| Sobre el Atlas (footer) | `/atlas/sources`, `/atlas/annotations`, `/atlas/search` |

The home page is built like the site's home (headline, search and figures beside a chart of the parties to the nine core UN treaties), followed by the four areas, the rights as an index, the States by number of core UN treaties consented to (a tile grid by M49 region, not a map), Spain in focus and the first step of the guide. Every figure is computed from `data/atlas` (and the tracker's recommendation count); nothing is entered by hand. The short names of the nine treaties (`CoreTreaties.tsx`) are editorial labels; the official title is always linked.

## Principles

- Only official sources. Every value carries its source (URL, retrieval date, SHA-256 of the document).
- Nothing is inferred. A relation between documents exists only with an explicit basis: the official heading of an article, the official title of a general comment that names the article, HUDOC's own violation / non-violation metadata. Procedure requirements are quotations of the provision, never paraphrases; a curated reference that does not contain its control phrase fails the build.
- Four categories never mixed in the UI: official legal text, institutional interpretation, decisions, official procedural information; Blue Human annotations are a fifth, separate category.
- A text is shown in the reader only if it passes every integrity check (`scripts/atlas/texts.py::check`): no duplicates, consecutive numbering, the article count the ratification instrument states, every article with text, annexes with text, no all-caps transcriptions, no OCR errors, reaches the final clauses, no article ending mid-sentence, articles well delimited, readable encoding. Documented exceptions (source prints an article without a full stop) are listed in `src_texts.UNPUNCTUATED` and shown with their reason.
- Register categories are the depositary's own (UNTC codes a/d/A/AA/c; OAS RA/AD/AC; AU "ratification/accession"). "No action recorded" is never presented as "pending signature". Being party to a treaty is never taken as acceptance of its optional procedures.

## Architecture

```
scripts/atlas/        ingestion pipeline (Python 3, requirements.txt)
  common.py           fetch with cache (.cache/atlas), politeness delay, SHA-256, fetch log; refuses challenge pages
  catalog.py          what is covered and where it is looked up (ids and queries only, no legal facts)
  src_un.py           OHCHR dashboard (discovery), UN Treaty Collection register, OHCHR treaty body database
  src_boe.py          BOE: legislation search, consolidated-text API (blocks with versions), gazette XML
  src_oas.py          OAS Department of International Law: texts, signatures and declarations; IACHR basic documents
  src_au.py           African Union treaty pages and status lists
  src_texts.py        text sources per instrument and reading strategies (BOE, HTML, PDF)
  texts.py            structurer (parts, chapters, articles, paragraphs, annexes) and integrity checks
  src_docs.py         rules of procedure and resolutions (documents.un.org, IACHR)
  src_caselaw.py      general comments, treaty-body decisions on Spain, HUDOC judgments
  src_bodies.py       compositions (ECtHR, IACHR, ACHPR), African Court art. 34(6) declarations, OAS art. 62
  curated.py          bodies, procedures and rights as references + control phrases (no legal text)
  quotes.py           resolves references into word-for-word quotations, failing on mismatch
  build.py            orchestrator; assemble.py / assemble_extra.py write data/atlas; sources.py writes the inventory
data/atlas/           published data (versioned in git)
  instruments.json  texts/<id>.<lang>.json  participation/<id>.json  matrix.json  countries.json
  acceptance.json  bodies.json  procedures.json  procedure-status.json  interpretations.json  decisions.json
  rights.json  documents/  sources.json  fetches.json  report.json  pending-changes.json
src/lib/atlas/        types, server-only loaders (data.ts), labels, relations, annotations, search index
src/components/atlas/ shell, reader, quotes, citation tools, library, search, checklist
src/app/atlas/       pages; src/app/api/atlas/search; src/app/admin/atlas (annotations)
```

The site reads `data/atlas` with `fs` (copied into the functions by `outputFileTracingIncludes`). Instrument, country, body, procedure and right pages are static; article pages are rendered on first request and cached; compare, ratifications, guide, case law, timeline and search read the query string.

## Data model (equivalences)

| Requested entity | Where |
|---|---|
| instruments, instrument_versions | `instruments.json`; versions per article in `texts/*.json` (`history`, from the BOE consolidated text) |
| instrument_sections, articles, article_paragraphs | `texts/*.json` → `nodes` (headings, articles, paragraphs with stable ids `art-6-p2`) |
| countries | `countries.json` (UN M49 names, ISO codes) |
| treaty_actions, reservations, declarations | `participation/*.json` (consent with type/code, signature, brackets, OHCHR entry into force and denunciation; statements with the depositary's own labels, objections, competence declarations, notifications, notes); `matrix.json` (compact) |
| institutions, institution_members, institution_mandates | `bodies.json` (legal basis, composition and term quotations, members with terms and date) |
| mechanisms, procedures, procedure_requirements, procedure_steps | `procedures.json` (basis, who, against, requirements, deadlines, interim measures, steps, follow-up, official channel) and `procedure-status.json` (per State) |
| official_documents, decisions, decision_article_relations | `documents/`, `decisions.json` (`articles` = explicit relations only) |
| institutional_interpretations | `interpretations.json` |
| rights | `rights.json` |
| editorial_annotations, annotation_versions | Supabase `atlas_annotations`, `atlas_annotation_versions` (private), view `atlas_public_annotations` |
| official_sources, source_fetches, verification_records, import_jobs | `sources.json`, `fetches.json`, `texts/*.quality`, `report.json` |
| audit_logs | git history of `data/atlas` + `atlas_annotation_versions` |

Identifiers are stable slugs (`un-iccpr`, `coe-echr-p16`), never titles.

## Integration with HRCI

The Atlas does not duplicate the tracker. Spain's country page links to the UPR recommendations followed by HRCI; each right page lists the UPR recommendations whose official text contains the right's expressions (a literal text search, labelled as such); HRCI's assessments stay in the tracker. Header navigation ("Atlas"), site search and the `/admin` panel are shared.

## Search

`/api/atlas/search` builds one in-memory index (instruments, all articles, countries, bodies, procedures, general comments, decisions, rights, published annotations) and uses the site's matcher (`src/lib/search.ts`: accent-insensitive, every word must match). Filters: type, system, country, body, instrument, date range. The header search also finds Atlas instruments, rights, bodies, procedures and countries.

## Annotations: permissions and publication

Migration `supabase/migrations/20261109_atlas_annotations.sql` (applied to production on 2026-11-09). Tables with RLS and no policy for `anon`/`authenticated`; the admin panel (`/admin/atlas`, single admin account) writes with the service role. Triggers enforce the workflow draft → in_review → approved → published → archived, require a named reviewer to approve and at least one source to publish, send an edited approved/published note back to draft, bump the version and copy every state into `atlas_annotation_versions`. Visitors read `atlas_public_annotations` (published only, no review metadata). Tests in `tests/atlas.test.mjs` check that anonymous users cannot read the tables or write.

## Maintenance

```bash
pip install -r scripts/atlas/requirements.txt
python3 scripts/atlas/build.py            # uses the cache
python3 scripts/atlas/build.py --refresh  # reads every source again
node --test tests/atlas.test.mjs          # integrity checks
```

`.github/workflows/atlas-update.yml` runs every Monday (and on demand): refresh, integrity tests, and a commit of `data/atlas` if anything changed. A source that does not answer keeps the previous data and is reported in `report.json` and `/atlas/sources`. A changed provision is not published: when the official document itself changes (different SHA-256), the changed articles are recorded in `pending-changes.json` and the previous text stays (`build.text_file`); to accept it, review the change, set `"accepted": true` on the entry and run the build. A new reading of the same document after a change to the structurer is a code change and is reviewed in the git diff of `data/atlas/texts`.

To add an instrument: add it to `catalog.py` (and its text source to `src_texts.py`), run the build, check its integrity report. To add a procedure or a body: add references with control phrases to `curated.py`; the build fails if a phrase is not in the quoted provision.

## Known limits

See [coverage](coverage.md). In short: www.ohchr.org, coe.int (Treaty Office), corteidh.or.cr and normlex.ilo.org refuse automated access (Cloudflare); echr.coe.int and HUDOC started refusing it during the first run, so ECtHR judgments are not loaded yet and the Court's composition is the reading of 2026-11-09. Council of Europe participation is shown only for Spain (BOE). UN treaty-body memberships are not loaded. The Spanish texts of ICERD, CAT, CMW and the Genocide Convention are only available as defective scans and are not shown. The guide never assesses admissibility: it reports what the registers record and lists the requirements to be checked.
