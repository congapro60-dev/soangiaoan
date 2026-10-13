## 11/10/2026 — Tiếp quản mọi nhiệm vụ còn lại (owner trực tiếp)

Plan: tasks/codex-takeover-plan.md; actual Claude transcript retrieved; class PIN selected. T1–T11 đánh dấu phần code cục bộ; không đồng nghĩa học liệu/GV/máy thật/production đã nghiệm thu.

- [x] Đọc luồng Claude và plan19/r7.26; đối chiếu source, release6done baseline.
- [x] Chốt identity bền: mã/PIN riêng theo lớp, giáo viên quản lý.
- [ ] T1 Sao/revisit đã có; còn đối chiếu đủ19.4 (ba làn/trợ giảng).
- [ ] T2 Partial lesson đã có; còn học liệu/ôn nhiều bài/chương và AI thật.
- [x] T3 Class roster/PIN/cumulative passport.
- [x] T4 GroupA/N150.
- [x] T5 Leagues/classcompetition.
- [x] T6 Story2samples + ownertonegate +12worlds.
- [x] T7 Values.
- [ ] T8 Runtime/newtypes đã có; còn trải nghiệm riêng Jeopardy/các sự kiện.
- [x] T9 Modes9bridge.
- [x] T10 DevicesB/C/Events2.
- [x] T11 GobkitA.
- [ ] T12 Phát hành/nghiệm thu thật: cần owner duyệt cuối; QA cục bộ và tài liệu đang chốt.
## 11/10/2026 — Codex QA release 5+6

- [x] Independent source review, old sessions, own learner privacy, stars/passport boundary.
- [x] Fresh full gate817/817,typecheck/lint/build0.
- [x] Runnable delayed-save and paused-downgrade defects; cross-vendor Gemini confirms AI race.
- [x] HOLD logged in coordination/report/checklist. Separate public Site remains version4.
- [x] Claude repaired blockers; Codex permanent regression tests54/54.
- [x] Final candidate819/819/typecheck/lint/build0; fake-key local/liveowner, localtypedbrief, level375/1280 PASS.
- [x] Publicrelease6done/nativeversion5; finaldeploymentappgdep_6aca83047a508191ba3d9cd88b464e7f/env2; postdeploy/cleanupPASS.

Review: tasks/codex-release6-report.md; scoped CSS/test repairs, separateSite ownerID corrected, fakekey production save/clear verified and removed; release6done.
# Triển khai Mật Mã Đa Giới

## 10/10/2026 — Cockpit T2 hiện hành

- [x] Mốc đứng cổng và đồng hồ hoạt động chính xác từ server, teacher-only, 20 behavioral tests.
- [x] Thẻ HS, ngưỡng 1–60 phút mặc định 5, kết quả bài cá nhân, gợi ý, hỗ trợ; 5 checks + regression dashboard.
- [x] Vùng chạm 2D/3D/chip/cú/+N, bảo vệ postMessage, bàn phím/drag.
- [x] Synthetic 50 HS desktop/TV, review khác hãng, full gate; ghi cockpit peer done.

Kế hoạch: tasks/codex-cockpit-plan.md. Không publish/commit/push.

## 2026-10-08 — rehearsal mẫu hiện hành

- [x] Chọn được bài mẫu hiện hành dù tài khoản đã lưu bài khác; dùng handler tải/guard hiện có; handler tests 16/16.
- [x] Browser GV local hiển thị mẫu v1.1, 9 hoạt động, `act-extension` sau recheck/trước exit; sample chưa lưu nên phòng tạo bị khóa đúng.
- [x] Lưu v1.1.0-draft.2823, tạo Preview 29FDF7, HS QA v1.1 Student join; START mở câu Experience, HS nộp đúng và Cockpit revision tăng.
- [x] Full gate sau Studio fix: 518/518, typecheck/lint/build/diff-check exit 0.
- [ ] Browser GV → Preview room → HS làm bài/hint → nhóm/vai → quay cá nhân; TV/mobile render với bản v1.1 đã lưu.
- [x] TV handshake không ổn định trong IAB; presenter mở form manual. Đã thêm fallback teacher-owned anonymous projection, không dùng token URL/log.
- [x] Fallback TV teacher-owned: `/presenter?session=...` dùng Site auth + owner/cohost check, API trả presenter projection ẩn danh; token vẫn không đưa vào URL.
- [x] Pending submission không phát đúng/sai trước khi teacher đánh giá; preview budget hiện đủ optional và giữ 0; full gate 520/520, typecheck/lint/build/diff-check exit 0.
- [x] Fallback Presenter + media pending guard full test 521/521; typecheck/lint/build/diff-check exit 0.
- [ ] Ghi rõ QA local, mẫu chưa duyệt và phần chưa xác minh production.

