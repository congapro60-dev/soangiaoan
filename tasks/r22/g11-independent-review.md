# R22 G11 independent review, 2026-10-15

Reviewed another author's files read-only before repair authorization. No external model used.

Baseline SHA256:
- scripts/content/build-hki-g11.mjs: 44afb4d595b7659dc9b0b0bbc53b162b3510dace42a507abb7b6df40fa01a1f2
- content/lessons/hki-2026-g11.json: e0994d0d27cd3b04951452673530e5fdca3f7ac2ee68f9deec68faabc38d6180

## Findings before fixes

1. P1, build-hki-g11.mjs:291: multi-digit exponent lacks braces. Period 111 task-5-1 renders `.../x^11` as x to power 1 followed by another 1; the worked solution assumes power 11 and gives x^-6. Reproduced with KaTeX MathML: `<msup><mi>x</mi><mn>1</mn></msup><mn>1</mn>`. Use `x^{11}` for authored variable exponents.
2. P1, build-hki-g11.mjs:75 and :254: period 22 PPCT explicitly covers graphs/properties of both sin and cos, but every task and both mastery checks contain only sine. The objective says sin/cos. Add cosine landmarks/graph/property evidence to the tasks; changing the objective label alone cannot cover PPCT.
3. P2, build-hki-g11.mjs:335 and :346: all 133 packages place an extension task in act-3 before recheck act-4. Student copy offers three branches, but extensionEligibility requires the later independent recheck; SELECT_BRANCH blocks it. The later optional activity exists, so remove the inaccessible early lane and place the authored extension after recheck with a valid 40-minute budget.
4. P2, build-hki-g11.mjs:357: all 32 cumulative games export only eligible concept IDs plus questions for two selected concepts. No material bank or reader of eligibleConceptIds supplies the other eligible content. Example week 18 has 50 eligible IDs but only two selected concepts. Export actual questions, keys/rubrics, worked solutions, source bindings and introduction week per concept; retain the distinction between bank coverage and one-round coverage.

## Verified baseline

- 133/133 packages pass existing validator and content hash; 137/137 PPCT rows map exactly once to 133 lesson packages and four exam rows in two exams.
- 32 elective games contain no future-week concepts in selected or eligible IDs. Source overview codes remain absent; objective IDs are internal r22 IDs. Logarithm cites the unit heading with an explicit missing-overview limitation.
- All 50 base concepts and 50 advanced variants were read. 52,000 sampled generator calls (260 seeds x four depths x 50 concepts) complete without their numeric assertions failing. This is generator execution evidence, not independent proof for every open response.
- Student and presenter projections were checked for all activities of all 133 packages: no answerKey, workedSolution or full supportRationale solution leaked. Answer-bearing supportRationale remains teacher-only in the existing projection.
- Both exams were independently read and solved: ten essay questions each, 80 minutes, 10 points; no incorrect answer found in the 20 questions. Existing plain-text imports parse all ten essays and points. This does not certify an official assessment matrix or actual class readiness.
- Teacher formation actions contain topic-specific explanations and worked examples; open responses require teacher assessment; two distinct individual mastery task IDs exist per objective.

## Additional baseline content limits

- Geometric proof variants often change unused lengths or a ratio without changing the reasoning. Periods 28/29 both use the same MN parallel to base proof; recheck/exit differ by denominator only. These are practice variants, not evidence of semantically distinct experiences for every repeated period.
- Period 110 names nth roots but its core/recheck/exit use only square roots; period 111 names real powers but questions use rational exponents. These gaps should remain visible during teacher review instead of declaring complete independent conceptual coverage.
- Advanced linePlaneProperty at baseline line 271 should explicitly say M is interior to SA: at endpoint A no plane through M can be parallel to AB under the no-common-point definition. The baseline question leaves the endpoint convention implicit.

## Repair authorization and resolution

Root initially authorized the first four findings, then explicitly authorized the nth-root, real-exponent and geometry-endpoint gaps. All seven are repaired in the generator and regenerated output:

- Every authored variable exponent uses braces. Period 111 no longer renders a different expression from its solution.
- Period 22 now asks both sine/cosine landmarks, amplitude, period, sketch and monotonicity; both individual mastery tasks contain both functions. The advanced task compares both graphs.
- Practice has support/core only. Extensions are after recheck, in the optional activity. Budget: 4 + 8 + 10 + 6 + 4 optional + 4 exit + 4 reserve = 40 minutes. Parallel support/core lanes use max-lane accounting.
- `g11-practice-bank.json` contains 50 concepts, four authored question variants each, source citations, solution, key/rubric, introduction period/week and teacher-review status. Every elective points to this bank and its exact eligible question count; a round still selects two concepts.
- Period 110 now measures negative integer powers, odd roots of degree 3/5, fourth roots, general nth-root parity/domain and the absolute-value rule in recheck/exit. H4 examples use different numbers from the question.
- Period 111 now measures rational and irrational exponents and asks for the rational-sequence limit definition of a real power in recheck/exit; finite decimal approximation is explicitly distinguished from an exact irrational exponent.
- Advanced line-plane question explicitly requires M inside SA, different from both endpoints; its solution checks that the two planes are distinct.

Remaining editorial limit: geometric variants may share a proof method with different parameters. They are documented as practice variants, not counted as new curriculum concepts. No known omitted PPCT subtopic from the reviewed findings remains open. All content stays draft and still requires teacher review.

## Verification after repair

Runnable check: `node tasks/r22/g11-review-check.mjs`.

The checker independently reads the exported bank, PPCT and package outputs; verifies exact 137-row coverage, every package hash/schema/40-minute budget, two individual evidence task IDs per objective, extensions after recheck, internal objective codes, all 32 elective banks exactly equal prior-week core concepts, the three repaired PPCT topics, 200 bank questions, bank formula rendering, 1,862 student/presenter projections, and both 10-question / 10-point / 80-minute exam imports. It does not run a full build or certify live classroom behavior.

Final run: PASS, 133 packages, 137 periods, 32 games, 50 bank concepts, 200 bank questions, 1,375 rendered bank formulas, 1,862 privacy projections, two exam imports. Generator regeneration also passed, reporting 739 internal mathematical assertions. Scoped ESLint: zero errors, 28 existing unused-variable warnings in the author generator; the new review check has zero warnings. Scoped `git diff --check` passed.

Final SHA256:
- scripts/content/build-hki-g11.mjs: d1951060182d4b4ba6754bf6b25e8837a14d6171bc3296544cef3ea6af16eeab
- content/lessons/hki-2026-g11.json: 4cd0f21dd938b345905be4c4256013cf25d4f6a52c66e85391dde00d86fe3bf2
- tasks/r22/g11-practice-bank.json: 069405600a1117e5ca5bff7cb29c50144aef67033a7f525b82c34d517eb9cf55
