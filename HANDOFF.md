# HANDOFF — signal-station-site (SmartPlan AI)

> Ảnh chụp trạng thái để phiên sau bắt nhịp ngay. Lịch sử đầy đủ (R1–R18, v6–v26): `tasks/archive/handoff-history-to-2026-10-23.md`.

> Lich su V27-V30 da luu tru: `tasks/archive/handoff-history-v27-v30-2026-10-25.md`.

## Latest checkpoint - V38 DANG DEPLOY: ngan hang cau hoi AI theo ma tran (28/10/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release` · Base: `182bfe5` (= v37 chua deploy, gop đot voi v38 theo quyet dinh user "phuong an 2").

### Trang thai: DA PHAT HANH — code v37+v38 da len live day du (marker xac minh 28/10). So version site: 37 (commit 5f76087 giu so 37 tu attempt dau); commit ho so nay se tang len 38.

### Noi dung thay doi v38 (y tuong #8: pipeline sinh/duyet cau hoi)

- `lib/ai-question-bank.js` (moi): `normalizeAICandidate` (chan topic ngoai ma tran, level ngoai khoang, cau qua dai, dap an khong hop le; chi dinh so), `mergeAIBank` (gop, tru trung, cap 60), `pickAIQuestion` (uu tien topic+muc dung, ne cau da dung, bo qua slot mcq/tf).
- Sinh cau hoi: action `ai-question-generate` (GV, quyen `game-action`, CHI truoc begin) → goi AI qua `aiConfigFor` (doc cau hinh `lesson_ai` cua chu may hoac `LESSON_AI_*`, dynamic import fail-soft) → prompt yeu cau mang JSON theo ma tran → validate → tra ve candidates de GV duyet.
- Duyet + luu: `ai-question-save` — GV tick chon/sua dap an tren board, server validate lai, luu vao `rooms.config` duong `$.aiBank` (json_set, guard revision).
- Dung trong van: `queueMath` (lib/race.js) uu tien `pickAIQuestion(s.campaign.aiBank, plan, r.mathHistory)` truoc khi roi ve `contextQuestion` san co; cau AI gan serial nhu cau thuong binh thuong.
- An toan: `campaignPublic` strip `aiBank` (dap an khong lo cho HS); `loadTeam`/`raceRoom`/board refresh `s.campaign` tu room de team vao truoc khi luu bank van nhan duoc bank; sinh/luu bi chan sau `begin` (409 ROOM_STARTED).
- UI GV: `aiBankPanel()` tren board truoc khi begin — nut "Sinh 6 cau de xuat", the cau hoi voi checkbox duyet + sua dap an + xem loi giai, nut "Luu cac cau da duyet"; hien `aiConfigured` de huong dan khi chua co khoa AI.
- CSS: +`.ai-bank-panel`, `.ai-candidate`.

### Verify truoc deploy (28/10)

- `tests/ai-question-bank.test.mjs` **8/8** (unit + route tich hop qua VM harness: HS khong thay aiBank, team nhan duoc bank sau refresh, chan sau begin); full suite **1449/1449 PASS, 0 fail**; `npm run build` pass. `lib/exam/**` va phong demo `7E42C2` khong dong den.
- Yeu cau moi truong: AI chua cau hinh → bao loi sach `AI_PROVIDER_NOT_CONFIGURED`, khong crash.

### Release record V37+V38 (deploy gop)

| Truong | Gia tri |
|---|---|
| version_number | **37** (= code v37+v38 day du; commit ho so sau do tang len 38) |
| deployment_id | `appgdep_6ae1c323ca20819196865ece9e0deba5` |
| commit_sha | `5f76087d590769d18a0c354a136e6c5ff9e256f1` |
| archive | `C:\Users\ADMIN\.codex\sites-release\release-20261028-v38.tar.gz` |
| archive size | 49447181 bytes |

### Ghi chu trien khai (28/10)