## 2026-10-08 — phó bản có đường vào thật

- [x] Truy vết: extension ở practice nhưng đòi mastery sau exit; test cũ seed passport, chưa chứng minh route thật.
- [x] Gói Dãy số v1.1: core 36p, optional 2p sau recheck/trước exit, reserve 2p; giữ nguồn needs_review; hash mới `e445d472…884b74`.
- [x] Eligibility dùng recheck cá nhân đã chấm, không trợ giúp/reveal; mastery cuối tiết giữ 2 minh chứng.
- [x] E2E reducer: START → recheck → phó bản → exit → assessment; không seed minh chứng; group checker/reveal guard thêm.
- [x] Gate: 517/517, typecheck/lint/build/diff-check pass; Antigravity design review khớp contract; không sửa các phiên/room cũ.
- [x] Copy UI phó bản nói đúng điều kiện recheck, không gọi nhầm final mastery; themed UI tests cập nhật.

## 2026-10-08 — hint và rehearsal local

- [x] Tái hiện hint tuyên bố trực tiếp đáp án; Teacher Studio local render công thức.
- [x] Chặn answerKey/nhãn đúng trong lời khẳng định; giữ so sánh, chiến lược, ví dụ tương tự; thêm test 75 pass.
- [x] Kiểm browser upload DOCX → extraction/hash → proposal needs_review → chặn duyệt thiếu xác nhận → Preview room → Cockpit → HS join; không ghi production.
- [x] Gate tập trung 511/511; typecheck/lint/build/diff-check exit 0; Sonnet review đã phản hồi.
- [x] Guard runtime/UI: không cho `NEXT` khi phòng còn `waiting`; giữ hoạt động đầu đến khi GV bấm `START`; hồi quy full 513/513.
- [ ] Chọn backend AI production; local 9Router chưa được đưa vào Site online.

## 2026-10-08 — bảo toàn bản nháp AI

- [x] Đối chiếu ảnh model mới với `/v1/models`: Gemini 3.8 có route; Claude 5.5 chưa có ID đã xác minh.
- [x] Tái hiện mất mã T11.18 trong assembler bằng test đỏ.
- [x] Giữ mã mục tiêu duy nhất được trích nguyên văn; không đoán khi thiếu/mơ hồ; lệch lớp/môn báo lỗi validator.
- [x] Giữ bản nháp đã normalize nếu repair lỗi, mất nội dung hoặc chưa đạt validator; nguồn thay đổi vẫn fail-closed.
- [x] Canary Antigravity thật: Low 65,5s/2 calls/structural valid; Medium 80,3s/2 calls giữ bản đầu vì sửa ngoài phạm vi. Rà soát hint phát hiện lộ đáp án; chưa đạt sư phạm.
- [x] Sonnet Antigravity đọc code, recheck APPROVE; 508/508 tests, typecheck/lint/diff-check exit 0.
- [x] Full tests 508/508; typecheck/lint/build/diff-check exit 0; giới hạn sư phạm và các gate sản phẩm trong `generation-canary-learning-review.md`.

## 2026-10-08 — tải nguồn gốc và xác minh model

- [x] Xác minh ảnh Antigravity và danh sách route 9Router đang chạy.
- [x] Tái hiện lỗi download trả JSON; sửa owner-scoped R2/hash/raw response.
- [x] Kiểm tra bytes hỏng/thiếu, nguồn parse failed, Unicode/RFC5987 và Content-Length.
- [x] Full suite 466/466; typecheck/lint/build/diff-check exit 0; Antigravity Sonnet bounded review APPROVE.
- [ ] Xác định ID Opus/Sonnet 5.5 hợp lệ cho route Antigravity; ID thử trả upstream 404.
- [ ] Teacher Studio SIWC E2E, OCR, classroom rehearsal/mobile/TV và production QA.

