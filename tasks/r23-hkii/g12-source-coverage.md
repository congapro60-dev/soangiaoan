# G12 Discover HKII: source and authoring coverage

Current authority: `tasks/r23-hkii/ppct-hkii.json`, extracted from `PPCT THCS-THPT 26-27.xlsx`. Grade 12 primary scope starts at source row 183, week 19, period 138. It ends at rows 402-403, week 35, periods 302-303. Periods 148-157 do not exist as numbered teaching rows in this source. No lessons are invented for the gap. No final-exam feedback row exists; later electives and revision remain outside this delivery.

| Source kind | Period rows | Output |
| --- | ---: | --- |
| Core | 39 | 39 teaching drafts, exact detail mapping |
| Review | 69 | 69 teaching drafts, chapter or explicit topic mapping |
| Assessment feedback | 5 | 5 teaching drafts using clearly labeled illustrative errors |
| Elective | 39 | 39 cumulative games, 39 distinct concept pairs |
| Assessment | 4 | 2 draft examinations, 80 minutes each |
| Total | 156 | 152 lesson packages plus 2 exam sets |

## Content fidelity

- P140-176 follows conditional sample spaces, tables, reversing conditions, complements, multiplication, total probability and Bayes. Repeated practice periods change the particular task and focus; they do not rename a generic chapter exercise.
- P143-169 covers normal vectors, cross products, two direction vectors, a point with normal, a point with two directions, three-point planes, perpendicular/parallel planes and point-plane distance. P162 explicitly contains both construction methods named in the source.
- P177-194 covers symmetric/parametric line representations, two-point construction, perpendicular directions, all relative positions, line-plane intersection, practical movement and the three angle formulas. The source starts the line sequence at “Tiết 2”; the package reminds learners of parameter notation without creating a missing period.
- P195-202 covers center/radius extraction, center-plus-point, diameter and tangent-plane construction of spheres. These are author-selected cases within the source's specific sphere-construction and practice periods.
- P183-241 reviews the appropriate probability/coordinate chapters and midterm scope. P244-246 gives illustrative feedback; no claim about actual student errors or grades is made.
- P250-256 explicitly revisits Grade 11 sequences, arithmetic/geometric progressions, limits, exponentials/logarithms, inequalities, point-plane distance and line-plane angles. The Grade 11 review is cited to these current Grade 12 PPCT rows, not to invented earlier Grade 12 core lessons.
- P260-276 supplies successive focused survey-review blocks. P280-290 follows the explicit function-survey and integral review titles. P291-301 rotates end-of-term review content; the two source exam rows map only to the final exam set.

## Cumulative electives

Each game selects two distinct concepts, at least one from HKI; every selected source week is strictly earlier than the game week. HKII concepts enter the bank only after their source core week. Grade 11 review-only introductions remain in the authored bank but are not silently added as core prerequisite rows. `cumulativeScope` records eligible concepts, selected concepts, eligible exact source IDs and the latest selected source week. `coverage.lessonScope` links every selected concept to its first exact PPCT detail.

Games use the existing lesson schema: an individual opening, teacher explanation with worked examples, paired practice, individual recheck, three differentiated lanes, optional extension after recheck, independent exit and reserve. Game points do not substitute for individual mastery evidence. H1-H4 support guides method without publishing the target answer in hint text. Teacher solutions remain in teacher-facing fields/artifacts.

## Source limitations and approval

The six supplied plans are older học phần I/II plans. They are not the complete HKII 2026-2027 objectives. The live Grade 12 Unit II text was checked against exact available objective excerpts; it repeats several earlier objectives and does not supply official LO codes or official Must/Should/Could levels. Only matching HKI objectives use those exact references. New probability, coordinate geometry and explicitly scheduled Grade 11 review objectives are author-derived from PPCT. All objective codes are internal `r23-*`, all packages remain `draft`, all source references require teacher review.

## Verification

`node tasks/r23-hkii/g12-review-check.mjs` rebuilds only this grade's owned artifacts. It checks exact 156-row coverage, 152 schema-valid hashes, 40-minute budgets, per-objective independent recheck/exit, three real branches, H1-H4, extension ordering, 39 distinct prior-week game pairs, two 10-point/80-minute exam sets and exact rational MC choices. It also runs 120 seeds in two stages for 83 concepts: 19,920 cases, including 12,120 numeric comparisons against separate mathematical oracles. All emitted math is rendered with strict KaTeX.

The JSON report records current counts and results. These checks do not establish teacher approval, classroom feasibility in a specific cohort, browser behavior, deployment or production operation. The author did not modify shared runtime/HKI files or run the full suite/build.