- Attempt 1 de workflow Sites tu commit file prompt roi vai (`5f76087`) va push len remote source; local hoi phuc va reset ve `3b22f70` (cha cua 5f76087, chua du code v37+v38). Workflow tu ff-merge len remote (co che merge --ff-only), khong can force.
- Archive sai dot dau da cach ly: `release-20261028-v38.invalid-5f76087.tar.gz` (khong deploy).
- Kiem doc lap tren live 28/10: app.js 205085 B co du marker `data-console`, `shop-locked`, `aiBankPanel`, `ai-generate`; style.css 63761 B co `.map-notice`, `.console-panel`, `.ai-bank-panel`.
- Commit tiep theo (ho so nay) se tao source commit moi -> Sites tang len version 38; deployment id moi se duoc Codex dien vao dong duoi.
| version 38 | deployment_id: (cho Codex dien) |

## Latest checkpoint - V37 DANG DEPLOY: mo luat theo lop + dieu khien lop thoi gian thuc (28/10/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release` · Base: `4430b50` (= v36 da phat hanh: version 36, deployment `appgdep_6ae12290bea08191bd18e355da0b19d7`).

### Trang thai: DANG DEPLOY — code + test xong, cho deploy.

### Noi dung thay doi v37 (tu van 10 y tuong → user chon #1 + #5)

- **#1 Mo luat theo lop (progressive disclosure)**: shop "Kho tiep te" chi hien grid ky nang + panel giao keo SAU khi doi giai xong cong xuat phat (`state.solved.length >= 1`); truoc do thay bang chu thich "Giai xong cong xuat phat de mo kho ky nang...". Server da khoa san (`s.solved.length < 1` → fail) nen chi la lop trinh bay, khong doi luat.
- **#5 Bang dieu khien lop thoi gian thuc (teacher console)**: moi action `teacher-console` (quyen `game-action`) voi 3 thao tac:
  - `freeze-all`: dong bang ca lop 20 giay — ghi `s.events` type `ice` (nguon "Giao vien dong bang ca lop"); effects() tu tinh lai freezeUntil, khong dung skill_actions (neu tranh tac dung phu shield/attackCount).
  - `broadcast`: luu `race.classNotice` vao rooms.race JSON; HS thay banner `map-notice` trong 90 giay tren ban do; `consoleLog` (20 entry cuoi) giu replay-safe theo requestId, bi `delete publicTurn.consoleLog` khoi board HS.
  - `grant`: cong 10–200 diem ma luc cho 1 doi, ghi event `teacher-grant` de kiem soat.
- UI: `classConsole()` tren board GV (sau `gameActivityHostControls`), handler `[data-console]` goi `api('teacher-console')` voi token GV; banner trong `raceMap` doc `m.classNotice` (HS nhan qua GET crew → raceRoom, GV qua board.map).
- CSS: +`.console-panel`, `.map-notice`, `.shop-locked`.

### Verify truoc deploy (28/10)

- `node --check public/app.js` sach; **tests/teacher-console.test.mjs 5/5** (route tich hop qua VM harness + needle client); full suite **1441/1441 PASS, 0 fail**; `npm run build` pass. `lib/exam/**` va phong demo `7E42C2` khong bi dong den.

### Release record V37

| Truong | Gia tri |
|---|---|
| version_number | **37** |
| deployment_id | (placeholder — Codex dien sau deploy) |
| commit_sha | (placeholder — Codex dien sau commit) |
| archive | `C:\Users\ADMIN\.codex\sites-release\release-20261028-v37.tar.gz` (placeholder) |
| archive size | (placeholder) |

## Latest checkpoint - V36 DA PHAT HANH: va not F3 sot sau v35 (27/10/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release` · Base: `1cf10c7f64d76e1dbf3d29cb4c121fff101b12a0` (= v36 da phat hanh: version 36, deployment `appgdep_6ae12290bea08191bd18e355da0b19d7`).

### Trang thai: DA PHAT HANH — native deployment succeeded; get_site latest_version_number = 36 (28/10/2026).

### Noi dung thay doi v36

Sau khi soi toan bo 16 cho "xuc xac" tren live v35: F3 da sua 4 cho nhung con 3 cho lot duoc vao che do chien dich.

