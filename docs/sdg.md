# Sustainable Development Goals (ODS)

The `/ods` pages and the "ODS y metas" section of each recommendation relate the recommendations of A/HRC/60/8 to the goals and targets of the 2030 Agenda.

## Sources

| What | Source | Where it lives |
| --- | --- | --- |
| Which goals and targets each recommendation relates to | Universal Human Rights Index (UHRI), OHCHR. Full export: `https://uhri.ohchr.org/api/uhri/export-results/export-full-es.json` | `data/sdg/uhri-spain-upr4.json` (snapshot) → table `commitment_sdgs` → view `hrct_public_sdgs` |
| Goal titles and the text of the 169 targets, in Spanish | General Assembly resolution A/RES/70/1 | `src/lib/sdg.ts` (`title`, `targets`), verbatim |
| Goal names, colours, icons and colour wheel | UN communications material for the SDGs, Spanish version: `https://www.un.org/sustainabledevelopment/es/news/communications-material/` | `src/lib/sdg.ts` (`name`, `color`), `public/images/ods/` |
| Why each goal matters for human rights | Blue Human | `src/lib/sdg.ts` (`relevance`) |

HRCT publishes the UHRI tagging as it is. It does not add, remove or reinterpret links: a recommendation the UHRI links to a goal without a target is shown that way, and one with no goal says so. In the snapshot of 2026-10-05 (tagging published on the UHRI on 2025-12-30), 306 of the 324 recommendations have at least one goal, 297 at least one target, and 12 goals and 32 targets are in use.

## Refreshing the links

1. Download the full UHRI export (about 400 MB) and run `node scripts/import-uhri-sdg.mjs <export-full-es.json>`. It rewrites the snapshot.
2. If the snapshot changed, write a new migration with the rows printed by `node scripts/import-uhri-sdg.mjs --sql`, following `supabase/migrations/20261011_sdg_links.sql`, and delete from `commitment_sdgs` the links that are no longer in the source.
3. `npm test` checks that the snapshot only uses goals and targets that exist, and that the migration publishes exactly the snapshot.

## Use of the UN logo and icons

The 17 icons and the SDG colour wheel are UN materials. The files in `public/images/ods/` are the official versions, unmodified: the icons in Spanish, in their inverse colour version (`S_SDG_Icons_Inverted_Transparent_WEB-NN.png`, the goal's colour on a transparent background) and in their filled version (`S-WEB-Goal-NN.png`, used in the detail panel of `/ods`), and the colour wheel (`SDG-Wheel_PRINT_Transparent.png`, the high-resolution file of the official pack). They are served as they are, without recompression (`unoptimized`), so that they stay sharp. Their use here is informational, which the UN guidelines allow without prior permission. The guidelines (linked from `/ods`) set rules the UI follows:

- Each icon is shown whole (number, name and pictogram), square, in its own colours, with nothing drawn over it, no shadow and no cropping. Use `SdgIcon`; do not rebuild an icon from its parts, recolour it or dim it.
- The inverse version may only be used over white.
- Icons are shown in a row or grid aligned to the left.
- The colour wheel is shown whole, over white, with nothing in its centre and not inside a coloured box.
- The colour wheel and the SDG logo are not placed side by side with the HRCT or Blue Human logo. Doing so would require the text "[entity] supports the Sustainable Development Goals".
- `/ods` states that the content has not been approved by the United Nations, and links to the guidelines and to the UN SDG site.

## Relations shown on `/ods`

All of them are counts over the published links: recommendations per goal and per target, Spain's response to the recommendations of a goal, recommendations shared by two goals, and recommendations shared by a goal and a human-security dimension (HRCT's own classification). No figure is estimated.
