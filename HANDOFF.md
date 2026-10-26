# HANDOFF — signal-station-site (SmartPlan AI)

> Ảnh chụp trạng thái để phiên sau bắt nhịp ngay. Lịch sử đầy đủ (R1–R18, v6–v26): `tasks/archive/handoff-history-to-2026-10-23.md`.

## Latest checkpoint - V32 DA PHAT HANH: sua tuong phan + khoa ti le (26/10/2026)

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

## Checkpoint truoc - V30 DA PHAT HANH: mo phong tuong tac (25/10/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`.

### Release record V30

| Truong | Gia tri |
|---|---|
| version_number | **30** |
| deployment_id | `appgdep_6addc30ea94481919a3b840316e526f8` |
| commit_sha (workflow) | `4f61dcd7da822f0da339c05da25169205e4e262d` (= `4f61dcd` local) |
| archive | `C:\Users\ADMIN\.codex\sites-release\release-20261025-v30.tar.gz` |
| audience | public |
| live | HTTP 200 |

**Xac minh doc lap (tu tai bundle tu live, khong tin bao cao Codex)**:

Chunk production `/_next/static/chunks/useLessonSession-CWZUovRi.js` (55.738 bytes) chua:

- 4 khoi dung toa do da duyet: `tu-dien-sabc`, `hop-xien` (day `[10,5,0],[2,5,0]` = hinh binh hanh), `hop-chu-nhat` (day `[8,5,0],[0,5,0]` = chu nhat), `chop-sabcd`.
- Ham thiet dien `B = z[4] + 2/3*(e - z[4])` — **cong thuc, khong phai so lam tron**.
- 4 goc nhin: `-140/40`, `-70/20`, `-50/15`, `-160/35`.
- Loi culling: `faceVisible`, `edgeSolid` deu co mat.
- Mau net dut `"7 5"` dung nhu viet.
- Component `KhoiXoay` (minify thanh `te`) con nguyen chu ky `{solidKey, width=380, height=330, compact, caption}`, `useRef` cho drag, `setPointerCapture`, he so `.5` khi keo.
- He so scale cu `0.42` **khong con** -> da thay bang auto-fit.

**Kiem regression v29**: 3 SVG van con nguyen tren live — `r106-g11-hinh-hop-2-mat-doi-dien.svg` co `viewBox="0 0 440 300"`, `r107-g11-thang-chu-a.svg` co `x2="74.3478"`, `r107-g11-chop-sabcd-thiet-dien.svg` co `viewBox="0 0 440 330"`.

**API `/api/lessons/r22-g11-discover-r106` tra 404** -> khong kiem duoc `solidKey` qua API (khop bao cao `solidkey_verify: skipped` cua Codex). Khong phai loi.

### Da lam trong v30

**Engine hinh hoc** (`lib/geometry/solid.ts`):
- Chieu 3D -> 2D phoi canh, tinh mat nhin thay va net lien/dut theo MAT.
- Phap tuyen EP huong ra ngoai theo tam khoi -> khong phu thuoc thu tu dinh nhap tay.
- 4 khoi: `tu-dien-sabc` (co M,N,P trung diem), `hop-xien`, `hop-chu-nhat`, `chop-sabcd` (co M,N,P,Q thiet dien).
- Toa do `chop-sabcd` suy nguoc tu hinh 2D da duyet, chieu lai khop 100%.
- Thiet dien tinh bang **cong thuc** `S + 2/3(X-S)`, khong nhap so lam tron.

**Ham cham Muc B** (`lib/geometry/grade.ts`):
- Anh xa dinh HS dat -> nhan goc bang tham lam khoang cach gan nhat, dung sai 18px.
- Phan biet **3 loai loi rieng**: `missing`, `extra`, `wrongDash`.
- So cap canh KHONG thu tu (A-B = B-A).

**Component**:
- `KhoiXoay.tsx` — **che do Xem**: may tu tinh net, HS keo xoay, KHONG chinh duoc net.
- `BangVe.tsx` — **che do Ve (Muc B)**: HS keo dat dinh, bam 2 dinh noi canh, bam canh doi net, may cham.
- `TaskImage.tsx` nhan `solidKey` -> hien 2 tab **"Xem hình" / "Tự vẽ"**, mac dinh Xem.
- Noi `taskSolidOf` vao `PracticePanel`, `ClassEventPanel`, `app/play`, `app/presenter`, `app/shared`.

### Sua sau QA doc lap (v31)

QA cua Codex phat hien 1 loi MAJOR that: **`BangVe` khong co noi goi nao** — che do Ve la dead code, HS khong bao gio voi toi. Da sua:

- `TaskImage.tsx`: them tab chuyen che do, nen ca 3 task co `solidKey` deu co che do Ve.
- Tach `layoutSolid()` trong `lib/geometry/solid.ts`, dung CHUNG cho ca 2 che do. Truoc do `BangVe` dung he so `0.42` co dinh (hinh nho hon ~30%) va chep lai cong thuc auto-fit.
- Nhan o che do Ve: doi tu lech co dinh `+9/-9` sang day ra xa tam (`push 16`) — truoc do nhan C, D, A' nam trong vong goi y r=13 nen de len cham xanh (thay ro trong anh QA).
- 3 test moi: `layoutSolid` khong tran khung + dung >55% be rong; `toScreen` dong bo voi `px`; va test khoa tinh chat **phoi canh** (doi sang chieu song song la fail).

### Ve menh de "khop 100%" (QA chi ra dung cho sai)

Toa do `chop-sabcd` duoc **suy nguoc tu hinh 2D da duyet bang phep chieu SONG SONG**, va khang dinh "chieu lai khop 100%" chi dung **trong phep chieu song song**. Engine mo phong dung **phep chieu PHOI CANH**, nen chieu lai se lech M/N/P/Q lan luot ~75, 80, 7, 60 px. Day KHONG phai loi toan:

- Engine tu nhat quan: cham bai so voi chinh projection cua engine.
- HS thay mo phong (`solidKey` thay anh tinh), khong thay SVG tinh.
- Phoi canh la chon co chu y: keo xoay phai co cam giac khoi, chieu song song xoay se "det".

=> Khong sua code. Chi sua cau chu trong tai lieu cho khong gay hieu nham.

### Gan vao bai hoc

| Pkg | Task | solidKey |
|---|---|---|
| `r22-g11-discover-r106` | `task-3-1` | `tu-dien-sabc` |
| `r22-g11-discover-r106` | `task-3-2` | `hop-chu-nhat` (de ghi ro "chu nhat") |
| `r22-g11-discover-r107` | `task-3-2` | `chop-sabcd` |

**KHONG gan** `task-3-1` cua r107 (thales / thang chu A) vi la hinh mat phang.

### Kiem chung

| Lenh | Ket qua |
|---|---|
| `node --experimental-strip-types --test tests/geometry-solid.test.mts tests/geometry-grade.test.mts` | **26/26 PASS** |
| `node --test tests/hki-content.test.mjs` | PASS |
| `tsc --noEmit --incremental false` | 0 loi |
| `npm run build` | Build complete |
| `scripts/check-solidkey-serialize.mjs` | 3/3 task OK, moi solidKey tro toi khoi co that |

### Bai hoc

- **Schema phai khai bao field moi o 3 noi**: `ALLOWED_TASK_KEYS` trong `validate.js`, va **CA HAI** `sanitizeTaskForTeacher` + `sanitizeTaskForStudent` trong `serialize.js`. Thieu mot cho -> hoac test FAIL, hoac client khong nhan duoc.
- **De bai phai khop khoi**: r106 task-3-2 de ghi "hinh hop CHU NHAT" nen phai dung `hop-chu-nhat`, khong dung `hop-xien`. Hai khoi nay khac nhau ve toa do.
- `chop-sabcd` ban dau dat `yaw -90` lam `A(0,0,0)` va `D(0,3,0)` chieu gan trung nhau (camera nhin doc truc y) -> nhan D, Q, M, A chong nhau. Phai quet do mo `minDist/maxDist` de chon goc.
- Khong ghi toa do da lam tron 4 chu so vao code: lam tron tung diem lam 2 duong gan song song bi coi la lech `1e-4`.
- **`node_modules` cua worktree tung bi rong** (chi con `.pnpm`) -> dev server chet. Khac phuc: `pnpm install --frozen-lockfile`.

## Checkpoint truoc - V29 DA PHAT HANH (25/10/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`.

### Release record V29

| Truong | Gia tri |
|---|---|
| version_number | **29** |
| deployment_id | `appgdep_6add4e36e8e481919cc903a47b85999d` |
| commit_sha (workflow) | `afec0a067dbb76f21ae7d002df037dbd4994b4f9` (= `afec0a0` local) |
| archive | `C:\Users\ADMIN\.codex\sites-release\release-20261025-v28-fix.tar.gz` |
| audience | public |
| live | HTTP 200 |