- F3b-1 tooltip o ban do (`terrainInfo`): nhanh cuoi `'Lan xuc xac khi den luot...'` -> them `m.campaign ? 'Chon buoc di chuyen khi den luot...'`. Reachable qua action `map-spot` (click pin ban do chay moi mode).
- F3b-2 nut lan fallback (`bonusPanel`): `'Lan xuc xac'` -> `${r.campaign ? 'Chon buoc di chuyen' : 'Lan xuc xac'}`. Reachable khi `individual` + giao keo bo luot chua thanh toan (khong vao `stepBuyPanel`).
- F3b-3 nhan dong ho luot (`updateRaceClock`, 2 cho): them nhanh campaign "Chon buoc di chuyen · ..." cho ca `individual` va `team`.
- `tests/race-choose.test.mjs`: +1 test hoi quy F3b (4 needle theo region). Tong 19 test.

### Verify truoc deploy (27/10)

- `node --check public/app.js` sach; race-choose **19/19**; full suite **1436/1436 PASS, 0 fail**; `npm run build` pass. `lib/exam/**` va phong demo `7E42C2` khong bi dong den.

### Release record V36

| Truong | Gia tri |
|---|---|
| version_number | **36** |
| deployment_id | `appgdep_6ae12290bea08191bd18e355da0b19d7` |
| commit_sha | `1cf10c7f64d76e1dbf3d29cb4c121fff101b12a0` |
| archive | `C:\Users\ADMIN\.codex\sites-release\release-20261027-v36.tar.gz` |
| archive size | 49442863 bytes |

## Latest checkpoint - V35 DA PHAT HANH: fix 3 FAIL QA live v34 (27/10/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release` · Base: `9aea0a1` (= v34 da phat hanh: version 34, deployment `appgdep_6ae096897df88191b16636da5b042ec2`).

### Trang thai: DA PHAT HANH — native deployment succeeded; get_site latest_version_number = 35 (27/10/2026).

### Noi dung thay doi v35 (fix 3 FAIL QA live v34; bao cao: `tasks/qa-v34-live-20261027/REPORT.md`)

- F1 diem HS stale sau mua ky nang: `public/app.js` `buySkill()` them `render()` ngay sau `apply(d)`. Goc re: handler chi apply + `updateClock()` (khoa nut theo score moi) nen text diem cu; `raceAction` mua buoc da lam dung chuan nay tu truoc.
- F2 GV thieu trang thai het ma luc: `teamDetail()` them co `noMana = !finished && r.race?.campaign && (r.score || 0) < 30` -> nhan " · Het ma luc" o ca summary + body cua tung doi; travel notice doi theo che do ("Cho luot di chuyen hoac xu ly su kien" o campaign, duel giu nguyen).
- F3 chu "xuc xac" sot o campaign (4 cho): nut cong thoat -> "Tro lai ban do · Chon buoc di chuyen"; thuong giu buoc -> "luot di chuyen tiep theo"; rules "Chon thuong" -> campaign la "nhan 100 diem ma luc" thay vien xuc xac; helper het ma luc them "giao keo (+40 diem, toi da 2/van)" (pact delay = +40 diem, `route.js:943`, toi da 2/van).
- `tests/race-choose.test.mjs`: +3 test hoi quy F1-F3 (pattern region nhu C4; needle chua template literal phai escape `\${`). Tong 18 test.
- File commit v35 (5 modified + 2 moi): `public/app.js`, `tests/race-choose.test.mjs`, `HANDOFF.md`, `tasks/todo.md`, `tasks/lessons.md`, `tasks/codex-qa-v34-live.md`, `tasks/codex-prompt-v35.md`.

### Verify truoc deploy (27/10)

- `node --check public/app.js` sach; race-choose **18/18**; full suite **1435/1435 PASS, 0 fail**; `npm run build` pass, 0 loi. `lib/exam/**` va phong demo `7E42C2` khong bi dong den.

### Release record V35

| Truong | Gia tri |
|---|---|
| version_number | **35** |
| deployment_id | `appgdep_6ae0bbc0175c8191862d2eea418c8864` |
| commit_sha | `f73d029a36714bbf71e789d9b49f7424cde31f3e` |
| archive | `C:\Users\ADMIN\.codex\sites-release\release-20261027-v35.tar.gz` |
| archive size | 49443174 bytes |

