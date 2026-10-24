# HANDOFF — signal-station-site (SmartPlan AI)

> Ảnh chụp trạng thái để phiên sau bắt nhịp ngay. Lịch sử đầy đủ (R1–R18, v6–v26): `tasks/archive/handoff-history-to-2026-10-23.md`.

## Latest checkpoint - V28 + sua SVG tuan 11 (review cheo 3 hang) - 24/10/2026

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release` · HEAD `029863e`.

### Trang thai phat hanh Site

- Site `appgprj_6ac8d74b14f8819193caded9533bb337` (`https://mat-ma-da-gioi.cuong-vuviet.chatgpt.site/`), audience **public**, dang o **version 27** (`appgdep_6adafbba79e08191a2e2b3b17d2d7f94`).
- **V28 CHUA PHAT HANH** (co chu y dung): phien `codex exec` phat hanh v28 da chay buoc 1-2 (get_site + write credential) va dang o `site-workflow.mjs` thi bi kill truoc buoc `sites_deploy_site_version`, vi user bao 14 SVG ve sai. Khong co gi duoc day len live.
- Archive v28 chua duoc tao: `C:\Users\ADMIN\.codex\sites-release\release-20261024-v28.tar.gz` (duong dan giu nguyen trong prompt deploy).
- Prompt deploy day du: `C:\Users\ADMIN\AppData\Local\Temp\opencode\v28-deploy-prompt.md` (recipe 8 buoc, plugin `sites` **1.1.2**, IPv4 pin `git.chatgpt-team.site:443:104.18.16.199`, pnpm 11.25.0).

### Sua SVG tuan 11 - commit `029863e`

13/14 SVG da sua (`public/content/hinh/`), theo ket qua review cheo 3 hang model doc lap tren cung mot prompt + mapping SVG -> de bai:

| Hang | Model | Ket qua | File |
|---|---|---|---|
| Claude | `cc/claude-opus-5-5` | 2 PASS / 12 FAIL (5 critical) | `.dieu-phoi/review-claude.md` |
| GPT | `cx/gpt-6.1-sol` | 4 PASS / 10 FAIL (3 critical) | `.dieu-phoi/review-gpt.md` |
| Gemini | `ag/gemini-3.8-flash-high` | 9 PASS / 5 FAIL (3 critical) | `.dieu-phoi/review-gemini.md` |

Loi da sua (chong findings 3 nguon + tu ra):
- `r107-g11-thang-chu-a`: bo khang dinh sai "BA ∥ CI" / "hai bac bang nhau", ve lai hinh chu A that (dinh chung O), gan A,B,C (chan trai) va A',B',C' (chan phai) tai giao diem bac x chan.
- `r106-g11-tu-dien-sabc-trung-diem`: them canh **SA** bi thieu; sua dinh thiet dien `220,217` -> `220,118` (diem P); tach net dut.
- `r107-g11-chop-sabcd-thiet-dien`: day thanh **hinh thang AB = 2CD** (truoc la hinh binh hanh), C -> `(245,190)`, tinh lai M,N,P,Q = S + 2/3(dinh - S), net dut SD/AD/CD.
- `r106-g11-hai-mp-cat-theo-d`: ve lai thanh hai nua mat phang chung bo d; them duong b; dua a ra khoi mien (Q).
- `r106-g11-hinh-hop-2-mat-doi-dien`: them net dut AD/DC/DD', dao thu tu lop, sua aria-label "mat day" -> "mat ben", to dam AB va AA'.
- 5 hinh vecto lop 10 (r103 x2, r104, r105 x2): chu thich doi sang "vecto AB + vecto AD = vecto AC" (loi nang nhat: dang thuc do dai gay hieu nham), dao ti le AB < AD / AB < AC cho khop de, tach IA/IB ra duong phu.
- `r106-g10-heron-noi-tiep`: tach `;` thay `·`, them `r = S/p`.
- `r107-g11-thales-3-mat-phang`: doi phuong d' (ti so khac 1), them nhan (alpha),(beta),(gamma).
- `r106-g10-dinh-li-sin-hai-tram`: them ki hieu goc vuong tai C, doi caption thanh "goc C = ?".
- `r107-g10-mien-nghiem-doi-giac`: **khong sua** (3/3 nguon PASS).

