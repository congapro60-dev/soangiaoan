# QA chấm trên ảnh, nộp hộ, phản hồi và bài chữa — 14/10/2026

Base `7d7c889`, nhánh `codex/student-submitted-photos`. Người dùng đã duyệt triển khai, commit/push main; không deploy/promote thủ công.

## Bản cuối đã kiểm

- Unit/integration: `npm run test` — 3027/3027, 286 files, exit0; log `%TEMP%/annotated-final3-tests.log`.
- Rules: `npm run test:rules` — 306/306, 9 files, Firestore+Storage, exit0; log `%TEMP%/annotated-final3-rules.log`. Rules final repeat exit0 after all source fixes.
- Lint app/API: `npm run lint`, `npm run lint:api`, `npm run build` — exit0 sau source cuối; log `%TEMP%/annotated-final4-build.log`. Bundle index1545.01kB; cảnh báo chunk lớn và sax/stream đã có, không coi là lỗi TypeScript.
- Native final independent review: 41/41 correction+actor; UI focused39, no blocker. Gemini3.8Flash-low final JSON PASS: backend, grading, correction; UI final2findings rejected with independent source/test evidence in vendor-ui.md. File review trong tasks/annotated-review-vendor-*.md.
- Browser Chrome riêng: component React thật, service fixture, không proxy production; 300 bài/500 lượt. 29 checks,0pageerrors, exit0 tại390/820/1024. Không tràn ngang danh sách, viewer lời chữa, PH upload.
- Cuối cùng sau upload-online guard UI: focused39/39(6files)exit0; full3027 trước2regression cuối (không gọi3029fullpassed). Build/lint4 exit0 sau guard cuối; focused39/39 exit0.
- GV GradeReviewModal+ClarifyPanel ảnh/câu inputs ở390/820/1024 đạt thêm6checks; page2/15 đạt1check,0pageerrors.
- Đã thao tác search/paging20, filters đủ4loại, mở lời chữa KaTeX, phản hồi giữ nháp khi đổi mục, gửi explicit, một form mỗi lượt khi mở ảnh, chọn ảnh chữa/lưu/AI fixture, busy chặn ghi đè nháp, PH same-row retry và scroll tới uploader.
- Ảnh/checks: `C:/Users/ADMIN/.codex/visualizations/2026/10/10/01a123b1-a378-73b1-9aa4-685e5b67efaa/annotated-review-final/`. Harness: `%TEMP%/smartplan-workspace-qa`; runnable check `%TEMP%/qa-annotated-final.cjs`.

## Hành vi đã kiểm

- Màu đúng xanh/một phần vàng/sai đỏ/chưa chắc trung tính nét đứt; điểm tổng và câu, shared QuestionDetail.
- Math golden ảnh4; tiếng Việt ngoài KaTeX, ngắt ý/bước, lời giải TF a–d. Shared cache đúng mã đề/version; GV sửa text giữ lại; source/key edits invalidate.
- GV/HS/PH nộp ảnh/xác nhận bài đóng chưa khóa; khóa chốt transactional chặn evidence cho cả3. Read/grade GV vẫn được. Bài online giữ luồng riêng.
- PIN PH tự đặt+membership recheck; grant bound actor/assignment/purpose/target/type/size/expiry/one-time. Source generation copy vào immutable accepted-homework. Rules deny direct writes+legacy overwrite.
- Feedback HS↔GV<=2000ký tự, exactattempt/câu, drafts, stale reply acknowledgement không nuốt reply mới; khóa không chặn trao đổi.
- Correction lưu separateattempt, explicit AI opt-in; original grade không ghi đổi. Detailedteacher prompt: sửa được gì/why, lỗi bước cụ thể+why+cách hoàn thiện, việc luyện/kiểm tra tiếp.3nhãn chỉ kết luận.
- Expired/malformedreview lease retryable; old verdict hidden after original grade/exam/key/sharedsolutionedit, failedretry không phục hồi stale verdict. AI context union original+clarifyphotos+current sharedsolution; remainingbudget tính sau auth/quota.

## Gemini / giới hạn bằng chứng

- Argon được xác minh qua trang chính thức trong phiên trước; ID `gemini-4-argon`. Router hiện không chạy được: direct keyinvalid, ag404. Không đổi key/router hoặc bật API trả phí.
- Gemini3.8Flash-low đã sinh UI code main HS, deadline; root áp/review/test, PH thiết kế thích nghi theo API thật. Không gọi nguồn code là Argon.
- Browser fixtures/nhận xét/marks chứng minh bố cục và thao tác, KHÔNG chứng minh độ đúng định vị hoặc nội dung AI trên bài HS thật.
- Phiên browser GV/HS thật chưa QA bản mới: plugin browser đã mất; Computer Use thử/retry/reset đều lỗi `Computer Use native pipe is unavailable ... os error 2`. Chrome fallback chỉ dùng fixture an toàn.
- Bài cũ cần GV tạo lời giải chung theo bài/mã đề; không thể có lời giải mới chỉ đổi renderer. Không gọi AI lúc HS mở xem.
- Push main không chứng minh deploy/Rules/productionQA. Rules mới cần phát hành SAU API tương thích; user hiện chỉ cho pushmain, chưa deploy Rules thủ công. Không coi khóa production đã đủ enforcement trước bước Rules.
- Không sửa/chấm/nộp/xóa dữ liệu production trong đợt QA này.