- Kiem doc lap do phien OpenCode thuc hien sau deploy: SHA256 app.js/style.css/chunk tai tu live khop archive, root HTTP 200, marker "Het ma luc" + "Chon buoc di chuyen" + "Cho luot di chuyen hoac xu ly su kien" hien dien tren live.

## Latest checkpoint - V34 DA PHAT HANH: ma luc mua quyen chon (27/10/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release` · Base: `1e93e92` (= v33 da phat hanh).

### Trang thai: DA PHAT HANH — native deployment succeeded (27/10/2026).

### Release record V34

| Truong | Gia tri |
|---|---|
| version_number | **34** |
| deployment_id | `appgdep_6ae096897df88191b16636da5b042ec2` |
| version_id | `appgprj_6ac8d74b14f8819193caded9533bb337~appgver_59b8809d790481918d1105511b44dc23` |
| commit_sha | `9aea0a1acf70a7f817feba31f65deb55be480d9b` |
| archive | `C:\Users\ADMIN\.codex\sites-release\release-20261027-v34.tar.gz` |
| archive size | **49.442.961 bytes** (gzip local, theo checkpoint da xac minh; server reports unpacked tar 67.399.680 bytes) |
| audience / env | public / revision 3 |
| deployment status | succeeded |
| deployment updated_at | `2026-10-27T12:19:11.971249+00:00` |
| live URL | https://mat-ma-da-gioi.cuong-vuviet.chatgpt.site |
| app.js | 198.962 bytes — SHA256 `E0765F11731B415D631799E13448583C4F1636F4CC835CE3C91CC01E5E1C08FB` |
| style.css | 62.854 bytes — SHA256 `1FB3A67F8EBE719DFA854E64357478CD52C2B191A9D234CA95B57CE1789ED940` |
| chunk | `useLessonSession-CqzbOIMh.js` — 66.522 bytes, SHA256 `46DC675CF1BD988AF5DB8DD9B6AAB981DC7CC6C0FC38AAE40A4C8EDBD42DDF96` (giu nguyen tu v33) |

- [x] get_site truoc deploy: latest_version_number=33, audience public.
- [x] Native save dung archive da dong goi: version_number=34, source.commit_sha khop checkpoint.
- [x] Native deploy: succeeded, URL nhu tren; khong chay lai workflow, khong tao archive moi.
- Kiem doc lap boi phien OpenCode (27/10): tu trich app.js + style.css + chunk tu archive v34, tai lai tu live trong Chrome — SHA256 trung khit ca ba, root HTTP 200; marker "Nhan 100 diem ma luc" + "Mot xuc xac them" + `.step-buy`/`.dice-wallet`/`.skill-note` hien dien tren live. Evidence: `C:\Users\ADMIN\.codex\sites-release\v34-live-verification.json`.
- HANDOFF sau deploy la ghi chep local, khong nam trong commit/archive da phat hanh; khong commit thu cong. Phien nay khong chay lai test/build hoac browser E2E.

### Noi dung thay doi v34 (da commit trong 9aea0a1)

- `lib/race.js`: skill `choose` (mua 1–6 buoc x 30d), grant khoi hanh 240d + event `start-grant` dung 1 lan, `choose()` nham `rid` (requestId) vao event di chuyen lam commit guard.
- `app/api/escape/route.js`: guard choose/roll o campaign (CAMPAIGN_ROLL_LOCKED, CAMPAIGN_ONLY, CHOOSE_STEPS, PACT_DEBT 409 khi individual con no giao keo), chooseInsert them `EXISTS(json_each…'$.rid')` — INSERT chi commit khi chinh luot di chuyen da ghi (chong race trich diem khi skill mua dong thoi chiem revision); GET tra `score: effects.wallet`.
- `public/app.js`: stepBuyPanel 6 nut (1–6 buoc, gia 30–180, disabled mac dinh, an khi het ma luc), shop note "Tu chon buoc · 30 diem/buoc" khong nut mua + an Xuc xac kep o campaign, travel() dice-wallet + "luot da mua" + carry, raceRules tach theo che do (campaign bo Xuc xac kep, duel giu nguyen), refresh() render lai khi score doi.
- `public/style.css`: CSS v34 (`.step-buy`/`.dice-wallet`/`.skill-note` + media 480px).
- `tests/race-choose.test.mjs`: 15 test (7 Phase A + 6 hoi quy QA dot 1/dot 2 + 2 reward dice).
- Di kem trong cung diff (da live rieng, chi de khong hoi quy): v33 chuong — `lib/lesson/runtime.js`, `lib/lesson/self-pace.js`, 9 file test mock + lesson-api/revisit.