Bang chung: build PASS; 14/14 SVG khong BOM + well-formed (`ALL PASS`); chup lai toan bo 14 hinh sau sua (`C:\Users\ADMIN\AppData\Local\Temp\opencode\qa-svg-v2-final.png`, zoom 3 hinh kho: `qa-zoom.png`).

### Viec tiep theo

1. Phat hanh lai **v28** bang dung `v28-deploy-prompt.md` (HEAD moi `029863e` la commit can phat hanh) - truoc khi chay kiem 9router song (`/v1/models` 200), vi router nay chet ~7 phut/lan.
2. Ghi release record v28 (version, deployment_id, source_commit, live_http) vao HANDOFF + plan khi co ket qua.
3. **No chua xu ly (ngoai pham vi SVG, da bao cao)**: nhieu hint H1-H4 trong `hki-2026-g10/g11.json` khong khop chu de bai ("Xac dinh phep doi xung tuong ung", "Tim trung binh truoc", supportRationale ve `cos(pi - x)` nam trong bai vecto / hinh khong gian). Can mot dot sua noi dung rieng.
4. 25 test fail baseline (TaskImage/QUICK_CHIPS/lesson-revisit/buzzer) van con, khong do dot sua nay.

### Gioi han khong dung

- Khong sua `lib/exam/**`, khong dung phong demo `7E42C2`, khong doi audience Site, khong push remote khac remote cua Site credential.
- `.dieu-phoi/` la scratch review (khong commit, chua co trong `.gitignore`).

