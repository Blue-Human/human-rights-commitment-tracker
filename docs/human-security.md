# Human security dimensions

Each recommendation of A/HRC/60/8 is classified by the dimensions of human security it affects. The home page (`A qué seguridad afectan las recomendaciones`), the record of each recommendation, the list filter and the goal-by-dimension matrix of `/ods` are all counts over this classification.

## Sources

| What | Source | Where it lives |
| --- | --- | --- |
| Which dimensions each recommendation affects, which one is primary and why | HRCT's own classification, made from the official text of each recommendation | `data/human-security/hrct-review-spain-upr4.json` → table `commitment_human_security` → view `hrct_public_human_security` |
| The seven dimensions (economic, food, health, environmental, personal, community, political) | UNDP, *Human Development Report 1994*, chapter 2 | table `human_security_dimensions` |
| Technological security | Added by Blue Human (migration `20261010_technological_security.sql`) | table `human_security_dimensions` |

## Why the first assignment was replaced

The first assignment (migrations `20261008_upr4_full_catalogue.sql` and `20261010_technological_security.sql`) gave 954 links to the 324 recommendations, almost three each. The owner asked on 2026-10-06 for a stricter classification, one that cannot be called into question, and a reading of the 324 records confirmed the problem:

- Dimensions were assigned for effects a measure might come to have, not for what the text asks. Every recommendation on trafficking in persons carried four dimensions (personal, community, economic and political); every one on gender-based violence carried health and political security besides personal security.
- Political security worked as a catch-all (202 recommendations, 62 %), since any recommendation concerns human rights.
- Community security followed the group named and not the threat (222 recommendations, 68.5 %): housing, universal health coverage, persons with disabilities or unaccompanied children were community security.
- Food security was assigned to 22 recommendations (social security, child poverty, rural women) although no recommendation of this review names food.

Migration `20261013_human_security_review.sql` replaces it with the review: 390 links, one dimension for 239 recommendations, two for 71, three for 3 and none for 11.

| Dimension | Before | After | Primary in |
| --- | --- | --- | --- |
| Economic | 161 | 92 | 83 |
| Food | 22 | 0 | 0 |
| Health | 114 | 29 | 21 |
| Environmental | 12 | 10 | 10 |
| Personal | 197 | 106 | 91 |
| Community | 222 | 69 | 59 |
| Political | 202 | 60 | 36 |
| Technological | 24 | 24 | 13 |

`node scripts/human-security-review.mjs --summary` prints the current figures. The earlier assignment is kept as a reference in `data/human-security/previous-assignment-spain-upr4.json`; `node scripts/human-security-review.mjs --diff` lists the 310 recommendations whose dimensions change.

## Classification criteria

1. **The threat, not the vocabulary and not the group.** A dimension is assigned when the measure requested responds directly to a threat that belongs to that dimension. A recommendation about migrants is community security when it deals with discrimination or xenophobia, not because it names them.
2. **Direct effects only.** No dimension is assigned for consequences the text does not name.
3. **The fewest dimensions.** One is the rule. A second is added only when the text names a distinct threat; three only when it names three (50.32, 50.45 and 50.289). The primary dimension is that of the central object of the recommendation; when two are on a par, the more direct threat to life and physical integrity comes first.
4. **Political security is not a catch-all.** It is not added because a recommendation concerns human rights. It is reserved for civil liberties (expression, assembly, association, privacy, participation), guarantees against the action of the State (torture and ill-treatment, use of force, detention, expulsion, asylum procedures), justice, and institutions (the Ombudsman, transparency, transitional justice). It is also the only dimension of the recommendations that ask, in general terms, for the rights of migrants to be respected in migration and asylum policy, which is carried out through border control, detention and expulsion.
5. **Instrumental measures follow their subject.** Ratifying a treaty, adopting a law or a plan, funding a body, training officials, collecting data and giving victims access to justice take the dimension of the threat they deal with. The Observatory on Racism is community security; access to justice for victims of trafficking is personal security.
6. **Nothing forced.** When the text names no concrete threat the recommendation has no dimension and the review file says why (11 recommendations: international cooperation in general terms, gender equality "in all areas", "vulnerable groups"). No dimension is assigned by inference: food security has no recommendations.
7. **Recurring cases are decided once:**
   - Racism, xenophobia, antisemitism, discrimination of ethnic, religious or linguistic minorities, and hate speech: community. Hate crime adds personal (assaults and threats). Racial profiling adds political (a practice of the security forces).
   - A threat the text places on the Internet or in the digital environment adds technological security to the dimension of the threat. Technological security is primary when the object is the digital environment itself (artificial intelligence, children online, platform regulation, digital literacy).
   - Torture and ill-treatment, and excessive use of force: personal, with political (abuse by agents of the State). Incommunicado detention: political, with personal for isolation.
   - Freedom of expression, assembly and association, the Citizen Security Act, surveillance, disinformation, judicial independence, access to justice, transitional justice, the Ombudsman: political.
   - Trafficking in persons: personal. Economic is added only when forced labour is named.
   - Gender-based violence, sexual violence and femicide: personal. Forced marriage and female genital mutilation: personal, with community, since they are imposed on the victim from her family or community (the UNDP report places oppressive traditional practices under community security).
   - Gender equality: economic for employment, pay, rural women and scientific careers; political for decision-making positions; none when no field is named.
   - Poverty, social protection, minimum income, employment, housing and support for families: economic (the UNDP report includes homelessness under economic security).
   - Education has no dimension of its own in the framework. Access, dropout, quality and segregation of pupils with disabilities are economic security (basic education is the first protection against poverty and exclusion from work); community is added when the inequality affects minorities or the Roma, and it is primary for ethnic segregation.
   - Health coverage, sexual and reproductive health, sexuality education, mental health, addiction, care for older persons and rehabilitation: health.
   - Climate change, disaster risk and the right to a healthy environment: environmental.
   - Persons with disabilities: the field named (employment, education and housing are economic; health care and rehabilitation are health).
   - Unaccompanied migrant children: personal (they lack the protection of a family). Age assessment adds political (procedural guarantees).
   - Non-refoulement: personal, with political. Access to asylum and its procedural guarantees, and resettlement: political. Reception conditions and access to basic services: economic. Migrant workers' conditions: economic, with health when health care is named.
   - Treaties: the Migrant Workers Convention is economic; the Genocide Convention, community and personal; the Treaty on the Prohibition of Nuclear Weapons, personal; the Optional Protocol to the ICCPR, political.
   - Unilateral coercive measures: economic (the livelihoods of the population of the country they are applied to).

## Changing the classification

Edit `data/human-security/hrct-review-spain-upr4.json` (the first link of a record is its primary dimension; a record without links carries a `note`), write a new migration with the rows printed by `node scripts/human-security-review.mjs --sql`, following `20261013_human_security_review.sql`, and run `npm test`: it checks that every recommendation is covered, that each link has a valid dimension and a rationale, that there is one primary dimension per classified recommendation, and that the migration publishes exactly the review file.

The classification is informative. It is not part of the assessment of compliance.