### QA Codex single-source dot 1 (27/10; lane claude chet OAuth het han)

- Verdict: CẦN SỬA muc 1, 3, 8; muc 11 verify bi sandbox EPERM (`lstat C:\Users\ADMIN\.codex` — loi moi truong sandbox, khong phai san pham). Git status truoc/sau review giong het — Codex khong sua gi.
- Xac minh doc lap ca 3 FAIL: deu dung. Da fix + 4 test hoi quy: (1) rid guard — Fix 1b tai hien dung kich ban mat diem (revision bi chiem → UPDATE 0 + INSERT 0, ledger 0); (2) PACT_DEBT — Fix 3 di qua route VM that: choose 409 khong di chuyen/khong tru → roll tra no (skip) → choose 200 cost 60 commit dung 1 lan; (3) fragment "Ky nang di chuyen" tach theo che do (test tinh Fix 8).

### QA Codex dot 2 tong the 1 the (27/10)

- Fix A/B/C: XAC NHAN DUNG GOC, khong lo hong moi; R1–R4 (json_each/D1, playMode la, template literal, rid fail-closed) deu SACH. Verdict: CẦN SỬA muc 8 — 2 hoi quy P2 duong hien thi. Git status truoc/sau giong het — Codex khong sua gi.
- Da xac minh doc lap (deu dung) + fix: (1) `result()` app.js:598 them `choose`/`start-grant` vao exclusion list (raceHistory render rieng 2 event nay); (2) `teamDetail()` app.js:610 nhan ca event `choose` khi tinh thoi diem den cong — an toan vi roll tra no chi push `pact-pass`, khong tao event `roll` co `to` (lib/race.js:13); (3) siet test Fix 8 (delimiter `}</li>` + assert k>j — delimiter cu `'</li>` khong ton tai, indexOf tra -1) + 2 test hoi quy moi.

### QA Codex dot 3 tai kiem delta (27/10)

- DELTA-1/2/3: PASS — khong lo hong moi; source khop snapshot diff. **VERDICT: SẴN SÀNG DEPLOY (pham vi delta V34).**

### Reward dice doi nghia o campaign — quyet cua user (27/10, C4a)

- User chon **DOI**: o campaign, phan thuong 'dice' ("Mot xuc xac them") thanh **+100 diem ma luc** (tuong duong ~3.3 buoc mua, sat gia tri vien them ~3.5 buoc); duel giu nguyen extraDice.
- Sua 3 cho: `app/api/escape/route.js` (nhanh `if (s.campaign) s.score += 100` trong xu ly reward, event reward ghi `points: 100`), `bonusPanel` trong `public/app.js` (campaign: "Nhan 100 diem ma luc"), `raceHistory` (label "diem ma luc" theo che do). Doi chieu them: skill `double` da bi shop an san o campaign — khong con lua chon phan thuong vo hieu nao.

### Verify truoc deploy (27/10, sau C4a)

- `node --check public/app.js` sach; race-choose **15/15**; full suite **1432/1432 PASS, 0 fail**; `npm run build` pass. (Lan truoc 1459 la so test dong theo dieu kien mang; lan nay 1432, 0 fail.)

### No con lai

- No: screenshot responsive 375/390/430 (S5/C3, moi truong), no QA v32.
- Reward dice: DA QUYET — doi thanh 100 diem ma luc o campaign (C4a, xem tren).
- Deploy v34: prompt `tasks/codex-prompt-v34.md` (26 file commit); archive moi `C:/Users/ADMIN/.codex/sites-release/release-20261027-v34.tar.gz`.