## P5 — đề xuất tổ chức tiết học

- [x] Deterministic source proposal contract: subject/grade/topic signals, map/rule/participation, 40-minute arc, uncertainties, source hash and `needs_review` guard.
- [x] Owner-scoped `GET /api/lessons/proposal?sourceId=...` and Teacher Studio preview button/panel.
- [x] Markdown/text local proposal preview; DOCX/PDF ready-source proposal route.
- [x] Proposal route/pure tests; full suite now 472/472, typecheck/lint/build/diff-check pass.
- [ ] AI generation transport: public provider/endpoint decision, D1 generation state, bounded response/citation validator, UI apply-to-editor.

Phần bên dưới là checklist lịch sử; không dùng làm bằng chứng trạng thái hiện tại. Chưa commit/push/deploy.

- [x] Mở nguồn đúng V7 và xác nhận checkout sạch.
- [x] Truy vết engine, API, D1, campaign, community và media hiện có.
- [x] Nhận plan read-only qua OpenCode CLI.
- [x] Cài dependencies pnpm từ lockfile, không đổi lockfile.
- [ ] Hoàn chỉnh phạm vi/contract và independent plan review.
- [x] Phase 1 branding/cốt truyện 12 map, generated visuals, media/accessibility contracts và runtime feedback đã triển khai; browser walkthrough/cross-review còn pending.
- [x] Phase 3 pure contracts: modes, recovery, room events và Ngũ Ấn arena; focused tests đã thêm.
- [ ] Recovery đề khó và đồng bộ/idempotency/events ở route/API production.
- [ ] Luật gameplay các chế độ, arena cổ trang và mini games ở route/API production.
- [ ] Tài khoản chủ hệ thống, host invite, quản lý từng phòng và audit.
- [ ] Teacher panels/reports/CSV theo các mode.
- [x] Phase 0 baseline: regression tests, build, typecheck và lint đã chạy; còn 335 lint warnings baseline, không có errors.
- [ ] Independent cross-review và sửa phát hiện.
- [ ] Publish đúng Site và nghiệm thu toàn bộ docs/mat-ma-da-gioi-scope.md.

## Trạng thái

Phase 1 cycle-1 repair và Phase 3 pure gameplay contracts đã được triển khai trong worktree, chưa commit/push. Phase 3 có `lib/game-modes.js`, `lib/recovery.js`, `lib/room-events.js`, `lib/arena.js` và test tập trung; chưa wire route/API/auth/host production. Các mode V7/scoring/regatta và dữ liệu hiện có không bị đổi. Chưa chạy gate cuối phiên: npm test/typecheck/build/lint, browser walkthrough và independent post-diff review vẫn pending.
- [x] AI-result normalization contract: source-bound citation coverage, candidate allowlist, hash/status/mastery overwrite, stream/byte limits, existing package validator, needs_review only.
- [x] POST /api/lessons/proposal validation route and adversarial pure tests.
- [ ] Connect a real AI provider after public endpoint/provider is explicitly chosen; add D1 job state and polling for long generation.
- [x] D1 generation job state, owner/idempotency, source snapshot guard, timeout/interrupted fail-closed, generic provider adapter, capabilities/start/run/poll route and Teacher Studio poll/apply controls.






## 12/10 — kết quả tiếp quản cuối
- [x] Code T1–T11, full1047/1047/typecheck/build0, lint0errors392warnings; CUA375/1280 scopedflow verified.
- [x] Workercore279 + earlier150HS3228HTTP + migrationrollback + Gobkitperf + reviewadjudication.
- [x] Hướng dẫn GV, report/source manifest/source-reviewarchive.
- [ ] Owner duyệt phát hành theo plan1040; nativebackup/sourceworkflow/deploy/postdeploy phải chạy sau duyệt.
- [ ] QA physicaldevices/realAIprovider/GVreviewmathsources; fullToán10–12library không đủnguồn.