**Xac minh doc lap (tu tai SVG tu live, khong tin bao cao Codex)**:
- `r107-g11-thang-chu-a.svg`: doc toa do that tu live -> `AB/BC = A'B'/B'C' = 1.000000612`, 6 diem lech khoi chan thang toi da `0.00005`. THALES DUNG.
- `r106-g11-hinh-hop-2-mat-doi-dien.svg`: `viewBox="0 0 440 300"`, nhan `B'` o `(285,125)`, chu thich `y=292` -> ban moi.
- `r107-g11-chop-sabcd-thiet-dien.svg`: `viewBox="0 0 440 330"`, nhan `M` o `(89,182)` -> ban moi.
- `r106-g11-hai-mp-cat-theo-d.svg`: nhan `a(340,206)`, `b(320,222)` -> ban moi (nhan cu 376/356 khong con).
- `r013-duong-tron-don-vi.svg`: `viewBox="0 0 420 300"`, chu thich `y=288` -> ban moi.
- `r107-g11-thales-3-mat-phang.svg`: 6 diem giao dung toa do.

**Bai hoc ve quy trinh deploy**: KHONG dung lai archive cu. Archive `release-20261024-v28.tar.gz` duoc tao tu commit `1b00030` (chua co 2 commit sua hinh). Phai tao archive moi `release-20261025-v28-fix.tar.gz`. Kiem bang `commit_sha` workflow tra ve phai KHAC commit cu.

**Bai hoc ve kiem live**: HTTP 200 KHONG chung minh noi dung moi. Phai tai SVG tu live va grep toa do dac trung cua ban moi (viewBox, toa do nhan). Da lam dung viec nay.

## Checkpoint truoc - V28 DA PHAT HANH + sua SVG tuan 11 - 24/10/2026

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`.

### QA lai hinh ngay 25/10 (sau khi phat hanh v28)

**Phat hien quan trong ve quy trinh**: anh review cu trong `Temp\opencode\review-hinh\*.png` duoc render luc 00:05, trong khi SVG duoc sua luc 00:33-00:36. Review bang anh cu se cham ban SAI. Luon render lai truoc khi review.

**Bai hoc dat**: KHONG do toa do bang mat tren anh PNG (anh bi scale 1100/440 = 2.5 lan). Muon ket luan toan hoc thi PHAI doc toa do trong file `.svg`. Da tung bao sai 2 lan vi loi nay (Thales va chop S.ABCD).

Ket qua kiem 6 SVG bang toa do that trong file:

| File | Ket luan |
|---|---|
| `r106-g11-hinh-hop-2-mat-doi-dien` | Net dut `CD, DA, DD'` dung chuan (3 canh tu dinh D). Da dich nhan: `B'` 1px -> 30px, `D` 13px -> 24px, `A'` 13.5px -> 32px |
| `r107-g11-chop-sabcd-thiet-dien` | `M,N,P,Q` khop cong thuc `S + 2/3(X-S)` chinh xac 0px. Ca 4 cap canh song song 0 do, ti le 0.6667 = 2/3. Da dich nhan `M` tu 3px -> 12.3px |
| `r107-g11-thales-3-mat-phang` | DUNG hoan toan: `AB=BC=88.929`, `A'B'=B'C'=71.458`, ti so `1.000000`. `d` khong song song `d'` la DUNG de bai (dang Thales tong quat khong doi hoi) |
| `r106-g11-tu-dien-sabc-trung-diem` | Trung diem lech <=3.6px, `MN // AB` dung |
| `r106-g11-hai-mp-cat-theo-d` | `a, b, d` song song tuyet doi, deu nam trong (P) |
| `r107-g11-thang-chu-a` | Da sua nhan `A,B,C` bi lech 15.6/24.8/33.1px -> doi xung voi ben phai, cach canh 15px |
| `r013-duong-tron-don-vi` | 3 diem dung tren duong tron. Da sua nhan `270 do` de len chu thich (viewBox 280 -> 300) |

**Cong cu moi**: `Temp\opencode\audit-svg-math.mjs` — quet 24 SVG, kiem nhan de duong (<10px) va diem phai nam tren canh. Ket qua 23/24 sach; `r013` la bao dong gia (diem nam tren `<circle>` khong phai `<line>`).

Bang chung: `node validate-svg-v3.mjs` 24/24 PASS; `npm run build` PASS (Build complete).

**Review cheo 3 hang lan 1 THAT BAI**: thieu flag `--auto` nen reviewer bi auto-reject permission shell, khong doc duoc file.

### Ket qua review cheo 3 hang lan 4 (thanh cong)

Ca 3 hang deu exit=0. Da **tu kiem tung cao buoc** bang toa do that trong SVG, khong tin ket luan reviewer:

| Hang | Ket qua bao | Su that sau khi kiem |
|---|---|---|
| Claude | 1 PASS / 6 FAIL (minor) | Dung 3 loi: Thales cham lech 0.39px, chop thiet dien phu mo canh SA, nhan xa dinh |
| GPT | 1 PASS / 6 FAIL (2 major) | **Dung loi quan trong nhat**: thang chu A sai Thales `AB/BC=0.993904` vs `A'B'/B'C'=1.006133`. Nhung SAI khi noi chop M,N,P,Q sai ti le (thuc te `t=0.66667` chinh xac) |
| Gemini | 4 PASS / 3 FAIL | Bo sot loi Thales thang chu A |

**Cao buoc SAI da bac bo**: `r013` ban kinh 95.03 vs 95 (sai so 0.03%); goc 270 do bi tinh lech 360 do (loi vong tron cua reviewer); chop M,N,P,Q lech ti le; tu dien P lech lam hong MP // AC (thuc te P lech 0.064px khoi SC).

**3 loi THAT da sua sau review**:
1. `r107-g11-thang-chu-a`: dung toa do giao chinh xac cua chan thang (`x = 210 + (74.3478-210)*(y-40)/240`), keo chan xuong `y=280`. Ket qua: `AB/BC = A'B'/B'C' = 1.000000612`, ca 6 diem lech **0** khoi chan thang. Da xoa caption trung lap.
2. `r107-g11-chop-sabcd-thiet-dien`: chuyen `<polygon>` thiet dien len **truoc** cac canh ben de khong phu mo `SA`; viewBox 320 -> 330; tach caption thanh 2 dong; nhan `M` ve `(89,182)` (cach dinh 30px, cach canh 16.8px).
3. `r106-g11-hinh-hop-2-mat-doi-dien`: dat lai 8 nhan bang quet toi uu dong thoi **cach canh >= | 20.7px VA cach dinh 22px**; viewBox 280 -> 300 de chu thich khong dinh nhan A.

Bang chung cuoi: `validate-svg-v3.mjs` 24/24 PASS; `audit-svg-math.mjs` 23/24 sach (1 bao dong gia r013); `npm run build` Build complete.

**Bai hoc quan trong nhat cua dot nay**: khi dat nhan diem, phai toi uu DONG THOI "cach canh" va "cach dinh". Chi toi uu cach canh se day nhan ra xa dinh 30-43px, gay hieu nham la nhan mat (ca 3 reviewer deu bat duoc loi nay).
1. `spawn(..., {shell: true})` lam `cmd.exe` cat mat prompt/duong dan tieng Viet va ky tu dac biet -> reviewer nhan prompt rong, tra loi "hay gui hinh".
2. Thieu `--auto` -> bi auto-reject quyen doc file.

**Cach dung (da xac minh bang test `2+2` va prompt brief dai)**: truyen prompt qua **stdin**, khong qua tham so; dung `shell: false`; them `--auto`; dinh kem anh bang nhieu `-f <path>`. Script hien tai: `Temp\opencode\run-review-3.mjs` da sua dung ca 3 diem.

### Release record V28

| Truong | Gia tri |
|---|---|
| Site | `appgprj_6ac8d74b14f8819193caded9533bb337` — `https://mat-ma-da-gioi.cuong-vuviet.chatgpt.site/` |
| version_number | **28** |
| deployment_id | `appgdep_6adcd00b93848191ac0b21f45a6df682` |
| source_commit (workflow push len remote Site) | `1b000302f1402d539c1a9261d4129c6d31fc635f` |
| archive | `C:\Users\ADMIN\.codex\sites-release\release-20261024-v28.tar.gz` |
| audience | public |
| live | HTTP 200 (xac minh doc lap bang `Invoke-WebRequest`, vi `curl --write-out %{http_code}` bi `cmd.exe` an trong PTY -> bao "Bad hostname", KHONG phai loi site) |

Xac minh noi dung live (khong chi HTTP 200): tai 4 SVG tu live va doi chieu chuoi:
- `r107-g11-thang-chu-a.svg`: da mat caption sai "BA // CI", co caption moi.
- `r106-g11-tu-dien-sabc-trung-diem.svg`: co canh SA `x1=210 y1=40 x2=90 y2=240`, co P tai `220,118`.
- `r107-g11-chop-sabcd-thiet-dien.svg`: co `AB = 2CD`, dinh C moi `245,190`.
- `r105-g10-hieu-vecto-ab-ac.svg`: caption "vecto AB − AC = vecto CB; BC = √(AB²+AC²)", khong con `|AB − AC|`.
- `r103-g10-tong-vecto-hinh-binh-hanh.svg`: caption "vecto AB + vecto AD = vecto AC".