## Checkpoint truoc - V33 DA PHAT HANH: fix P1 AI feedback + responsive luong HS (27/10/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release` · Base: `ee6b95f` (= v32 da phat hanh).

### Trang thai: DA PHAT HANH — native deployment succeeded, live chunk/CSS khop archive.

### Release record V33

| Truong | Gia tri |
|---|---|
| version_number | **33** |
| deployment_id | `appgdep_6adff81976e88191b1a0fc91de31646a` |
| commit_sha | `1e93e9264634837844e54969185697e68fe80964` |
| archive | `C:\Users\ADMIN\.codex\sites-release\release-20261027-v33.tar.gz` |
| archive size | **49.441.919 bytes** (file gzip local; server reports unpacked tar 67.389.440 bytes) |
| audience / env | public / revision 3 |
| live HTTP | 200 |
| chunk | `useLessonSession-CqzbOIMh.js` — 66.522 bytes |
| chunk SHA256 | `46DC675CF1BD988AF5DB8DD9B6AAB981DC7CC6C0FC38AAE40A4C8EDBD42DDF96` |
| CSS | `style.css` — 61.725 bytes |
| CSS SHA256 | `C8F8BCA112D173DBE0D008815B046D4860266542C1E1B2AD5DB661F27B466F31` |

- [x] Build moi bang plugin helper; workflow commit dung 12 file, push chi remote do Sites credential cap, archive moi.
- [x] Tai chunk va CSS tu live, so truc tiep voi bytes trich tu archive: ca hai SHA256 trung khit. Banner `Đã gửi thầy/cô xem lại`, `Nhận xét gợi ý:` va responsive marker hien dien.
- [x] Native save v33 + deployment succeeded; get_site xac nhan latest_version_number=33/public.
- Evidence: `C:\Users\ADMIN\.codex\sites-release\v33-live-verification.json`.
- Kiem doc lap boi phien OpenCode (27/10): tu trich chunk + CSS tu archive v33, tu tai lai tu live — SHA256 trung khit ca hai (chunk 46DC675C…, CSS C8F8BCA1…). HEAD / tra 403 la Cloudflare challenge voi PowerShell, khong phai loi site.
- Log ban giao 1393/1416 PASS, 23 FAIL. Phan tich sau deploy: 17 mock UI thieu import/export; 5 lech luong luyen lai tu luan; 1 P1 buzzer dong som khi tat ca HS moi bam chuong. Chay local API/revisit 50 test: 44 PASS, 6 FAIL. Report `tasks/qa-v33-failures-20261027/REPORT.md`; chua fix, chua tai hien live, chua chay baseline v32 doc lap. Khong suy ra browser E2E tu kiem chunk.
- HANDOFF/checklist sau deploy la ghi chep local, chua nam trong commit/archive da phat hanh. QA artifacts va gameplay research giu nguyen, loai tru cuc bo khoi workflow `git add --all`.

### Da sua trong v33 (12 file da commit; bang duoi liet ke thay doi chinh)

| File | Noi dung |
|---|---|
| `lib/lesson/assessment-ai.js` | P1: `AI_INVALID_PROPOSAL` vao danh sach trang `friendlyAutomaticFailure` |
| `lib/lesson/runtime.js` | P1: truyen `feedback` vao `autoSub.aiAssessment` (runtime.js:1433) |
| `components/lesson/TaskInput.tsx` | P1: banner HS cho nhanh `needs_review` + render `aiAssessment.feedback` o nhanh ok/wrong + bo sung kieu `aiAssessment` |
| `public/style.css` | Responsive: trong media 760px doi `.gamecols{grid-template-columns:minmax(0,1fr)}` (tu `1fr`) + them `.gamecols>*{min-width:0}` |
| `tests/lesson-themed-route-ui.test.mjs` | 2 guard mock TaskImage |
| `tasks/coordination.md`, `tasks/lessons.md`, `tasks/plan-hoan-thien-game-va-day-hoc.md` | Ghi nhan dieu phoi + bai hoc |

### Bang chung verify v33