## Previous checkpoint — V27 THPTQG task types — 23/10/2026

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`.

**Mục đích V27**: đưa thang điểm chuẩn THPTQG vào tiết học 1-1: đúng/sai 4 ý chấm theo thang 0/0.1/0.25/0.5/1 (thang 2025), trả lời ngắn thập phân 4 ô `decimal_4` (chấm↔phẩy), mini-game trao điểm một phần theo ratio, UI phản hồi ✓/✗ từng phát biểu + chip "Điểm ý", bàn phím thập phân 12 phím, prompt bộ soạn AI yêu cầu đủ 4 dạng kèm minh họa hình học, và 3 bài pilot thật trong catalogue (r013, r028, r108).

### Đã xong (mỗi task 1 commit, TDD)

| Task | Commit | Nội dung |
|---|---|---|
| 1 | `20ef5f7` | `TF_RATIO` + `verdictMeta` + ratio/perItem trong `true_false_4` (schema.js) |
| 2 | `378ba92` | Checker `decimal_4` cho `short_answer_4` (schema.js + validate.js) |
| 3 | `39a48fe` | Runtime SUBMIT/GROUP_SUBMIT lưu `ratio`/`perItem` (class-events.js) |
| 4 | `8aef4c9` | Mini-game trao điểm một phần `points = round(base × ratio)` — không bọc `correct ?` |
| 5 | `ca386ef` | TaskInput: ✓/✗ từng phát biểu + chip điểm + keypad thập phân + CSS `app/lessons/lesson.css` |
| 6 | `d67c870` | Prompt bộ soạn AI yêu cầu 4 dạng THPTQG + bắt buộc `image`/`diagramUrl` cho hình học |
| 7 | `065c018` | Nội dung pilot: 3 entry r013/r028/r108 qua `scripts/thptqg-v27-pilot.mjs` (MC + đúng/sai + trả lời ngắn decimal_4, r028 kèm SVG tứ diện/chóp) + catalogue rebuild |

### Bằng chứng kiểm thử (cục bộ, HEAD `065c018`)

- `npm run test`: **1416/1416 pass**. `npm run typecheck`: sạch. `npm run build`: exit 0.
- Test riêng V27 `tests/lesson-thptqg-v27.test.mjs`: 7 test (ratio THPT, decimal_4, verdictMeta, mini-game, UI keypad/feedback, prompt AI, lint nội dung pilot).
- `tests/hki-content.test.mjs`: catalogue 403 bài + 6 exam validate + hash khớp sau pilot.
- Nội dung pilot: rationale qua script migration — validate từng pkg trước khi ghi; tái phân bổ thời gian (lane 10→4 phút, xen 6 phút shared) giữ nguyên `slotMinutes` 40.

### Kiến thức khóa (đừng lặp lại)

- **Bài học được phục vụ từ `content/hki-2026-catalogue.json`** (gzip base64), KHÔNG phải từ `content/lessons/hki-2026-gNN.json`. Sửa grade JSON xong PHẢI chạy `node scripts/content/build-hki-catalogue.mjs` để rebuild catalogue.
- Grade file phải giữ định dạng gốc: `JSON.stringify(db, null, 1) + '\r\n'` (diff sẽ nổ nếu nén compact).
- Bất biến catalogue: mọi entry `budget.slotMinutes === 40` (test pin); `coreMinutes`/`reserveMinutes`/`optionalMinutes` phải đúng bằng tổng phút activity theo role.
- `validateLessonPackage` kiểm contentHash trước — script migration phải tính lại hash rồi mới validate; metadata có `sourceCitation` thì bắt buộc `numericReviewRequired` là boolean (prompt có số → phải `true`).
- Clone template task phải gán lại `activityId` (template ở act-1 thì clone vẫn trỏ act-1 → ERR_DANGLING_REFERENCE).

### Đang chờ / kế tiếp

1. ~~Deploy v27~~ → **ĐÃ PHÁT HÀNH 23/10**: version 27, deployment_id `appgdep_6adafbba79e08191a2e2b3b17d2d7f94`, source_commit `ea14e0a9bed7bab882dd420099207b85f42bfa15`, live HTTP 200. Xác minh live đạt: chunk client `useLessonSession-CdAVDDx3.js` byte-đúng dist (đủ marker "Bàn phím thập phân"/"Điểm ý"/`decimal_4`); server tree archive chứa 3 blob pilot r013/r028/r108.
2. ~~Ghi release record~~ → Đã ghi vào plan + lessons + `tasks/qa-v27-checklist.md` (checklist đầy đủ cho Claude, kèm đáp án 9 task pilot).
3. **QA bàn giao Claude**: làm theo `tasks/qa-v27-checklist.md` — pilot r013/r028/r108 từ catalogue → mở tiết → HS thấy MC / đúng/sai ✓/✗ từng ý + chip "Điểm ý" (trúng 3/4 = 0,5; đủ 4/4 = 1) → trả lời ngắn 4 ô bàn phím thập phân (1,74 ≡ 1.74) → mini-game trao điểm một phần. QA nộp ảnh v26 vẫn chờ GV đăng nhập lại (phòng 7E42C2 hết giờ tiết). **Chẩn đoán alert "Đang có thao tác đang xử lý" (23/10 chiều)**: không phải lỗi v27 — guard chống double-submit (`useLessonSession.ts:295-297`, nhả lock trong `finally`) + `window.alert()` native chặn tab khi automation không dismiss dialog; chạy QA tuần tự 1 tab HS, gặp alert thì dismiss rồi thử lại (chi tiết `tasks/qa-v27-checklist.md`).

### Giới hạn không đụng

- Không sửa `lib/exam/**` (thang điểm thi đã ổn), không đụng phòng demo `7E42C2`, không đổi audience Site, không push remote khác remote của Site credential.
- Render/bundle: `lib/lesson/schema.js` là nguồn sự thật checker; TaskInput đọc `task.diagramUrl || task.image`.
- Nguyên tắc mini-game: reward ledger runtime giữ nhị phân; chỉ điểm thưởng ×ratio, trạng thái "đúng" chỉ khi đủ 4/4.