12/10 scope correction: đánh dấuT1–T11trước chỉlátcode, khôngfullplan19. CònA10exam/cộnggiờriêng/chữto, trợgiảngđồngý,reviews/fullcontent/multi-lessonrevision/eventUX/3lanes. Audit: tasks/codex-plan19-scope-audit-20261012.md. SmartPlanreadonlycónguồnToánhiệnhành;khôngcoiPPCTobjectivesblankthànhYCCĐ.

## 12/10 — tiếp tục sau hotfix Gemini

- [x] Gemini-only native version6 đã phát hành theo duyệt; UI kết nối thành công, khóa giữ nguyên.
- [x] R1–R5 local1118/1118, typecheck/lint/build0; Gemini scopedR5 PASS; 152tệp manifest khớp.
- [x] Native219HTTP và migration0017–0020 trên backupcopy PASS; CUA tutorconsent/Jeopardy bản trướcR5.
- [x] Sửa gợi ý Dãy số lộ30/66; contentHash/catalogue cập nhật, RED/GREEN projection thật.
- [ ] Sức chứa150 kết hợp:900history vượt1.5MiB. Giữ HOLD, không phát hành từ bằng chứng tải cũ.
- [ ] Buzzer/duel đúng mô tả, CUA R5/lanes bản mới, AI fullgeneration, teacherMath/year/physicaldevice acceptance.
- [ ] Broad release chỉ sau gate cụ thể và owner duyệt riêng; hotfix approval không áp dụng R1–R5.

## 12/10 — R6 kỹ thuật đã kiểm

- [x] Nén stdlib không mất3extras; dedupmetadata bản chấm đãđánhgiá; pendinggiữnguyên; rollbackc370PASS.
- [x] Buzzer30giây logic +two-pane sharedduel +ReactuseIdcontrolidentity; CUA375/desktopPASS,reviewchéoPASS.
- [x] Gate1138/1138/typecheck/lint/build0;161tệpmanifest khớp;393lintwarningscũ.
- [x] Hashcuốie403e74:307HTTPPASS;stress453HTTPPASS sau freshcopyretrytransportHOLDriêng.900audit/600receipt/1650subgiữ nguyên;peak1,528,675<1,572,864.
- [x] Gemini thậtnguồn→consent→nháp→validator; needs_review/chặn2lỗisốliệunguồn;khôngtựlưu/duyệt. Evidencecodex-r6-ai-live-evidence.json.
- [ ] GV đối soát nguồn/đápán/niênkhóa vàphầnAIcitation; QAthiếtbị/lớpthật; broadreleaseownerduyệtriêng.

Checklist hiện hành nằm trong `plan-hoan-thien-game-va-day-hoc.md` mụcR6; các checkboxT1–T11/historicalởtrên không thay trạngtháihiện tại.

## 12/10 — R7 trang vào / luật phòng
- [x] Landing/briefing9rules/canonicalmap/shared; lessonhex0/1REDGREEN;375overflowCSSfix.
- [x]1154PASS/typecheck/lint/build0;172sourcehashes;GeminiCSS+alphabetPASS;CUA375/desktop/liveGVrulechange.
- [x] Math5draftfixes,59checks/8packages/80quotes;noautomaticapproval.
- [ ] F03timebox/GVchấm150HS;2citationGemini;ownerreview/year/physicaldevices/3Dvisual;R1–R7releaseapproval.
Authoritative checkbox details: plan-hoan-thien-game-va-day-hoc.md finalR7checkpoint. No productionrelease thisturn.

## R8 checkpoint
- [x] Read-only savedAI restore owner/exactsnapshot +UIcache/race;numericquote-onlyrepair+additionguard.
- [x]1171PASS/typecheck/lint/build0;175manifest;Gemini reviewPASS;finalWorker33c9 native219/CUArestore0external.
- [x]F03timebox/manualgradingaudit withtaskIDs/timeassumptions.
- [ ] Owner scopeMust/full choice;reviewpilot38;fullproductionGemini2citationrepair/humanmath/year/device/3D/releaseapproval.
Report tasks/codex-r8-report.md;authoritative sharedcheckboxplanfinalR8.

