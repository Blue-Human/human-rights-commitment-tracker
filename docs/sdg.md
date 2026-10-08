# Sustainable Development Goals (ODS)

The `/ods` pages and the "ODS y metas" section of each recommendation relate the recommendations of A/HRC/60/8 to the goals and targets of the 2030 Agenda.

## Sources

| What | Source | Where it lives |
| --- | --- | --- |
| Which goals and targets each recommendation relates to | HRCT's own classification, made from the official text of each recommendation, with a rationale per link | `data/sdg/hrct-review-spain-upr4.json` → table `commitment_sdgs` → view `hrct_public_sdgs` |
| Reference used by the classification | Universal Human Rights Index (UHRI), OHCHR. Full export: `https://uhri.ohchr.org/api/uhri/export-results/export-full-es.json` | `data/sdg/uhri-spain-upr4.json` (snapshot) |
| Goal titles and the text of the 169 targets, in Spanish | General Assembly resolution A/RES/70/1 | `src/lib/sdg.ts` (`title`, `targets`), verbatim |
| Goal names, colours, icons and colour wheel | UN communications material for the SDGs, Spanish version: `https://www.un.org/sustainabledevelopment/es/news/communications-material/` | `src/lib/sdg.ts` (`name`, `color`), `public/images/ods/` |
| Why each goal matters for human rights | Blue Human | `src/lib/sdg.ts` (`relevance`) |

## Why HRCT does not publish the UHRI tagging as it is

The first version published the UHRI tagging unchanged (migration `20261011_sdg_links.sql`). The owner reviewed it on 2026-10-05 and found it unreliable, and a reading of the 324 records confirmed it:

- It links by keyword in places. Recommendation 50.307, on migrants and victims of human trafficking, was linked to target 15.7 (trafficking in protected species). Rural-women recommendations were linked only to 5.1, and accessibility for persons with disabilities to 9.1.
- It uses few targets and repeats them: 32 targets in all, with every recommendation on unaccompanied children tagged 8.7 (child labour) and 16.2 regardless of content.
- It leaves the precise target unused when there is one: forced marriage and female genital mutilation were tagged 5.2 instead of 5.3, sexual and reproductive health services 5.6 without 3.7, addiction prevention 3.8 instead of 3.5, climate finance 13.2 instead of 13.a.
- 18 recommendations had no goal and 34 links had a goal but no target, including cases with an evident target (asylum procedures, the Ombudsman, development cooperation).

Migration `20261012_sdg_review.sql` replaces it with HRCT's classification. `node scripts/sdg-review.mjs --diff` lists the 237 recommendations whose links differ from the UHRI's.

## Classification criteria

1. **Substance, not vocabulary.** A target is linked when carrying out the recommendation would contribute directly to it. The measure requested decides, not the words used.
2. **The most specific target.** Further targets are added only when the recommendation has distinct components (for example, trafficking of migrant women and their access to justice: 8.7, 5.2, 10.7 and 16.3).
3. **Nothing forced.** When a goal covers the subject but none of its targets states it, the recommendation is linked to the goal as a whole (nuclear disarmament and Goal 16; a recommendation that names Goal 1). When the 2030 Agenda has no target on the subject, the recommendation has no link and the review file says why (unilateral coercive measures; the right to a healthy environment as a matter of cooperation between States).
4. **Recurring cases are decided once:**
   - Racism, xenophobia and hate speech: 10.3. Add 16.b when a law, plan, strategy or the enforcement of legislation is requested; 16.1 for hate crimes and threats; 16.3 for prosecution and victims' access to justice; 16.6 for accountability mechanisms; 4.7 for educational programmes.
   - Racial profiling: 10.3 and 16.b.
   - Torture and ill-treatment: 16.1 and 16.3. Investigation of excessive use of force adds 16.6.
   - Justice, judicial independence and transitional justice: 16.3, with 16.6 for the capacity and independence of institutions.
   - Freedom of expression, assembly and association, privacy and surveillance: 16.10.
   - Trafficking in persons: 8.7. Add 5.2 when women, girls or sexual exploitation are named; 16.2 for children; 10.7 for migrants and borders; 16.3 for access to justice and prosecution; 16.4 for organised crime.
   - Gender-based violence: 5.2. Femicide adds 16.1; the judicial response, 16.3. Forced marriage and female genital mutilation: 5.3. Participation and leadership: 5.5. Rural women: 5.a. Coordination, plans and strategies for equality: 5.c.
   - Sexual and reproductive health: 3.7 and 5.6; comprehensive sexuality education adds 4.7.
   - Poverty: 1.2; social protection, minimum income and child benefits: 1.3; access to basic or social services: 1.4.
   - Education: 4.1 for completion, dropout and free quality schooling; 4.5 for equal access of vulnerable groups; 4.a for facilities and inclusive schools.
   - Disability: 10.2, with 8.5, 4.5, 11.1 or 11.2 for the fields named.
   - Migration and asylum: 10.7. Non-refoulement, access to the asylum procedure and procedural guarantees add 16.3; unaccompanied children add 16.2; migrant workers' conditions are 8.8.
   - Ratification of treaties: the target that matches the subject of the treaty.
   - The Ombudsman: 16.a, whose official indicator is the existence of independent national human rights institutions.
5. Target 17.18 (data) and the other targets addressed to developing countries are not used for domestic measures.

Result of the review of 2026-10-05: 320 of the 324 recommendations are linked to at least one goal, with 506 links, 11 goals and 52 targets; 6 links are to a goal as a whole.

## Changing the classification

Edit `data/sdg/hrct-review-spain-upr4.json` (links and rationale), write a new migration with the rows printed by `node scripts/sdg-review.mjs --sql`, following `20261012_sdg_review.sql`, and run `npm test`: it checks that every target exists and belongs to its goal, that every link has a rationale, and that the migration publishes exactly the review file. `node scripts/import-uhri-sdg.mjs <export-full-es.json>` refreshes the UHRI snapshot used as a reference.

## Use of the UN logo and icons

The 17 icons and the SDG colour wheel are UN materials. The files in `public/images/ods/` are the official versions, unmodified: the icons in Spanish, in their inverse colour version (`S_SDG_Icons_Inverted_Transparent_WEB-NN.png`, the goal's colour on a transparent background) and in their filled version (`S-WEB-Goal-NN.png`, used in the detail panel of `/ods`), and the colour wheel (`SDG-Wheel_PRINT_Transparent.png`, the high-resolution file of the official pack). They are served as they are, without recompression (`unoptimized`), so that they stay sharp. Their use here is informational, which the UN guidelines allow without prior permission. The guidelines (linked from `/ods`) set rules the UI follows:

- Each icon is shown whole (number, name and pictogram), square, in its own colours, with nothing drawn over it, no shadow and no cropping. Use `SdgIcon`; do not rebuild an icon from its parts, recolour it or dim it.
- The inverse version may only be used over white.
- Icons are shown in a row or grid aligned to the left.
- The colour wheel is shown whole, over white, with nothing in its centre and not inside a coloured box.
- The colour wheel and the SDG logo are not placed side by side with the HRCT or Blue Human logo. Doing so would require the text "[entity] supports the Sustainable Development Goals".
- `/ods` states that the content has not been approved by the United Nations, and links to the guidelines and to the UN SDG site.

## Relations shown on `/ods`

All of them are counts over the published links of HRCT's classification: recommendations per goal and per target, Spain's response to the recommendations of a goal, recommendations shared by two goals, and recommendations shared by a goal and a human-security dimension (HRCT's own classification). No figure is estimated.