## Chạy lại

```powershell
npm --prefix 'C:\Users\ADMIN\.codex\worktrees\4c87\smart-lesson-plan-ai' run test
npm --prefix 'C:\Users\ADMIN\.codex\worktrees\4c87\smart-lesson-plan-ai' run lint
npm --prefix 'C:\Users\ADMIN\.codex\worktrees\4c87\smart-lesson-plan-ai' run lint:api
npm --prefix 'C:\Users\ADMIN\.codex\worktrees\4c87\smart-lesson-plan-ai' run build
npm --prefix 'C:\Users\ADMIN\.codex\worktrees\4c87\smart-lesson-plan-ai' run test:rules
```

## Git integration

Source `024a5a864c0135993b13903b57067936d9c43a5f` pushed HEAD:main exit0; ls-remote exactSHA. Worktree sạch sau sourcecommit. Pre-push hook chạy bình thường, không bypass. CI/deployment chưa coi đạt nếu chưa có kết quả. Commit tiếp chỉ cập nhật bằng chứng này.

Source024a5a8 GitHub: API Typecheck [38507174194](https://github.com/congapro60-dev/soangiaoan/actions/runs/38507174194) SUCCESS, QualityGate [38507174122](https://github.com/congapro60-dev/soangiaoan/actions/runs/38507174122) SUCCESS. Git Vercel status giaoandewey Deployment completed SUCCESS; second Vercel project stillpending at snapshot. No manualdeploy/promote. Rules and realaccounts/AIquality remain separate pending.

Public production smoke: homepageHTTP200, unauthenticated correctionAttemptsHTTP401. No account access/classroom mutation; not realGV/HS/PHQA.

## Hoàn tất phần production còn lại theo user14/10

User yêu cầu làm nốt những phần chưa làm; quyền Rulesdeploy được cấp trong lượt này. Source vẫn5f1380e, clean trước docs.
- Vercel latest5f1380e: cả giaoandewey và soangiaoan Deploymentcompleted SUCCESS (Git status).
- QualityGate38507498058 SUCCESS; log ghi3029/3029,286files+lint. APITypechecksource024a5a8SUCCESS.
- `firebase deploy --only 'firestore:rules,storage' --project smartplan-ai-14200 --non-interactive` exit0; both rules compiled/released. Log `%TEMP%/annotated-production-rules-20261014.log`.
- Postdeploy smoke homepageHTTP200; correctionAttempts noauthHTTP401; directFirestore nonexistentdocHTTP403 PERMISSION_DENIED. Read-only, không sửa bài/điểm/lớp.
- LiveModel3syntheticcases: tasks/qa-correction-live-model-20261014.md; sourceprompt exported, 3outcomes correct; feedback826/859/299chars, no score. Correctcase command printedcp1252 error after artifact/checks saved; separate savedartifact validation exit0. Edgecases command exit0. No realstudentdata or production evaluator.
- Browser reconnection requested; user replied đã bật lại. Current ALL_TOOLS still lacks browser/cua methods; ComputerUsepipeoserror2 after retry/reset. Pluginsearch offers installedTinyFish, not access existing IABsession. Cached browserpackage lacks skills/runtime and is an old install-temp; do not silently reconstruct its runtime.
- Chưa realGV/HS/PH or realAIlocalization QA; do not mark completed from synthetic/sample evidence.

## QA Sign-off Report — production follow-up14/10
**Status:** CONDITIONAL

### 1. Pre-flight Checks
- Git Commit/Hash:5f1380e551cf7aac358c39f53a7861dd77d6dcd6 (source024a5a8).
- Working Tree: documentation-only follow-up; source unchanged.
- Unit Tests:3029Pass/3029Total,286files (CI38507498058).
- Build Status:Success; sourcefinal localbuild exit0; currentVercelReady verified Gitstatus.
- Main Index Chunk Size:1545.01KB; existingowneracceptedbaseline, sourcebundleincrease~2.5% from1507.77.

### 2. Module Verification (Env: Prod / synthetic live AI)
| Module | Status | Evidence |
|---|---|---|
| Firestore+StorageRulesrelease | PASS | firebase deploy exit0; compiled+released both |
| Public portal+APIauth | PASS | homepage200; unauthcorrection401; directFirestore403 |
| Detailedcorrectionteacherfeedback | PASS for3syntheticcases | achieved/needs_work/uncertain; no score; tasks/qa-correction-live-model-20261014.md |
| RealGV/HS/PHworkspace | BLOCKED | IABtool absent; ComputerUsenativepipeoserror2 despite userenabled |
| RealstudentphotoAIlocalization | NOT RUN | needs authenticated browser/realassignment |

### 3. Issues & Tests Not Run
- ExistingIABtab visible fromambientstate but no interactiontool exposed. ComputerUse retry/reset sameerror; cachedoldbrowserpartialpackage not executable workflow.
- TinyFishalternative installed; Defaultprofile has no signed_in_sites. Tool requires consent before sign-in setup. User asked whether to switch; no setup/login/automation run yet.
- Do not claim syntheticmodel/evaluatorprompt as productionend-to-endorrealstudentQA.

### 4. Production Actions & Cleanup
- Production Write Actions:Yes, Firestore+StorageRulesonly; no classroomsubmission/score/message/approval mutation.
- Dữ liệu test đã được dọn dẹp:NA, syntheticimageslocal, no classroomtestdata created.
- Đánh giá bởi:Codex; browserQArealpending.

User đã chọn cloudbrowser; mở TinyFishstart_profile_setup_session cho Defaultprofile. Tool trả setupurl, đã cung cấp riêng cho user; user phải sign-in rồiSaveprofile. Không lưu handoffURL/PIN/token trong Git. Chưarunautomation trước khi profile saved.

## Cloudbrowser run sau user báo “đã lưu”

- TinyFish run000c44e4-65a5-4a0c-aad5-1d22d9bd0c21, terminalcompleted,119s,10steps. ProfileDefaultdomain_count4 nhưng signed_in_sites=[]; user đã xác nhận save nên run dùng exactprofile.
- Actualresult: homepage LoginGoogle + Xem chế độdemo. Agent đã clickdemo dù goal yêu cầu stopiflogin; đây là scope deviation, không dùng guest như evidence tài khoảnGV thật. Guest Lớp học0/lượtchấm0, không có Thi thửGHKI.
- Commentary “đã vào workspace lớp học” theo interimstep bị đính chính ngay khi terminalresult cho biếtguest. Không có QA lớp10/11/12 hoàn tất.
- Classdata/grades/uploads/messages không thay đổi theo run; clickdemo có thể tạoFirebaseanonymousAuthsession (sourceuseAuth), không tuyên bố zero-all-side-effects hoặc tự xoáaccount.
- Appfirebase.ts đã setPersistence(browserLocalPersistence), useAuth dùng Googlepopup; chưa chứng minh lỗi app hoặc profile storage. Không đổi authcode bằng suy đoán.
- User được hỏi đã thấy tài khoản/lớp thật trướcSave hay chỉ lưu trang; cần phân biệt missinglogin với sessionexportfailure. Không đọccookie/storage/token/PIN.
- TinyFishwalletlow0.11USD at runend, task unaffected; chưa bị insufficientcredits. Không tự nạp tiền hoặc chạy lặp task khi chưa có dữ kiện xác thực mới.

User xác nhận trướcSave chưađăngnhập, chỉlưu phiên. Rootcause hiện là missinglogin; không có bằng chứngprofileexportbug hoặc authappbug. Quyềncloud/setup có sẵn; mở lại Defaultsetup để user loginGoogle→Lớphọc thật→Saveprofile.

## Đối chiếu ảnh user14/10 — đúng IAB session GV

User ảnh a1876f2b-ab3a-4b15-8c72-08b76aba66f7 cho thấy Codex in-app browser đang tại giaoandewey với dashboardGV thật, greetingGV; đây là IAB, không phải TinyFishDefault. Không yêu cầu loginIAB lại.
Current tool discovery không có browser/cua/toolsearch. ComputerUsenativepipe vẫnoserror2. BundledChrome browser-client publicbootstrap qua trustedNodeREPL thất bại trước discovery với lỗi:
`Cannot find module 'C:\Users\ADMIN\.codex\plugins\cache\openai-bundled\browser\26.1007.21434\scripts\browser-service.mjs' imported from ...\trusted-worker.js`.
Pathbrowser-service kỳ vọng không tồn tại; Chrome cùngversion có servicefile nhưng không tựcopy/junction/rewrite trustedworker hoặc bypass runtime policy. Installer candidates không có Browser đểrepair bằngtool.
Đã xác định blocker là Browsertool/runtime, không phải thiếuGVsession trongIAB. TinyFishguest evidence không đại diệnIAB. Chưa realGV/HS/PHQA hoàn tất.