- `tsc` 0 loi; `npm run build` pass; test 1393/1416 pass — 23 fail la no v32 co san, khong do dot nay (log `C:\Users\ADMIN\AppData\Local\Temp\tap-v33.txt`, UTF-16). **Dinh chinh 27/10:** nhan "no v32 co san" dua tren ban giao, chua kiem doc lap; da phan tich + xu ly het, xem muc "Xu ly 23 test FAIL" duoi.
- Responsive trang chu: 6/6 viewport sach (375/390/430/810/820/1366).
- Responsive luong HS: phong R2HJCM, 3 HS browser context RIENG (375/390/430), 4 man waiting → nhiem-vu → filled → checked = **12 do sw=iw, 0 tran, 0 console error**. Script `Temp\opencode\v33-verify.mjs`; ket qua `Temp\opencode\responsive\v33-verify.json` + screenshots.
- Gen goc root man nhiem vu: track grid `1fr` (min-width:auto) bi ep 364px boi chuoi min-content `.evidence`(pad 40) + `.lab`(pad 42) + `table` 280 + 2 border. Fix `minmax(0,1fr)` + `min-width:0` → track 343, sw=375.
- Ban do chien dich bi clip tren man cho = THEO THIET KE (`overflow:hidden`), khong phai bug.
- Da xoa 10 phong QA qua UI GV — "Phien cua toi" trong. Muon test lai phai tao phong moi: `/hosts` → Tao phong game → Sinh van.

### Bai hoc ky thuat dot nay

- Grid `1fr` co `min-width:auto` ngam dinh: con chua `table` se ep track rong hon viewport. Ben trong media query phai dung `minmax(0,1fr)` + `min-width:0` cho con truc tiep.
- Nhieu page Puppeteer trong 1 browser dung chung localStorage → HS phai `browser.createBrowserContext()` rieng, neu khong page sau tu resume session page truoc.
- Rejoin trung ten nhom → 409 Conflict; script QA phai dung ten nhom ngau nhien.

### Xu ly 23 test FAIL (27/10, sau deploy v33 — chua commit, di kem dot v34)

Phan tich goc: `tasks/qa-v33-failures-20261027/REPORT.md` (Codex) — da kiem doc lap boi phien OpenCode. Ket qua 3 nhom:

1. **P1 chuông dong som — DA SUA (TDD)**: goc that co 4 diem auto-close, khong phai 3 nhu REPORT nêu: 3 postlude ANSWER/PICK/BUZZ (`runtime.js` 1186/1192/1198) **+ prologue truoc moi mutation (`runtime.js:713-716`)** — prologue la duong lam test moi van RED sau khi vá postlude (ansA bi EVENT_CLOSED vi prologue dong event ngay truoc khi answer xu ly). Fix: helper moi `questInteractionPending` (`self-pace.js`) — player co `buzz != null` (buzzer) hoac `selectedCellId != null` (mountain) va khong absent → coi la dang do; guard `questJoinedAll(next) && !questInteractionPending(next)` dong nhat tai ca 4 diem. Timeout/GV van la van an toan (expiry branch giu nguyen). Test hoi quy moi "buzzer event stays open while buzz claims are in flight..." — file api-integration 38/38.
2. **5 test luyen lai — DA CAP NHAT theo flow V28** (`tasks/v28-cham-bai-ai.md:3`, quyet dinh da chot voi user 23/10): nop luyen tap = hoan thanh (`submitted`/`comment_pending`), GV ASSESS → `INVALID_ASSESSMENT`, bang chung nang luc chi tinh khi `assessmentStatus === 'assessed'` (passport.js:158) — test 198 bat cong tac A `SET_PRACTICE_GRADING` de giu nguyen y nghia assess. File revisit 13/13.
3. **17 test mock UI — subagent DA SUA**: 17/17 PASS, 9 file test (+37/−8 dong), khong dung production; chi tiet `tasks/qa-v33-failures-20261027/MOCK-FIXES.md`. Dinh chinh: 2 test task-input-* thieu QUICK_CHIPS, khong phai VM loader.