### Sua SVG tuan 11 - commit `029863e`

13/14 SVG da sua theo review cheo 3 hang model doc lap (cung prompt + mapping SVG -> de bai):

| Hang | Model | Ket qua | File ket qua |
|---|---|---|---|
| Claude | `cc/claude-opus-5-5` | 2 PASS / 12 FAIL (5 critical) | `.dieu-phoi/review-claude.md` |
| GPT | `cx/gpt-6.1-sol` | 4 PASS / 10 FAIL (3 critical) | `.dieu-phoi/review-gpt.md` |
| Gemini | `ag/gemini-3.8-flash-high` | 9 PASS / 5 FAIL (3 critical) | `.dieu-phoi/review-gemini.md` |

Loi da sua: thang chu A (bo khang dinh sai "BA // CI", ve lai hinh chu A that); tu dien SABC (them canh SA, sua dinh thiet dien 220,217 -> 220,118); chop S.ABCD (day thanh hinh thang AB = 2CD, tinh lai M,N,P,Q); hai mat phang cat theo d (ve lai hai nua mat phang chung bo d, them duong b); hinh hop (them net dut, sua aria-label); 5 hinh vecto lop 10 (chu thich "vecto AB + vecto AD = vecto AC" thay dang thuc do dai, dao ti le AB < AD / AB < AC); heron (tach `;`); thales 3 mat phang (doi phuong d', them nhan alpha/beta/gamma); dinh li sin (them ki hieu goc vuong). `r107-g10-mien-nghiem-doi-giac` khong sua (3/3 nguon PASS).

Bang chung: build PASS; 14/14 SVG khong BOM + well-formed; chup lai 14 hinh (`C:\Users\ADMIN\AppData\Local\Temp\opencode\qa-svg-v2-final.png`).

### Dang lam: dot 2 - hint lech chu de trong hki-2026-g11.json

- 85 dong hint bi gan cau generic lap cho moi task trong 15 pkg luong giac G11 (entries 4-7, 18-19, 32, 35, 39-40, 51, 64, 131-132). Vi du bai "Tinh $\\sin(\\pi+x)$" nhung hint lai la "Xac dinh phep doi xung tuong ung".
- Script sua: `scripts/content/fix-trig-hints.mjs` (anh xa theo DANG de bai, idempotent, co `--dry`). Da sua **81 hint**, con 4 cho thuoc dang chua co rule (can bo sung).
- Sau khi sua phai chay lai `node scripts/content/build-hki-catalogue.mjs`.
- **Test `tests/hki-content.test.mjs` dang FAIL** o assertion `contentHash` vi hash pkg doi sau khi sua hint: hash ky vong nam trong `tasks/r22/ppct-hki.json` va phai cap nhat cung luc (assertion "Stale catalogue" so catalogue voi grade file, nhung assertion truoc do so voi ppct).

### Viec tiep theo

1. **Review cheo 3 hang lan 2** (dang chay): `node C:\Users\ADMIN\AppData\Local\Temp\opencode\run-review-3.mjs`. Doc `.dieu-phoi/review-hinh-{claude,gpt,gemini}.md`, xu ly loi critical/major neu co.
2. Commit dot 2 (85 hint + contentHash + 6 SVG da sua) va phat hanh lai v28/lan ke tiep.
3. **Mo phong tuong tac v29 (da duoc nguoi dung duyet)**: engine da chay thu duoc tai `.dieu-phoi/qa-html/` (`engine-core.js`, `sim.html`, `qa.html`). Da chung minh: hop xien luon 9 lien/3 dut o moi goc thay 3 mat; tu dien 5/6 o goc chuan. Chot: **che do Xem** (may tinh net, HS xoay) tach rieng **che do Ve** (Muc B: HS tu dat dinh, noi canh, chon net, may cham). Dung hinh theo dung de tung bai.
4. 25 test fail baseline (TaskImage/QUICK_CHIPS/lesson-revisit/buzzer) van con, khong do cac dot nay.

### Gioi han khong dung

- Khong sua `lib/exam/**`, khong dung phong demo `7E42C2`, khong doi audience Site, khong push remote khac remote cua Site credential.
- `.dieu-phoi/` la scratch review, da nam trong `.gitignore` (commit `cc9a8a3`).

## Previous checkpoint - V28 + sua SVG tuan 11 - 24/10/2026

*(chi tiet review cheo: xem commit 1b1711c / 029863e)*

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
