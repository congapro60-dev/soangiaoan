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