**Verify chung sau khi xu ly**: full suite **1417/1417 PASS** (1416 cu + 1 test hoi quy chuong moi), 0 fail; `npm run typecheck` 0 loi; `npm run build` pass. File sua: `lib/lesson/runtime.js`, `lib/lesson/self-pace.js`, `tests/lesson-api-integration.test.mjs`, `tests/lesson-revisit.test.mjs` + 9 file test mock (subagent).

### Buoc tiep theo (Codex)

1. Da xong: `site-workflow.mjs` chay `build-site.mjs`, commit/push 12 file va dong goi archive v33 moi.
2. Da xong: record release va kiem SHA256 live/doc lap o bang tren; khong deploy lai chi de dua record sau deploy vao bundle.

### Cho nguoi dung quyet dinh (khong code truoc khi chon)

- Luat choi thay xuc xac cho muc dich day hoc (cac phuong an da trinh: quay 2 xuc xac chon 1 / chon duong theo chu de / diem ma luc doi quyen chon buoc; xuc xac giu lai cho che do thi dua).
- Touch dien thoai that + so du vi vilao: de sau.

## Checkpoint truoc - V32 DA PHAT HANH: sua tuong phan + khoa ti le (26/10/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`.

### Release record V32

| Truong | Gia tri |
|---|---|
| version_number | **32** |
| deployment_id | `appgdep_6adef7ec3b34819184bfe2600eb8ee39` |
| commit_sha | `b6bf1739ed9cd6ae18b05ebf2e2091fc72856ee7` (= `b6bf173`) |
| archive | `C:\Users\ADMIN\.codex\sites-release\release-20261026-v32.tar.gz` (49.441.982 bytes) |
| audience | public |
| chunk | `useLessonSession-BK-YqRd9.js` — 65.860 bytes |
| SHA256 | `9198C14B9B420118422F6F2B6611E505998C2DA98D82CD1E1CDD72D138659A42` |

**Kiem doc lap**: SHA256 cua chunk tai tu live TRUNG KHIT chunk trong archive va ban QA luu. Xac nhan v32 len dung, khong phai ban khac.

### Da sua trong v32

**Loi 1 — tuong phan (QA phat hien, MAJOR that)**:
`app/lessons/lesson.css` dat `--lesson-text: #f8fafc` (gan trang) cho ca khung toi. Khoi ket qua cham co nen `#fef3c7` nhung **khong set `color`** -> chu trang tren vang nhat. Ti le tuong phan tu tinh: **1.064:1** (chuan AA can 4.5:1). Da set `color: "#14532d"` -> **8.182:1** tren nen vang, **8.296:1** tren nen xanh (ca hai vuot AAA 7:1).

**Loi 2 — khoa ti le SVG**: `KhoiXoay` va `BangVe` doi sang `flex: "0 0 auto"` + `aspectRatio: width/height` thay vi chi `height:auto`. Khong lam thay doi hinh da duyet.

### Bai hoc quan trong — "loi" khong ton tai

QA bao "anh tu dien bi cat" va cham diem "CHUA DAT". **Sai.** Chinh file `mobile-draw-metrics.json` cua QA do duoc canvas `261.33 x 227.11` -> ti le **0.869**, khop viewBox `330/380 = 0.868`. Hinh KHONG bi bop. Anh trong bi cat vi vung cuon cat ngang — hanh vi cuon binh thuong.

Trong luc xu ly, da sua CSS 5 lan lien tiep (aspect-ratio, flex, max-height, sua lesson.css) deu sai huong, roi phai hoan tac toan bo `lesson.css`. Nguyen nhan: **khong doi chieu so do ti le co san trong bao cao QA truoc khi tin ket luan chu**.

**Quy tac rut ra**: khi QA bao "hinh bi cat/bop meo", phai tinh ti le tu so do DOM (`height/width` so voi viewBox) TRUOC khi sua CSS. Neu ti le dung thi do la cuon, khong phai loi.

**Luu y don vi**: `t.length` trong JS dem KY TU, `File.length` dem BYTE. Tieng Viet nhieu ky tu 2-3 byte nen chenh 65.860 byte vs 62.927 ky tu la binh thuong, khong phai loi.