## R9 owner-approved Must scope complete local
- [x]8newMust-onlydrafts beside8fulloriginal;exactsourceMust/quotes/hash;2independentevidence/3lanes/budget40.
- [x]1172PASS/typecheck/lint/build0;183manifest;Gemini8math/cataloguePASS;native219/CUAfinalc3b1250d0external.
- [x]Reports/HANDOFF/sharedcheckboxupdated.
- [ ] Broadreleaseownerapproval;historicalGemini2citationfullcandidate;GVformat/math/year/timebox;realdevices/classroom/3Dvisual.
Report tasks/codex-r9-report.md;authoritative sharedplanfinalR9.

## Published R1–R9 —12/10
- [x]Ownerapproved/nativeversion7succeeded/sourcec8064b4/Workerc3b1250d.
- [x]Exact307+453HTTP150/migrationrollback/productionlanding16drafts/sourceAIrestore/dataretention/errorlogsPASS.
- [x]Sharedchecklist/HANDOFF/release-report/evidenceupdated.
- [ ]2historicAIcitation/multisourceAIQA/GVmathyearformat/timebox150/realdevices3Dvisual.

## R10 pilot local —13/10 VN
- [x]3cards/fragments/cosmeticreward/GVwindow/attention/waitmask implemented.
- [x]1191fulltests/typecheck/lint/build/review/189manifest/native95/rollback/307+453HTTP150combinedPASS.
- [x]CUAread3/claim1/3/pausefocus/Escapeblock/draft23resume/375widthPASS;report/HANDOFF/sharedcheckboxupdated.
- [x]CUAremaining complete13/10; tab30gone, blockerresolved. Evidence/report tasks/codex-r10-report.md.
- [ ]ScopedR10release afterCUA andownerapproval19.9;productionversion7unchanged.

## R10 final local pilot —13/10 VN
- [x]Previousnativeconfirmblockerresolved(tab30gone);CUAremaining10checksPASS.
- [x]189sourcehashsame/finalWorkerf4dc4dbf;report/HANDOFF/sharedcheckboxupdated;previewtab36reward3/3explicitseeded.
- [ ]OwnerR10publicationapproval19.9;humanclass/GVsource/year/realdevices3D/oldAIcitationsseparate.


## R11 Math typesetting —13/10 VN
- [x]Ownerđồngloạtformatonlyaudit/fix3cards+richUI+5packages46fields/nativeoptionsfullMathTextreference+CSSnooperatorbreak.
- [x]1203tests/typecheck/lint/build0;192manifest/548fcf6e/native95/CUA375desktopstandardnotation/FlashreviewPASS.
- [x]Report/evidence/HANDOFF/lessons/sharedcheckboxupdated;previewtab37.
- [ ]R10+R11publicationowner19.9;realpedagogical/source/year/devices/3D/historicAIgate separate.

## R12 reading and teacher setup —13/10 VN
- [x]RemoveHSquestions/adminnotes;3readingcards/historyverified/READfragment/MathText.
- [x]Autopresetbeforelaunch/buttonwholelesson/manualcollapsed/strictservercreatepersist/noGETreset/cockpitexplicitApply.
- [x]1213tests/typecheck/lint/build/196manifest/911bfd3e/native109/caprollback/CUAreading375+teacheractualcreatedconfigreload.
- [x]MainFlashreviewPASS;reports/sharedHandoff/lessonsupdated. Secondaryreviewattemptsunavailableexplicit.
- [ ]Ownerpublication19.9;realclass/humanmathsourceyear/timeboxdevices3D/oldAIcitationsseparate.

## R13 — hoàn tất local
- [x] Map một CTA/menu; từng câu/thẻ popup; Next/Back giữ nháp; 2D/3D chung control HTML.
- [x] 1222 tests +39UI+52map; build/typecheck; lint0/392;201manifest;native109/hash;Gemini core/map;CUA cuối375/focus/cổng.
- [x] Report/evidence/plan chung/HANDOFF/lessons cập nhật.
- [ ] Owner duyệt sửa học liệu 12/25 hàng ngoài UI.
- [ ] Owner duyệt phát hành R10–R13 theo19.9; QA lớp thật/citation/year/3Dvisual riêng.
