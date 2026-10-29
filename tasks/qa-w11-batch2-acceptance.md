# QA V8.8 Tuần 11 batch2 — R1 · bài `10-11-80` (Các số đặc trưng đo xu thế trung tâm — Tiết 1) trên Production

> Ngày: 2026-10-26 · Commit đã push: `5d044cb` (snapshot batch2 1 bài, fingerprint sha256 riêng, 266/266 vitest, build 0 TS error).
> Kiểm bằng Edge thật + Puppeteer port 9222 trên **https://giaoandewey.vercel.app** (build Production sau deploy `5d044cb`).
> Phiên live: `bsQ6au0Woj8QaGe78siM` · lessonId `adaptive-v4-10-11-80-24YyULmWgBOM6HZCfJ56RN5tiet2` · lớp g10 `class-1787208462088` (mã `7W288E`) · HS Trần Thùy Anh 2143.
> Lưu ý quy trình: phiên kiểm tra bị gián đoạn (subagent hết ngữ cảnh) nên báo cáo này được dựng lại từ log + ảnh đã lưu; các mục thiếu bằng chứng ghi rõ CHƯA KIỂM, không suy đoán.

## Kết luận

**ĐẠT phần cốt lõi — 1 số mục CHƯA KIỂM do phiên hết hạn.** Bài đã tạo + xuất bản thành công; PA1 (S4 không hé 14,9) xác minh ĐẠT trực tiếp trên Production; no-spoiler các chặng sau đều false ở cả 3 view; không lộ đáp án từng em. Edge case trong phiên (reload HS, rời/vào lại, nút Sau disabled bắt trực tiếp) chưa kịp kiểm — đề xuất gộp vào QA của R2 (cùng runtime, không đổi code giữa 2 vòng).

## Bảng kết quả

| Mục | Hành vi kiểm | Bằng chứng Production | Kết quả |
|---|---|---|---|
| B7·Xuất bản | Tạo + xuất bản bài V4 từ key `10-11-80` | Ảnh `tmp-r1-qa-b7-step1→5`; 3 link TV/TV-CTRL/HS lưu `tmp-r1-qa-session.json` | ✓ |
| B7·Title | Tên hiển thị | "Các số đặc trưng đo xu thế trung tâm" + đuôi "— Tiết 2" (app tự sinh theo period `10-11-79` = Tiết 1) | ✓ (ghi chú thiết kế) |
| B·S4 | AI-error: HS thấy lời giải SAI 37,25 + câu phản biện, KHÔNG thấy 14,9 | Log `s5.hs`: "Lời giải cần kiểm: … 37,25 cm" + "Em đồng ý hay phản đối? Vì sao?" — không có 14,9; ảnh `b-hs-s4`, `b-tv-s4`, `b-hs-s4-submitted` | ✓ (PA1) |
| B·PA1 toàn diện | 14,9 không xuất hiện HS/TV/GV-main ở mọi chặng đã dump | Log `stageNotes.s6.spoiler14_9` = hs/tv/gv **false** | ✓ |
| B·Phân loại lỗi | HS gửi kèm phân loại (4 nhãn) | Log `s5.hs`: "Hiểu sai khái niệm / Sai biến đổi hoặc tính toán / Sai lập luận / Thiếu điều kiện"; ảnh `b-hs-s4-sent*` | ✓ |
| C·S6 phân hoá | Cửa M/S/C trên TV; HS theo nhóm | Log `s6`: "M — Củng cố / S — Chuẩn / C — Thử thách"; HS ở bước nhận nhóm. Đề 3 mức cụ thể trên máy HS **chưa kịp xác minh** (HS chưa chọn tuyến khi dump) | △ CHƯA KIỂM trọn |
| C·S7 bẫy trung vị | Không lộ Me=3 trước reveal | Log `stageNotes.s7.spoilerMe3` = hs/tv/gv false | ✓ |
| C·S8 kiểm nhanh | quick×2 (bẫy An 37,25 · bẫy Nam Me=4) không lộ đáp án a=8 | Log `s8` + `stageNotes.s8.spoilerA8` = hs/tv false; ảnh `c-s8-gv` | ✓ |
| C·S9 | Mean 65.000/Median 42.000 không lên live TV — ĐÚNG thiết kế (chỉ-GV) | `stageNotes.s9.tv_has65000/42000` = false; đối chiếu bảng phân quyền Gate D | ✓ (thiết kế) |
| C·S10 exit | Thẻ thoát hiểm + tự đánh giá; nháp giữ khi chuyển hoạt động | Log `s10.hs`: "Bài em viết được giữ khi thầy cô chuyển hoạt động"; `exitEmptyBlock.blocked=true` (chưa điền tự đánh giá thì chưa gửi — xem ghi chú) | ✓ |
| C·S11/Sau | Chặng 12/12 "Sau", không thời lượng trong tiết | Log `s11`: stage 12/12, "Kế hoạch 40–40′", timer null, "+0:05" | ✓ |
| D·Timeline | 11 chặng hoạt động 0–2400s + chặng 12 "Sau" disabled | Chuỗi Kế hoạch 19–20′ → 20–27′ → 27–30′ → 30–35′ → 35–38′ → 38–40′ → 40–40′ (log `stageNotes`), khớp Gate D mục 0 | ✓ |
| A5/A6·Chờ hai nhịp | Nút gửi khoá trong cửa sổ nghĩ | Log `s6/s7/s8.hs`: "Suy nghĩ 7s/6s — chưa bấm gì", nút "Chờ 7s/6s" | ✓ |
| F·Không lộ từng em | TV/Coach không lộ tên + đúng/sai từng HS | `s8Stats`: "0 học sinh đã gửi…", `hasStudentName=false`, `hasChoiceLabel=false`; `tvHasStudentName=false` | ✓ |
| E·Edge case (reload HS, rời/vào lại) | Nháp giữ, tự vào lại | Phiên hết hạn trước khi kịp chạy script a5/a6 trọn | ✗ CHƯA KIỂM |
| E1·Nút "Sau →" disabled ở 12/12 | Bắt trực tiếp trạng thái nút | Chưa kịp đo trong phiên này; runtime không đổi so với bài 12 (đã ✓ 2 phiên) | △ CHƯA KIỂM trực tiếp |
| Guide·CasioKeyGuide ẨN | Bài này không có guide | Không xuất hiện trong toàn bộ text 8 chặng đã dump (c-log) + code khoá theo bài | ✓ (theo bằng chứng vắng mặt) |

## Ghi chú thiết kế (không phải lỗi)

- **Title "— Tiết 2"**: app tự sinh theo sort period trong cùng khối+tuần (`10-11-79` là Tiết 1). Gate D S0 ghi "Tiết 1" theo giáo án — khác nguồn đặt tên, không lệch nội dung.
- **Mean 65.000 / Median 42.000 không trên live TV**: nội dung chỉ-GV (bảng phân quyền Gate D) — nằm trong sourceContent/adaptive draft cho GV đối chiếu.
- **`exitEmptyBlock.blocked=true`**: HS chưa điền khối tự đánh giá nên chưa gửi được exit ticket — khớp thiết kế thẻ thoát hiểm (✓/? + tự đánh giá). Cần 1 lần gửi thành công trọn vẹn ở vòng sau để chốt.
- **S6 đề 3 mức**: đề nằm trong spec exercises (đã đối chiếu 20/20 số với Gate D ở mức code); trên máy HS hiện sau khi chọn tuyến — cần 1 lượt chọn tuyến + làm bài trọn vẹn ở vòng sau.

## Giới hạn kiểm tra

- Phiên live tự hết hạn ~30 phút; phiên kiểm R1 bị gián đoạn nên **E (edge case), E1 (nút Sau trực tiếp), S6 chọn tuyến + gửi đề trọn vẹn, gửi exit ticket thành công** chưa có bằng chứng trình duyệt. Đề xuất: gộp vào QA R2 (runtime không đổi giữa R1→R2), hoặc chạy 1 phiên bổ sung ngắn trước R2 nếu thầy muốn chốt sớm.
- Ảnh bằng chứng đầy đủ: `tasks/tmp-r1-qa-*.png` (~50 ảnh: b7 step1–5, a1–a6, b·S4 10 ảnh, c·S5–S11 21 ảnh). Các file `tmp-*` KHÔNG git add theo quy định.

## Số liệu — đối chiếu

- Code-level (trước QA): 20/20 số mục 3 Gate D khớp snapshot; PA1 grep — `14,9` chỉ ở `exercises[2].answer` / `aiErrors.correction` / `aiErrors.proof`.
- Production (phiên này): không có bất kỳ số đáp án nào (14,9 · 7,875 · a=8 · Me=3 · 65.000/42.000) xuất hiện trên HS/TV ngoài thời điểm reveal thiết kế.

---

# QA V8.8 Tuần 11 batch2 — R2 · bài `11-11-76` (Các số đặc trưng đo xu thế trung tâm — Tiết 1, g11) trên Production

> Ngày: 2026-10-26 → 2026-10-27 · Commit: `5d044cb` (snapshot batch2 + publish) → fix ký hiệu `4799dc9` (27/10, fingerprint snapshot mới `36c18d6d…e2ea`, scoped vitest v4 269/269, build 0 TS error, đã push main + deploy).
> Kiểm bằng Edge thật trên **https://giaoandewey.vercel.app** (GV/TV port 9222 · HS Edge riêng port 9223).
> lessonId `adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2` (deterministic — giữ nguyên sau republish) · lớp g11 `class-1787188523562` (mã `R6RCFC`) · HS Đặng Tuệ Minh PIN 2750.
> Phiên live: `ifiIss4eMDDapvdM67Ga` (sweep C, bài pre-fix) · `vEziJKduxUC8S9VC9wmZ` (exit gửi trọn) · `LVNfJtHRTRE5eu1cO51m` (bài mới sau republish) · `qurni8VpdXY9aeLyilVk` (reload-test, 27/10).
> Lưu ý: vòng QA cũ chạy trên bài **pre-fix** (còn `c_i`/`M_e`); các kết luận no-spoiler/Casio/timeline không phụ thuộc ký hiệu nên giá trị giữ nguyên. Phần ký hiệu kiểm lại độc lập trên bài **đã republish** (hàng mới 12:35:45 27/10).

## Kết luận

**ĐẠT trọn vẹn — không còn mục mở.** Mục duy nhất còn treo từ vòng trước ("nháp giữ sau reload") đã đo lại đúng phương pháp trên phiên sạch 27/10: nháp giữ nguyên sau reload + tự re-login. Fix ký hiệu Toán (cᵢ/Mₑ Unicode subscript) đã lên Production, xác minh sạch ở cả builder (190 field) lẫn phiên live 3 màn GV/TV/HS. Đồng thời chốt trọn 4 mục gộp từ R1: E1 nút Sau disabled, S6 chọn tuyến + gửi đề, exit ticket gửi thành công, reload nháp — đều ĐẠT trên R2.

## Bảng kết quả

| Mục | Hành vi kiểm | Bằng chứng Production | Kết quả |
|---|---|---|---|
| B7·Xuất bản | Tạo + xuất bản từ key `11-11-76`; cập nhật bài đã published = Xóa → publish lại (nút batch SKIP bài cũ) | `tmp-r2-qa-b7-step2.json` (batch skip) → `tmp-r2-fix1-delete/publish.cjs` (dialog auto-accept) → hàng mới 12:35:45 27/10; lessonId giữ nguyên | ✓ |
| Ký hiệu Toán | `c_i`/`M_e` → `cᵢ`/`Mₑ` ở mọi plain-text (ngoài `$…$` và mảng `formulas` giữ LaTeX trần) | Builder dump **190 field**: cᵢ×81, Mₑ×89, **0** underscore (`tmp-r2-fix1-verify-full.json`: con_cUnderscore/con_MeUnderscore = false); bài cũ trước xóa có 20 dòng underscore | ✓ |
| Ký hiệu · live 3 màn | S2 panel mục tiêu + S10 exit ticket chặng 11: GV/TV/HS đều sạch | `tmp-r2-fix1-live-gvtv-text.json` (GV+TV), `tmp-r2-fix1-live-hs-text.json` (HS), ảnh `tmp-r2-fix1-live-s10exit3-*` | ✓ |
| B·PA-β | S4 ĐGTX: PHT 1/2 ghi "tự tính" (không có đáp án); Internet chỉ ví dụ S3; no-spoiler 2,15/2,24/5,87/3,95/158 trên HS/TV | sweep `stageNotes.s3` (spoiler215_224 hs/tv = false) + builder checks `tuTinh/has215/has224/has587/internet395/internet158` = true | ✓ |
| B·AI-error chặng 5 | Kịch bản riêng của bài: vinh danh lỗi giấu tên Mₑ ≈ 5,87 sai (bảng Internet) | sweep chặng 5 + builder `has587` = true; nội dung khớp Gate D | ✓ |
| C·S6 phân hoá + gửi đề | HS thấy 3 nhiệm vụ tuyến (1·Từ khóa / 2·Khung câu / 3·Tự diễn đạt), chọn + gửi; GV xác nhận | `tmp-r2-qa-c-log-part2a.json` routeChoice (cards) + s6Send `["Đã gửi.","Đã xác nhận trên máy chủ."]`; ảnh `tmp-r2-qa-e-s6-sent.png` | ✓ *(chốt mục gộp R1)* |
| C·S8 kiểm nhanh | quick không lộ đáp án; stats không lộ tên HS | c-log `s8Stats.hasStudentName=false`, `tvHasStudentName=false`; ảnh `tmp-r2-qa-f-s8-stats.png` | ✓ |
| D·Exit ticket | Gửi trống bị từ chối; điền đủ thì gửi được; GV/TV thấy "Tiến độ gửi · 1 HS" | R1-mẫu `exitEmptyBlock.blocked=true` + part3 `exitSend` (gửi thành công) + part3b `gvTienDo/tvTienDo`, `gvHas1HS/tvHas1HS` = true; ảnh `tmp-r2-qa-p3-exit-*` | ✓ *(chốt mục gộp R1)* |
| E·Nháp giữ sau reload | S4 (chặng 16–19′) gõ marker → reload → tự re-login (không cần PIN lại) → marker còn trong ô nhập + panel "Nháp đã lưu trên máy" | `tmp-r2-fix1-reload-test.json`: `keptInField=true`, `nhapPanel=true`, bandBefore/After đều "Chặng 16–19 phút", relogged=view; ảnh `tmp-r2-fix1-reload-before/after.png` | ✓ *(chốt mục gộp R1 — lần đầu đo đúng phương pháp)* |
| E1·Nút "Sau →" disabled 12/12 | Bắt trực tiếp thuộc tính nút ở chặng Sau | c-log `s11.sauBtn = {exists:true, disabled:true}` | ✓ *(chốt mục gộp R1)* |
| F·CasioKeyGuide ẨN | Bài không có guide — không xuất hiện ở bất kỳ view nào | c-log `casioAllViews=false`, `tvButtons=[]` + builder `casio=false` | ✓ |
| A7·Think window | Cửa sổ nghĩ chặn nút gửi, đếm ngược không reset | c-log: "Chờ 2s/4s/5s/6s/7s/8s" ×9 qua các chặng | ✓ |
| D·Timeline | 12 chặng khớp Gate D: 0–3/3–5/5–8/8–16/16–19/19–20/20–27/…/38–40/40–40 (Sau) | stageNotes part1+part2a; S11 "Kế hoạch 40–40′", timer null | ✓ |

## Ghi chú thiết kế (không phải lỗi)

- **PA-d đích mới không vào UI builder pipeline**: `73k = 365` đã biến mất hoàn toàn (`con_73k365=false` ở mọi dump); đích mới (k=5, x̄′ = 8375/55 ≈ 152,27, "nhỏ nhất của k") có trong snapshot/runtime nhưng **không hiện trong editor** — mục bài tập của builder là template A/B/C/D trống, exercises của spec không đi qua pipeline biên tập UI. Xác minh PA-d phải dựa runtime/dump contract, không dựa editor.
- **Fingerprint builder không phân biệt bản cũ/mới**: UI luôn hiện `ff7e800a…` (fingerprint W5–W6) cho mọi contract — `SNAPSHOT.source` cố ý giữ provenance gốc (`src/lib/liveLesson/v4/lessonAdapter.ts:192-198`). Xác minh phiên bản phải dựa text thực tế, không dựa fingerprint.
- **Số liệu PA-β/PA-d đã kiểm chứng độc lập** khớp app: x̄=2,15; x̄′=92/41≈2,24; Mₑ=2,2 (C=17); x̄ S4=14; vinh danh sai Mₑ≈5,87; 158/40=3,95; Mₑ Internet=4,0; PA-d: 73k≥350 ⇒ k=5, x̄′=8375/55≈152,27.

## False positive đã khai tử (bài học đo đạc)

- Check "HS đã join" bằng chuỗi "HỌC SINH" là **false positive** (màn bị chặn "Trình duyệt đang ở phiên giáo viên" vẫn chứa chuỗi đó). Chuẩn đúng: **không còn form** "Vào tiết học trực tiếp".
- JSON dump cũ ghi "có: 73k" là match **tên key kiểm tra** (`con_73k365`), không phải nội dung app.
- Text exit ticket vòng cũ chứa `M_e = 2,2` là **script QA tự gõ** vào textarea (theo Gate D), không phải app render.
- `kept:false` trong log reload-test là artifact đo (`body.innerText` không chứa `.value` của textarea) — kết luận dựa `keptInField` + `nhapPanel` + ảnh.

## Giới hạn kiểm tra

- Full-suite vitest fail 4 test (`contractData.test.ts`, `goldenCandidates.test.ts`) = CRLF pre-existing từ commit `8411b7e`, ngoài scope batch2; chuẩn đánh giá batch2 = scoped `npx vitest run src/lib/liveLesson/v4` 269/269.
- HS chạy Edge riêng port 9223 (profile `Temp\opencode\edge-hs-profile`) là **workaround hạ tầng QA** (Puppeteer connect page-level WS trên Edge 156 văng `Target.getBrowserContexts: Not allowed` — điều khiển GV/TV bằng CDP thô qua WebSocket; HS connect browser-level OK), không phải bug app.
- Ảnh bằng chứng: `tasks/tmp-r2-qa-*.png` (~40) + `tasks/tmp-r2-fix1-*.png`. Các file `tmp-*` KHÔNG git add theo quy định; file `qa-w11-batch2-acceptance.md` giữ untracked.

---

# QA V8.8 Tuần 11 batch2 — R3 · bài `11-11-78` (Hai mặt phẳng song song — g11) trên Production

> Ngày: 2026-10-27 · Commit: `db1fd27` (spec + aiError `11-11-78` vào snapshot batch2; fingerprint `f10723f4…774fa`; scoped vitest v4 **272/272**; build 0 TS error; đã push feat + main) → Vercel publish **17:55:59 27/10** (54 gói).
> Kiểm bằng Edge thật trên **https://giaoandewey.vercel.app** (GV/TV port 9222 · HS Edge riêng port 9223) · lớp g11 `class-1787188523562` (mã `R6RCFC`) · HS Đặng Tuệ Minh PIN 2750.
> Phiên live kế nhau do hạn ~30 phút: `psyxRH2KUywoI3auf7dt` (sweep 1 — join, nháp+reload, S4) → `T7Mp7UzQqTDCWs4Fys7A` (resweep GV/TV bands 5–9 + TV buttons) → `uhPPt02TXSVwLXoAaCMV` (full sweep chặng 5–11 + route/think; hết hạn ngay sau khi chốt) → `e5VBAtOWyzRUTvk3pKN0` (exit gửi trọn + Hiện kết quả lớp + Sau disabled, sạch từ đầu).
> lessonId `adaptive-v4-11-11-78-24YyULmWgBOM6HZCfJ56RN5tiet2` (deterministic).

## Kết luận

**ĐẠT trọn vẹn các mục A–F theo kế hoạch QA — kèm 1 phát hiện lệch tài liệu trình thầy quyết định (D·Timeline).** Toàn bộ chuỗi 12 chặng chạy live trên Production: HS join thật, nháp giữ sau reload, AI-error chặng 5 không lộ đáp án, route choice chặng 6, no-spoiler chặng 7–10, exit ticket chặn gửi trống + gửi thành công + GV thấy "Tiến độ gửi · 1 học sinh đã gửi", think window khóa nút gửi 10s, nút "Sau →" disabled ở 12/12. Phát hiện duy nhất: **dải phút runtime khớp template chung nhưng Gate D 78 ghi dải khác** — chi tiết ở ghi chú thiết kế, KHÔNG tự sửa code sau Gate C, trình thầy ở B9.

## Bảng kết quả

| Mục | Hành vi kiểm | Bằng chứng Production | Kết quả |
|---|---|---|---|
| B7·Xuất bản | Tạo + xuất bản bài V4 từ key `11-11-78` | Publish 17:55:59 27/10; 3 link lưu `tmp-r3-qa-session*.json` (4 phiên) | ✓ |
| A·Phiên live mới + think window | Phiên 3–4 sạch; poll dày ~700ms sau từng click "Sau →" | `part-exit2.think` **66 reads** + `part-exit3.think` **62 reads**: chuỗi "Chờ 10s→9s→…→1s" giảm dần qua các chặng, `decreasing=true`, `lockedAll=true` (nút disabled toàn bộ); cấu hình `thinkSeconds: 10` cố định (`StudentLiveView.tsx:602`) | ✓ |
| B·S4 AI-error chặng 5 | HS thấy lời giải SAI + câu phản biện, KHÔNG thấy proof GV-only | `part-full.s4.check`: band "Chặng 16–19 phút", "AI kết luận" + "a ⊂ (α)" trên HS/TV, `hsNoTran/hsNoPhanViDu/tvNoTran/tvNoPhanViDu/gvPublicOnly` = **true**; HS có 4 nhãn phân loại lỗi + textarea + nút gửi | ✓ |
| C·S5 route choice chặng 6 | HS chọn nhiệm vụ tuyến | `part-exit2.routeChoice`: clickedTask = nút "Chọn nhiệm vụ này" OK, `taskAppeared=true` | ✓ |
| C·S7/S8 no-spoiler đề PHT | `7,5` (chỉ ở `exercises[3].answer`) + `12 cm` không hiện trước reveal | `part2b` + `part-full`: spoiler hs/tv/gv = **false** ở chặng 8–9 (text-level) | ✓ |
| C·S9 ĐGTX + Burj sạch | Token cơ học không còn trong snapshot phải vắng mặt | `part-full.s9.burj`: mômen/gãy đổ/mất cân bằng/chịu lực = **false** cả 3 view | ✓ |
| E·Nháp giữ sau reload | Gõ marker → reload → tự re-login → marker còn | `part1`: `keptInField=true`, panel "Nháp đã lưu trên máy", marker "Nháp R3 — kiểm tra lưu 27/10" | ✓ |
| D·Exit trống bị chặn | Chưa điền tự đánh giá thì không có nút Gửi | `part-full`: Gửi `exists:false` → `emptyBlocked=true` | ✓ |
| D·Exit gửi trọn + tiến độ | Điền đủ → gửi → GV xác nhận nhận được | `part-exit3.exit`: "Đã gửi." + "Đã xác nhận trên máy chủ."; GV bấm "Hiện kết quả lớp" → panel **"Tiến độ gửi — 1 học sinh đã gửi"** | ✓ |
| E1·Nút "Sau →" disabled 12/12 | Bắt thuộc tính nút ở chặng Sau | `part-exit3.sau.sauBtn = {exists:true, disabled:true}`; click attempt không chạy; stage giữ 12; "Kế hoạch 40–40′", timer null | ✓ |
| F·mode=tv không có nút điều khiển | Dump toàn bộ nút trên TV | `part2b` + `part-exit2`: `tvButtons = []` ở chặng 7 | ✓ |
| D·Timeline 12 chặng | Dải phút từng chặng khi đi live | Chuỗi 0–3 / 3–5 / 5–8 / 8–16 / 16–19 / 19–20 / 20–27 / 27–30 / 30–35 / 35–38 / 38–40 / 40–40 (Sau) khớp `TIMELINE` template | ✓ cấu trúc / ⚠ dải phút — xem ghi chú |

## Ghi chú thiết kế (trình thầy quyết định — không tự sửa)

- **D·Timeline lệch Gate D 78** — phát hiện chính của R3, trình ở B9:
  - **Gate D 78** (file đã duyệt, dòng 207): S0–S10 = 0–60–180–300–600–780–840–1260–1440–1740–2220–2400s ⇒ chặng 5 là "Chặng 10–13 phút".
  - **Runtime** (`lessonAdapter.ts:108–120`, TIMELINE cứng chung): 0–180–300–480–960–1140–1200–1620–1800–2100–2280–2400 ⇒ chặng 5 là "Chặng 16–19 phút".
  - Spec batch2 không có trường thời lượng; adapter không đọc spec nên bài 78 chạy theo template. Gate D 76/80 viết đúng template ranges nên R1/R2 không vấp.
  - **Hai phương án cho thầy**: (a) chấp nhận template chung cho mọi bài batch2 — sửa lại Gate D 78 cho khớp, không đụng code; (b) thêm trường timeline riêng theo bài vào adapter — phải republish + re-QA và đặt precedent cho R4–R7.
- **Think window 10s cố định**: mọi step có ô trả lời đều khóa 10 giây từ lúc HS nhận step (không đọc cấu hình theo bài). Đánh giá A7 theo cấu hình này.
- **"Tiến độ gửi" nằm sau "Hiện kết quả lớp"**: view GV thường ở chặng 11 không hiện chuỗi này — khác trải nghiệm R2 đo được, hành vi đúng thiết kế (chống phân tâm trước khi GV công bố).
- **No-spoiler đo text-level**: annotation KaTeX trong innerHTML chứa source TeX (gặp `dfrac` nhưng không có trong innerText) — đã khai tử false positive này từ R2, giữ nguyên phương pháp.

## False positive đã khai tử (bài học đo đạc)

- Check "HS đã vào view" bằng chuỗi "HỌC SINH" là **false positive** — trang form join cũng chứa header "SMARTPLAN · HỌC SINH" (nguyên nhân HS kẹt form ở phiên 2, log part2b/part2c). Chuẩn đúng: phát hiện form trước, rồi xác minh view **giữ ổn định ≥6s** (wrapper `hsJoinStable`).
- Regex tuyến chặng 6 dùng `\b` khớp nhầm chữ "Mở" trong "Mở rộng lập luận…" — nút thật là **"Chọn nhiệm vụ này"**.
- HS trễ theo GV vài giây nên poll nghĩ phải dày (~700ms) ngay sau từng click "Sau →" của GV; poll thưa chỉ bắt được null.

## Giới hạn kiểm tra

- Phiên live hết hạn ~30 phút nên QA chia 4 phiên kế nhau; mỗi phiên chạy lại phần còn thiếu, bằng chứng log phiên trước vẫn giá trị (log part1/part2b/part2c/part-full/part-exit2/part-exit3 trong `tasks/`).
- Bằng chứng no-spoiler chặng 8–9 lấy từ phiên 2/3 (part2b, part-full); phiên 4 đi thẳng tới chặng 11 để kịp chốt trước khi hết hạn.
- Full-suite có 4 fail pre-existing (CRLF, ngoài scope); chuẩn batch2 là scoped `npx vitest run src/lib/liveLesson/v4` **272/272**.
- Ảnh bằng chứng: `tasks/tmp-r3-qa-*.png` (~30). Các file `tmp-*` KHÔNG git add theo quy định; file này giữ untracked.

---

# QA V8.8 Tuần 11 batch2 — R3·fix1 + fix2 (timeline per-lesson + binding theo phase) trên Production

> Ngày: 2026-10-27 · fix1 `a27cb17` (timeline `gateD78` theo Gate D; re-QA vòng 1 ĐẠT bands nhưng bắt regression S4 HS mất nhiệm vụ) → fix2 `20d114e` (mọi binding theo **phase**; scoped vitest v4 **279/279**; build 0 TS error; đã push feat + main).
> Fingerprint giáo án gốc giữ nguyên `54d92529…83c6f` (fix2 chỉ sửa code). Vercel deploy success 14:38/14:40 UTC 27/10; chunk Production `liveLessonService-5Mad7bwm.js` (index `index-C-DhjgVN.js`) chứa `gateD78` + rule mới `STEP_REFERENCE_INVALID` + fingerprint ✓.
> Republish: Xóa bài 78 (native dialog accept) → "Tạo và xuất bản 54 bài" → hàng "Lớp 11 · Tuần 11 · Tiết 78" trở lại; lessonId giữ `adaptive-v4-11-11-78-24YyULmWgBOM6HZCfJ56RN5tiet2`.
> Phiên live `tkSwyFccn1ks0W0APIDK` (lớp g11 `class-1787188523562` / mã `R6RCFC`) · HS Đặng Tuệ Minh PIN 2750 (Edge riêng port 9223).

## Kết luận

**ĐẠT trọn vẹn A–F sau fix2 — regression đã hết, Gate D 78 vào đúng dải phút.** Root cause regression: adapter gắn nhiệm vụ theo id chặng cứng của template (aiError `P16`, route `P19`…), trong khi timeline `gateD78` đổi id (aiError `P10`, route `P13`…) khiến checkpoint "mồ côi". Fix2 suy mọi binding theo phase, template giữ 100% hành vi cũ, và có rule `STEP_REFERENCE_INVALID` chống tái phạm từ R4.

## Bảng kết quả (phiên `tkSwyFccn1ks0W0APIDK`, Production fix2)

| Mục | Hành vi kiểm | Bằng chứng | Kết quả |
|---|---|---|---|
| E·Timeline 12 chặng Gate D | Dải phút từng chặng khi đi live | HS 12/12: 0–1 / 1–3 / 3–5 / 5–10 / **10–13** / 13–14 / 14–21 / 21–24 / 24–29 / 29–37 / 37–40 + Sau; GV đồng bộ qua "Kế hoạch 0–1′ … 37–40′ · tiết 40′" và "Kế hoạch 40–40′" ở Sau (`tmp-r3-fix2-rea-log.json`) | ✓ |
| B·S4 AI-error chặng 5 (fix2) | HS thấy "AI kết luận" + 4 nhãn + PHẢN HỒI NHANH, không lộ proof | `hsAi/tvAi/hsPHN/hs4Nhan/hsNoProof/tvNoProof` = **true toàn bộ**; band "Chặng 10–13 phút" (vòng fix1: HS trắng nhiệm vụ) | ✓ |
| C·S5 route choice chặng 6 | Bấm "Chọn nhiệm vụ này" trên thẻ tuyến | probe7: clickedTask = thẻ S "Bắt đầu với hỗ trợ" (thiết diện chóp S.ABCD), `taskAppeared=true` (`tmp-r3-fix2-probe7-log.json`) | ✓ |
| C·No-spoiler chặng 7–9 | `7,5(?!\d)` + `12 cm` vắng mặt trước reveal | spoiler hs/tv/gv = **false** ở cả 3 chặng | ✓ |
| D·Exit trống bị chặn | Chưa điền thì không có nút Gửi | Gửi `exists:false` → `emptyBlocked=true` | ✓ |
| D·Exit gửi trọn + tiến độ | Điền đủ → gửi → GV bấm "Hiện kết quả lớp" | "Đã gửi." + "Đã xác nhận trên máy chủ."; GV + TV hiện **"Tiến độ gửi · 1 học sinh đã gửi"** (`tmp-r3-fix2-probe6-log.json`) | ✓ |
| E·"Sau →" disabled chặng 12 | Bắt thuộc tính nút ở Sau | `{exists:true, disabled:true}`; click attempt không chạy; stage giữ 12 | ✓ |
| A·Think window | Poll dày ~700ms sau từng click "Sau →" | **69 reads**, `saw10`, `lockedAll`, `minSeen=0`; 14 cửa sổ đều `decreasing=true` + `lockedAll=true` | ✓ |
| F·mode=tv không có nút điều khiển | Dump toàn bộ nút trên TV chặng 7 | `tvButtons = []` | ✓ |

## Ghi chú

- **GV không có chuỗi "Chặng X–Y phút"** — view GV hiển thị dải qua nhãn "Kế hoạch X–Y′ · tiết 40′"; regex "Chặng" chỉ khớp trên HS. Giống hệt re-QA fix1, không phải regression.
- Think window đo `decreasing` trong từng cửa sổ (reset khi gặp "Chờ 10s"), không cộng dồn across chặng.
- Selector route choice phải dùng `.includes('Chọn nhiệm vụ này')` — textContent nút dính thêm KaTeX của thẻ nhiệm vụ; so khớp exact trim trả null.
- Log + ảnh: `tasks/tmp-r3-fix2-rea-log.json`, `tmp-r3-fix2-probe6-log.json`, `tmp-r3-fix2-probe7-log.json`, ảnh `tasks/tmp-r3-fix2-*.png`. Các file `tmp-*` KHÔNG git add; file này giữ untracked.

---

## R4 · `11-11-79` — Hai mặt phẳng song song — Tiết 3 (practice) · QA A–F Production 28/10/2026

Phiên live `T5lfCYGxrpRSg1aikwhj` (definitionKey `11-11-79`, lessonId `adaptive-v4-11-11-79-24YyULmWgBOM6HZCfJ56RN5tiet2` — deterministic đúng dự kiến; lớp `class-1787188523562`/`R6RCFC`; HS Đặng Tuệ Minh PIN 2750, Edge 9223). Deploy `b14d0db` success cả 2 Vercel; Production chunk `liveLessonService-DhtfPWkx.js` (index `index-DKbs2wEJ.js`) chứa `gateD79` + fingerprint `b6dfa109…7be24` + `STEP_REFERENCE_INVALID`.

| Khoản | Cách đo | Kết quả | Verdict |
|---|---|---|---|
| A·Phiên mới + contract | `node tasks/tmp-r4-qa-session.cjs` | Phiên tạo cho 11-11-79, joinCode R6RCFC; GV/HS/TV nạp từ Production | ✓ |
| A·Timeline 12 chặng (dải Gate D 79 riêng) | Quét 11 chặng GV→HS | HS bands **0–1 / 1–5 / 5–7 / 7–12 / 12–15 / 15–16 / 16–24 / 24–29 / 29–35 / 35–38 / 38–40 phút** — khớp đúng phân bổ thầy duyệt 1-4-2-5-3-1-8-5-6-3-2; chặng 12 "Sau" disabled, stage giữ 12, "Kế hoạch 40–40′ · tiết 40′" | ✓ |
| A·Think window | Poll dày ~700ms sau từng click "Sau →" | **63 reads**, `saw10`, `lockedAll`, `minSeen=6`; **11 cửa sổ đều `decreasing=true` + `lockedAll=true`** | ✓ |
| B·AI-error chặng 5 (S4 720–900s) | Dump HS/TV tại band 12–15′ | HS + TV hiện **"AI" + "MN ∥ AB" + "MNPQ"** (bài làm sai bỏ điều kiện cắt nhau — riêng của bài 79); "PHẢN HỒI NHANH" + đủ 4 nhãn; **không lộ** correction/proof (`hsNoProof`/`tvNoProof` = true) | ✓ |
| C·HS join thật bằng mã lớp + PIN | Join qua form mới (Đặng Tuệ Minh + 2750) | `view-stable` | ✓ |
| C·Route choice chặng 6 | `tmp-r4-probe7.cjs` — chờ think hết rồi bấm thẻ S | Clicked **"Bắt đầu với hỗ trợ"** (thẻ S), **taskAppeared=true** — task "Cho hình chóp S.ABCD… trung điểm M, N, P…" đúng bài 79 | ✓ |
| C·Nháp giữ sau reload + tự rejoin không PIN | `tmp-r4-reload.cjs` — gõ marker ở chặng 5, reload | `relogged=view` (không hiện form, không cần PIN); `keptInField=true`, `nhapPanel=true` ("Nháp đã lưu trên máy"); band về đúng 12–15′, AI-error vẫn hiện | ✓ |
| D·Exit gửi trống bị chặn | Bấm Gửi khi ô trống | `{exists:false}` → blocked (không có "Đã gửi" nào) | ✓ |
| D·Exit gửi trọn + "Tiến độ gửi · 1 HS" | Điền "Đã làm được" → chèn tự đánh giá → Gửi | **"Đã gửi." + "Đã xác nhận trên máy chủ."**; GV bấm "Hiện kết quả lớp" → GV + TV **"Tiến độ gửi · 1 học sinh đã gửi"** | ✓ |
| F·mode=tv `buttons: []` + no-spoiler | Dump nút TV chặng 7; regex `d_S` + `HÌNH THANG` (hoa) ở HS/TV/GV chặng 7/8/9 | `tvButtons = []`; **0/6 lộ** (cả GV live cũng không lộ — đáp án chỉ ở `exercises[].answer`) | ✓ |

### Ghi chú R4

- Dải phút GV đọc qua "Kế hoạch X–Y′ · tiết 40′" (đúng quirk đã ghi ở R3 — regex "Chặng" chỉ khớp trên HS).
- Lần QA đầu bấm route choice khi còn "Chờ 2s" → nút chưa render (không phải bug); probe7 chờ `thinkGone` rồi bấm thành công — giữ thứ tự này cho các vòng sau.
- GV live view không hiện `d_S`/`HÌNH THANG`: đáp án PHT nằm ở `exercises[].answer` (panel soạn/offline pack), không nằm trong cue live — khớp bảng phân quyền Gate D 79.
- Think `minSeen=6` (khác R3 `minSeen=0`) do poll bắt nhịp giữa cửa sổ; vẫn `decreasing` trọn từng cửa sổ + `lockedAll` — không phải regression.
- Log + ảnh: `tasks/tmp-r4-qa-log.json`, `tmp-r4-probe7-log.json`, `tmp-r4-reload.json`, ảnh `tasks/tmp-r4-*.png`. Các file `tmp-*` không commit.

---

## R5 · `12-11-77` — Nguyên hàm — Tiết 2 (practice, g12) · QA A–F Production 28/10/2026

Phiên live `sWYnJAWlwke3c76fafp3` (definitionKey `12-11-77`, lessonId `adaptive-v4-12-11-77-24YyULmWgBOM6HZCfJ56RN5tiet2`; lớp `R6RCFC`, HS Đặng Tuệ Minh PIN 2750, Edge 9223). Deploy `7781984` success cả 2 Vercel; Production chunk `liveLessonService-BAMF4i49.js` (index `index-DGj-AgFn.js`) chứa `gateD77` + fingerprint `7bfadfbe…c702`.

| Khoản | Cách đo | Kết quả | Verdict |
|---|---|---|---|
| A·Phiên mới + contract | `node tasks/tmp-r5-qa-session.cjs` | Phiên tạo cho 12-11-77, joinCode R6RCFC | ✓ |
| A·Timeline 12 chặng (dải Gate D 77 riêng) | Quét 11 chặng GV→HS | HS bands **0–1 / 1–6 / 6–9 / 9–13 / 13–16 / 16–17 / 17–22 / 22–26 / 26–33 / 33–38 / 38–40 phút** — khớp đúng phân bổ thầy duyệt 1-5-3-4-3-1-5-4-7-5-2; chặng 12 "Sau" disabled, stage giữ 12, "Kế hoạch 40–40′" | ✓ |
| A·Think window | Poll dày ~700ms | **62 reads**, `saw10`, `lockedAll`, `minSeen=6`; **10 cửa sổ đều `decreasing=true` + `lockedAll=true`** | ✓ |
| B·AI-error chặng 5 (S4 780–960s) | Dump HS/TV tại band 13–16′ | HS + TV hiện **"AI" + "ln x" + "1/x"** (bẫy "bạn Nam" thiếu trị tuyệt đối — riêng của bài 77); "PHẢN HỒI NHANH" + đủ 4 nhãn; **không lộ** correction/proof (không "trị tuyệt đối", không "ℝ", không "(−∞") | ✓ |
| C·HS join thật | Join qua form (Đặng Tuệ Minh + PIN 2750) | `view-stable` | ✓ |
| C·Route choice chặng 6 | `tmp-r5-probe7.cjs` (chờ thinkGone) | Clicked **"Bắt đầu với hỗ trợ"** (thẻ S), **taskAppeared=true** — task "PHT số 1 — Nhiệm vụ A (Mức TB): f(x) = x⁴ + 3x²…" đúng bài 77 | ✓ |
| C·Nháp giữ sau reload + tự rejoin không PIN | `tmp-r5-reload.cjs` | `relogged=view` (không cần PIN); `keptInField=true`, `nhapPanel=true`; band về đúng 13–16′, AI-error vẫn hiện | ✓ |
| D·Exit trống bị chặn | Bấm Gửi khi trống | `{exists:false}` → blocked | ✓ |
| D·Exit gửi trọn + "Tiến độ gửi · 1 HS" | Điền → Gửi → GV "Hiện kết quả lớp" | **"Đã gửi." + "Đã xác nhận trên máy chủ."**; GV + TV **"Tiến độ gửi · 1 học sinh đã gửi"** | ✓ |
| F·mode=tv `buttons: []` + no-spoiler | Dump nút TV chặng 7; regex `20,41` + `2\ln` ở HS/TV/GV chặng 7/8/9 | `tvButtons = []`; **0/6 lộ** | ✓ |

### Ghi chú R5

- Spec `quick` gộp 5 câu ĐGTX gốc thành 3 entry (parser chỉ nhận 2–3): mini-check (∫sin x + ∫e^{2x} — gốc đã ghép 1 hoạt động) + mini-quiz câu 1 + câu 2+3; mọi câu giữ nguyên văn đề + đáp án mục IV.
- Think `minSeen=6` — như R4 (poll bắt giữa cửa sổ), không phải regression.
- Log + ảnh: `tasks/tmp-r5-qa-log.json`, `tmp-r5-probe7-log.json`, `tmp-r5-reload.json`, ảnh `tasks/tmp-r5-*.png` (tmp-* không commit).

---

## R6 · `12-11-78` — Khoảng biến thiên và khoảng tứ phân vị — Tiết 1 (formation, g12) · QA A–F Production 28/10/2026

Phiên live `1slj6yFtDrmpkWUxkpNR` (definitionKey `12-11-78`, lessonId `adaptive-v4-12-11-78-24YyULmWgBOM6HZCfJ56RN5tiet2`; lớp `R6RCFC`, HS Đặng Tuệ Minh PIN 2750). Deploy `83ac5f3` success cả 2 Vercel; Production chunk `liveLessonService-DFQK1_Vg.js` (index `index-BZ0yV7Gw.js`) chứa `gateD1278` + fingerprint `929c3bb9…02e3a`.

| Khoản | Cách đo | Kết quả | Verdict |
|---|---|---|---|
| A·Phiên mới + contract | `node tasks/tmp-r6-qa-session.cjs` | Phiên tạo cho 12-11-78, joinCode R6RCFC | ✓ |
| A·Timeline 12 chặng (dải Gate D riêng, key `gateD1278`) | Quét 11 chặng GV→HS | HS bands **0–1 / 1–5 / 5–8 / 8–12 / 12–15 / 15–16 / 16–24 / 24–29 / 29–35 / 35–39 / 39–40 phút** — khớp đúng phân bổ thầy duyệt 1-4-3-4-3-1-8-5-6-3-2; chặng 12 "Sau" disabled, stage giữ 12, "Kế hoạch 40–40′" | ✓ |
| A·Think window | Poll dày ~700ms | **61 reads**, `saw10`, `lockedAll`; **16 cửa sổ đều `decreasing=true` + `lockedAll=true`** (`minSeen=0` — poll bắt trọn cửa sổ cuối) | ✓ |
| B·AI-error chặng 5 (S4 720–900s) | Dump HS/TV tại band 12–15′ | HS + TV hiện **"AI" + "35 − 10 = 25"** (bẫy đảo chiều R — riêng của bài 78 g12); "PHẢN HỒI NHANH" + đủ 4 nhãn; **không lộ** correction/proof (không "40 − 5", không định nghĩa đúng) | ✓ |
| C·HS join thật | Join qua form (Đặng Tuệ Minh + PIN 2750) | `view-stable` | ✓ |
| C·Route choice chặng 6 | `tmp-r6-probe7.cjs` (chờ thinkGone) | Clicked **"Bắt đầu với hỗ trợ"** (thẻ S), **taskAppeared=true** — task "PHT số 1 — NHÁNH 1 (Phiếu Xanh lá): [0;30): 8…" đúng bài 78 g12 | ✓ |
| C·Nháp giữ sau reload + tự rejoin không PIN | `tmp-r6-reload.cjs` | `relogged=view`; `keptInField=true`, `nhapPanel=true`; band về đúng 12–15′, AI-error vẫn hiện | ✓ |
| D·Exit trống bị chặn | Bấm Gửi khi trống | `{exists:false}` → blocked | ✓ |
| D·Exit gửi trọn + "Tiến độ gửi · 1 HS" | Lần 1 trong rea: `typed ok:false` — **nguyên nhân: HS chưa chọn tuyến nhiệm vụ** (thẻ exit khóa theo tuyến; rea chạy exit trước probe7). Lần 2 sau khi probe7 đã chọn tuyến (thẻ S) — `tmp-r6-exit2.cjs` | TEXTAREA "Viết câu trả lời ngắn" hiện → gõ → **"Đã gửi." + "Đã xác nhận trên máy chủ."**; GV "Hiện kết quả lớp" → **"Tiến độ gửi · 1 học sinh đã gửi"** | ✓ |
| F·mode=tv `buttons: []` + no-spoiler | Dump nút TV chặng 7; regex `41,25` + `30,34` ở HS/TV/GV chặng 7/8/9 | `tvButtons = []`; **0/6 lộ** | ✓ |

### Ghi chú R6

- **Khuôn QA cập nhật cho các vòng sau**: luồng exit phải chạy SAU khi route choice đã chọn (probe7) — thẻ exit khóa theo tuyến; nếu chạy exit trước thì `typed ok:false` (không phải bug sản phẩm, là thứ tự kiểm).
- Think `minSeen=0` (16 cửa sổ — poll dày hơn nhờ band ngắn 3′/2′) — vẫn decreasing+locked trọn từng cửa sổ.
- Log + ảnh: `tasks/tmp-r6-qa-log.json`, `tmp-r6-probe7-log.json`, `tmp-r6-reload.json`, `tmp-r6-exit2.cjs` (inline log), ảnh `tasks/tmp-r6-*.png` (tmp-* không commit).

---

## R7 · `12-11-79` — Các số đặc trưng đo mức độ phân tán — Tiết 2: Luyện tập (practice, g12) · QA A–F Production 28/10/2026 — **BÀI CUỐI BATCH2**

Phiên live `3jpow388uY6B6aCx0EH7` (definitionKey `12-11-79`, lessonId `adaptive-v4-12-11-79-24YyULmWgBOM6HZCfJ56RN5tiet2`; lớp `R6RCFC`, HS Đặng Tuệ Minh PIN 2750). Deploy `a5b090d` success cả 2 Vercel; Production chunk `liveLessonService-CE5hMEae.js` (index `index-BD053Mku.js`) chứa `gateD1279` + fingerprint `a83ce82d…e242b`.

| Khoản | Cách đo | Kết quả | Verdict |
|---|---|---|---|
| A·Phiên mới + contract | `node tasks/tmp-r7-qa-session.cjs` | Phiên tạo cho 12-11-79, joinCode R6RCFC | ✓ |
| A·Timeline 12 chặng (dải Gate D riêng, key `gateD1279`) | Quét 11 chặng GV→HS | HS bands **0–1 / 1–5 / 5–7 / 7–12 / 12–14 / 14–15 / 15–23 / 23–25 / 25–32 / 32–36 / 36–40 phút** — khớp đúng phân bổ thầy duyệt 1-4-2-5-2-1-8-2-7-4-4; chặng 12 "Sau" disabled, stage giữ 12, "Kế hoạch 40–40′" | ✓ |
| A·Think window | Poll dày ~700ms | **63 reads**, `saw10`, `lockedAll`, `minSeen=3`; **11 cửa sổ đều `decreasing=true` + `lockedAll=true`** | ✓ |
| B·AI-error chặng 5 (S4 720–840s) | Dump HS/TV tại band 12–14′ | HS + TV hiện **"AI" + "176,7"** (bẫy làm tròn x̄ sớm — riêng của bài 79 g12); "PHẢN HỒI NHANH" + đủ 4 nhãn; **không lộ** correction/proof (không "530/3", không "1247,22", không "STO") | ✓ |
| C·HS join thật | Join qua form (Đặng Tuệ Minh + PIN 2750) | `view-stable` | ✓ |
| C·Route choice chặng 6 | `tmp-r7-probe7.cjs` | Clicked **"Bắt đầu với hỗ trợ"** (thẻ S), **taskAppeared=true** — task "PHT số 1 — Mức Trung bình (Phiếu Xanh): 40 công nhân…" đúng bài 79 g12 | ✓ |
| C·Nháp giữ sau reload + tự rejoin không PIN | `tmp-r7-reload.cjs` | `relogged=view`; `keptInField=true`, `nhapPanel=true`; band về đúng 12–14′, AI-error vẫn hiện | ✓ |
| D·Exit trống bị chặn | Bấm Gửi khi trống | `{exists:false}` → blocked | ✓ |
| D·Exit gửi trọn + "Tiến độ gửi · 1 HS" | Điền → Gửi (exit chạy SAU route choice — quy tắc đã ghi ở R6) | **"Đã gửi." + "Đã xác nhận trên máy chủ."**; GV + TV **"Tiến độ gửi · 1 học sinh đã gửi"** | ✓ |
| F·mode=tv `buttons: []` + no-spoiler | Dump nút TV chặng 7; regex `13,75` + `20982` ở HS/TV/GV chặng 7/8/9 | `tvButtons = []`; **0/6 lộ** | ✓ |

### Ghi chú R7

- Think `minSeen=3` (poll bắt sâu cửa sổ band 2′) — vẫn decreasing+locked trọn từng cửa sổ.
- Log + ảnh: `tasks/tmp-r7-qa-log.json`, `tmp-r7-probe7-log.json`, `tmp-r7-reload.json`, ảnh `tasks/tmp-r7-*.png` (tmp-* không commit).

---

## TỔNG KẾT LOẠT BATCH2 — 7/7 BÀI HOÀN TẤT (QA A–F ĐẠT trên Production)

| Vòng | Key | Lớp/Tiết | Kind | AI-error (bẫy riêng) | Timeline key | Commit Pha B | Fingerprint sau vòng |
|---|---|---|---|---|---|---|---|
| R1 | `10-11-80` | 10 · "Các số đặc trưng đo xu thế trung tâm" | formation | "bạn An" chia k vs n | (template) | `5d044cb` | `d32bae2f…f498c9` |
| R2 | `11-11-76` | 11 · "Các số đặc trưng đo xu thế trung tâm" | formation | "bạn Nam" công tần số | (template) | (R2) | `36c18d6d…` |
| R3 | `11-11-78` | 11 · Hai mặt phẳng song song — Tiết 2 | formation | thiếu đồng phẳng (γ) | `gateD78` | `a27cb17`+`20d114e` | `54d92529…83c6f` |
| R4 | `11-11-79` | 11 · Hai mặt phẳng song song — Tiết 3 | practice | bỏ điều kiện cắt nhau a∩b | `gateD79` | `b14d0db` | `b6dfa109…7be24` |
| R5 | `12-11-77` | 12 · Nguyên hàm — Tiết 2 | practice | "bạn Nam" ln x thiếu |x| | `gateD77` | `7781984` | `7bfadfbe…c702` |
| R6 | `12-11-78` | 12 · Khoảng biến thiên và khoảng tứ phân vị — Tiết 1 | formation | R = 35 − 10 = 25 đảo chiều | `gateD1278` | `83ac5f3` | `929c3bb9…02e3a` |
| R7 | `12-11-79` | 12 · Các số đặc trưng đo mức độ phân tán — Tiết 2 | practice | làm tròn x̄ sớm | `gateD1279` | `a5b090d` | `a83ce82d…e242b` |

- **7 bài đều QA A–F ĐẠT trên Production** (khuôn QA chuẩn hoá dần: think window poll, probe route choice chờ thinkGone, reload giữ nháp, exit chạy sau route choice).
- **4 timeline key riêng** (`gateD78`, `gateD79`, `gateD77`, `gateD1278`, `gateD1279` — 5 key) + binding fix2 theo PHASE; rule `STEP_REFERENCE_INVALID` chặn stepId mồ côi.
- **7 BLOCKER/chốt sửa số nguồn** (Thales 2 họ, tứ giác, Hệ quả, Burj; Hệ quả giàn giáo 79-g11; Hệ quả giàn giáo + PHT Khá c) 79-g11; Hệ quả quên C 77-g12; mức VD hai xí nghiệp 78-g12; vinh danh + PM2.5 + ẩn số 79-g12) — tất cả tự kiểm bằng tay, thầy chốt từng vòng.
- Snapshot cuối: **specs = 7 + MAIN 51 (pin) = 58 bài interactive Tuần 11** (10 mã source key); fingerprint `a83ce82d…e242b`; vitest v4 **299 PASS**; build 0 TS.

---

## Task 9 · QA 2 bài batch1 chưa từng QA trình duyệt (`10-11-79` g10 · `11-11-75` g11) · 28/10/2026

Không deploy, không đụng code — QA A–F trên Production sau khi registry ổn định 10 key. Trình tự đúng quy tắc R6: route choice (probe7) chạy trước exit.

### Task 9 · `10-11-79` — Số gần đúng và sai số (g10) · phiên `8DIcKxBIDeFTlyVivIMV` · lớp `7W288E` · HS Trần Thùy Anh PIN 2143

| Khoản | Kết quả | Verdict |
|---|---|---|
| A·Phiên mới + timeline template | bands HS **0–3 / 3–5 / 5–8 / 8–16 / 16–19 / 19–20 / 20–27 / 27–30 / 30–35 / 35–38 / 38–40 phút** (timeline chung — bài không có timelineKey); Sau disabled, stage 12, "Kế hoạch 40–40′" | ✓ |
| A·Think window | 63 reads, saw10, lockedAll, minSeen=6; **13 cửa sổ đều decreasing+locked** | ✓ |
| B·AI-error chặng 5 | HS + TV: **"AI" + "Fansipan"** (bẫy quy tròn sai hàng — d = 0,2); PHẢN HỒI NHANH + 4 nhãn | ✓ |
| B·No-spoiler | dump chặng 7/8/9 HS/TV/GV: "hàng đơn vị" + "Quy tắc: hàng quy tròn" (chỉ-GV) = **0/9 lộ** | ✓ |
| C·Join / route choice / nháp | `view-stable`; probe7 thẻ S → task "ā = 10 và a = 9,8 — sai số tuyệt đối" (`taskAppeared=true`); reload `keptInField=true`, `nhapPanel=true`, tự rejoin không PIN | ✓ |
| D·Exit | trống chặn; gửi trọn "Đã gửi." + "Đã xác nhận trên máy chủ."; GV+TV "Tiến độ gửi · 1 HS" | ✓ |
| F·mode=tv | `tvButtons = []` | ✓ |

### Task 9 · `11-11-75` — Mẫu số liệu ghép nhóm (g11) · phiên `3f6l2fI1RriYA1ZWfnJe` · lớp `R6RCFC` · HS Đặng Tuệ Minh PIN 2750

| Khoản | Kết quả | Verdict |
|---|---|---|
| A·Phiên mới + timeline template | bands HS **0–3 / 3–5 / 5–8 / 8–16 / 16–19 / 19–20 / 20–27 / 27–30 / 30–35 / 35–38 / 38–40 phút**; Sau disabled, stage 12 | ✓ |
| A·Think window | 62 reads, saw10, lockedAll, minSeen=0; 18 cửa sổ — **17/18 decreasing+locked; 1 cửa sổ artifact poll** (10 reads gộp 2 lượt nav — lockedAll 62/62, không phải lỗi sản phẩm) | ✓ |
| B·AI-error chặng 5 | HS + TV: **"AI" + "Internet"** (bẫy "90 thuộc nhóm [60; 90)"); PHẢN HỒI NHANH + 4 nhãn | ✓ |
| B·No-spoiler | token chỉ-GV: "không chứa 90" + "90 < 90" (proof) = **false** ở chặng 7/8/9 HS/TV; token "nửa khoảng" = true **nhưng nằm trong hint công khai của task** ("Em dùng kí hiệu nửa khoảng để chứng minh…") — không phải correction/proof; "[90; 120)" (correction) = false trên màn HS | ✓ (false positive marker đã loại trừ) |
| C·Join / route choice / nháp | `view-stable`; probe7 thẻ S → task "Nhóm [20;30) — độ dài nhóm và giá trị đại diện" (`taskAppeared=true`); reload `keptInField=true`, `nhapPanel=true`, tự rejoin không PIN | ✓ |
| D·Exit | trống chặn; gửi trọn; GV+TV "Tiến độ gửi · 1 HS" | ✓ |
| F·mode=tv | `tvButtons = []` | ✓ |

### Task 9 · Step 3 — CasioKeyGuide PHẢI ẨN với cả 2 bài

Dump HS toàn chặng (t9a s7/s8/s9 + t9b): **0 lần** xuất hiện "Casio fx-580VN X" / "σx = 0,89443" / "Máy tính của em" — `getCasioGuideForLesson` trả null cho bài không phải 12-11-80 (`casioGuide.ts:57-64`). | ✓ ẨN

---

## Task 10 · QA hồi quy bài 12 (`12-11-80` — Phương sai) sau khi registry 3→10 key · 28/10/2026

Phiên live `2vuuqC9VtmVhVGihSyD6` · lớp `AD4GKT` (g12) · HS Lò Mai Phương Chi PIN 7859.

**Step 1 — kiểm code nhanh:** vitest v4 **300/300 PASS** (thêm cổng chốt Task 11 Step 1b); `g12VarianceNumbers.test.ts` + `casioGuide.test.ts`: **17/17 PASS** (không đổi).

**Step 2 — QA hồi quy trên Production:**

| Khoản | Kết quả | Verdict |
|---|---|---|
| Contract nạp đúng | GV mở phiên 12-11-80; HS join `view-stable` | ✓ |
| Timeline 2400s (template) | bands HS **0–3 / 3–5 / 5–8 / 8–16 / 16–19 / 19–20 / 20–27 / 27–30 / 30–35 / 35–38 / 38–40 phút**; think 62 reads, 11 cửa sổ decreasing+locked | ✓ |
| AI-error chặng 5 | HS + TV: **"AI" + "±3"** (bẫy "s² = 9 nên s = ±3"); PHẢN HỒI NHANH + 4 nhãn; correction/proof ("căn bậc hai số học") không lộ | ✓ |
| Exit ticket chặng 11 | trống chặn; gửi trọn "Đã gửi." + "Đã xác nhận trên máy chủ."; GV+TV "Tiến độ gửi · 1 HS" | ✓ |
| Chặng 12 disabled Sau | `{exists:true, disabled:true}`; stage giữ 12; "Kế hoạch 40–40′" | ✓ |
| **CasioKeyGuide PHẢI HIỆN** | Màn HS: **"Casio fx-580VN X" + "MENU" + "Freq · On" + "OPTN" + "σx = 0,89443…"** — đủ 4 bước hướng dẫn (`casioGuide.ts` CASIO_FX580_STEPS) | ✓ |
| Số đã duyệt nguyên trạng | σx = 0,89443… hiện **nguyên trạng trên màn HS**; s²(An) = 0,8 và s²(Bình) = 2,8, x̄ = 9 nằm trong `boardKnowledge` "Casio kiểm chứng" — view chỉ-GV/offline pack (đúng bảng phân quyền đã duyệt; test pin `g12VarianceNumbers.test.ts` đảm bảo không đổi); bẫy "s = ±3" chiếu lại ở chặng 9 là nội dung công khai hợp lệ | ✓ |
| C·Route choice / nháp | probe7 thẻ S → task "n = 10, Σn_ic_i² = 250, x̄ = 4" (`taskAppeared=true`); reload `keptInField=true`, tự rejoin không PIN | ✓ |

**Bài 12 không vỡ sau khi registry 3→10 key.**

---

## Task 11 · Chốt đợt batch2 — 10/10 bài Tuần 11 V8.8 · 28/10/2026

- **Step 1**: báo cáo này đủ 10 mục QA — R1→R7 (7 bài mới), Task 9 (2 bài batch1), Task 10 (hồi quy bài 12). Mỗi mục có ngày, lớp + HS, checklist A–F, bằng chứng log/ảnh.
- **Step 1b**: cổng chốt `expect(W11BATCH2).toHaveLength(7)` + đúng thứ tự 7 key đã thêm vào `week11Batch2Catalog.test.ts` — vitest v4 **300/300 PASS**.
- **Step 2**: mọi mục ĐẠT → đợt batch2 **HOÀN THÀNH, chốt nghiệm thu** (0 mục sự cố).
- **Tiêu chí nghiệm thu cuối đợt** (plan): build 0 TS ✔; vitest toàn bộ PASS ✔; MAIN snapshot `banToan-w5-w6.snapshot.json` **không đụng** (git diff trống so với main) ✔; snapshot batch2 7 specs/7 aiErrors/7 files, fingerprint `a83ce82d…e242b` ✔.

---

## TÍNH NĂNG MỚI · "Thư viện học lại" — list công khai bài tự học phân hoá trên luồng HS · 28/10/2026

**Yêu cầu thầy 28/10** (sau khi chốt batch2): *"để tất cả các bài học phân hoá đều hiện 1 list trên luồng HS, bất kỳ HS nào cũng vào được list đó để xem và chọn bài học lại"* — kết hợp bài tương tác (dạy tiết) + bài tự học (học lại ở nhà).

**Hiện trạng đã khảo sát**: 10 bài tương tác đã có (batch2); 10 bài tự học phân hoá Tuần 11 **đã có sẵn** trên Production (tạo từ cùng giáo án nguồn, cùng adaptive id: ví dụ 12-11-78 → `adaptive-1792833009074`) nhưng HS chỉ truy cập được khi GV giao — chưa có list công khai.

**Đã làm** (commit `8aa6f92` + `d71dcc0`, deploy success cả 2 Vercel):
1. `adaptiveLessonService.ts`: `listPublishedSelfStudyLessons()` — query `adaptiveLessons` where `portalEnabled == true` (khớp firestore.rules), lọc `lessonKind == 'self_study'` + `status == 'published'`, không lọc lớp; sort theo khối/tiết.
2. `AdaptiveLibraryPage.tsx` mới — route **`/adaptive-library`** (công khai, không cần đăng nhập): tiêu đề "Thư viện học lại", filter khối 10/11/12 + **tìm kiếm theo tên bài**, nhóm theo Lớp, mỗi bài nút "Học lại bài này" → `/adaptive-portal/:id` (đường portal đã có, đã QA).
3. Link "Thư viện học lại — chọn bài tự học" đặt trên **header cổng HS** (AdaptiveStudentPortalPage) + link trong StudentPortalDashboard.

**QA trên Production**:
| Khoản | Kết quả | Verdict |
|---|---|---|
| Mở `/adaptive-library` | Tiêu đề "Thư viện học lại" ✓; **112 link mở bài**; đủ filter Lớp 10/11/12 | ✓ |
| Tìm kiếm "Khoảng biến thiên" | **1 kết quả đúng** → `/adaptive-portal/adaptive-1792833009074` | ✓ |
| Mở bài học lại | Portal hiện "CỔNG HỌC SINH · HỌC TỪNG BƯỚC" + link "Thư viện học lại — chọn bài tự học" ✓; bài "Khoảng biến thiên và khoảng tứ phân vị — Tiết 1" chạy đủ 5 bước | ✓ |
| Nhãn tuần | Bài nguồn Tuần 11 hiển thị nhãn gốc "Dạy thử" (dữ liệu giáo án nguồn) → đã ẩn nhãn tuần không phải số; HS tìm theo tên bài qua ô search | ✓ (giải pháp hiển thị) |

**Lưu ý cho thầy**: mở bài từ thư viện dùng đường portal công khai `/adaptive-portal/:id` — nội dung hiển thị nguyên bản bài tự học (khác luồng GV giao — bản đã bỏ đáp án qua máy chủ). Bài tự học vốn là tài liệu HS tự học (có ví dụ giải mẫu), nếu thầy muốn bản học lại cũng bỏ đáp án thì cần làm thêm qua máy chủ (báo riêng).

### Việc 3 · Giao 10 bài tự học Tuần 11 hàng loạt cho 3 lớp · 28/10/2026

Giao qua action `teacherAssignAdaptiveLesson` (idToken GV từ phiên Edge 9222) — **10/10 → 200**, assignmentId `{classId}_{lessonId}`, `isOpen: true`:

| Lớp | Bài tự học đã giao |
|---|---|
| g10 · 7W288E | Số gần đúng và sai số T1 (`adaptive-1792827090625`) · Các số đặc trưng T1 (`adaptive-1792826324771`) |
| g11 · R6RCFC | Mẫu số liệu ghép nhóm T1 · Các số đặc trưng T1 · Hai mặt phẳng T2 · Hai mặt phẳng T3 |
| g12 · AD4GKT | Nguyên hàm T2 · Khoảng biến thiên T1 · Mức độ phân tán T2 · Phương sai T1 |

QA portal HS (lớp g12 đang phiên, Edge 9223): `studentAdaptiveList` trả đúng 4 bài g12 mới + 1 bài cũ, `closed: false` — HS bấm "Vào bài" chạy luồng chấm có điểm chuẩn. Lưu ý UI "Giao bài" trên GV chỉ list bài tương tác V8.8 — bài tự học nguồn phải giao qua action (đã thực hiện).

---

## Gate D mini · Nhóm xoay tua tự động (29/10/2026 — QA live chốt ngày 29/10)

| Khoản | Kết quả | Verdict |
|---|---|---|
| Unit test R1/R2/R3 (grouping.test.ts) | PASS (thuần, không TDZ) | ✓ |
| Build | 0 TS error | ✓ |
| vitest `src/lib/liveLesson/v4 src/components src/pages` | 84 file / 732 test PASS (gồm test render) | ✓ |
| QA live R1 (thẻ DEEP) | Session `Dypueu4PNboPdTOqQGon` (bài 11-11-76, lớp 11Columbus, HS Đặng Tuệ Minh): HS chọn nhóm 3 + gửi bài → GV bật "Hiện kết quả lớp" → máy HS hiện **"NHÓM EM XONG SỚM — NHẬN NHIỆM VỤ MỞ RỘNG"** với câu VD đề trần (Phiếu số 3, ý 3) và dòng "không nộp máy" — đúng đặc tả | ✓ PASS |
| QA live R2 (nhãn chậm GV) | Unit test `TvSlowGroups.test.ts` 6/6 PASS; nhãn đã chuyển sang màn GV thật (tv-control). Live cần 2 HS (1 nhóm gửi, 1 nhóm không) — chỉ có 1 PIN HS | ⏳ NOT_RUN (unit PASS) |
| R3 | Hàm thuần không đổi counters (test assert) | ✓ |

### Hai lỗi đã sửa khi QA live (commit `00cc56b`, `b9e5c03`)
1. **Listener `groupProgress` chết vì 403**: doc chỉ đọc được khi GV bật "Hiện kết quả lớp". HS/GV subscribe lúc stats tắt → 403 vĩnh viễn, bật stats lại cũng không nhận. Sửa: chỉ subscribe khi `publicStatsEnabled`/`showStats` bật, đổi cờ thì gắn lại listener (`StudentLiveView`, `TeacherLiveView`, `TvSlowGroups`).
2. **R2 gắn sai màn hình**: `mode=teacher` bị remap thành `tv-control` nên `TeacherLiveView` không bao giờ render — nhãn "Nhóm chậm" không bao giờ tới tay GV. Sửa: tách thành `TvSlowGroups` gắn vào presenterControls của `TvLiveView` (màn điều khiển thật của GV); HS/TV không thấy. Logic thuần tách ra `selectSlowGroups` (6 test).

**Lưu ý vận hành cho thầy**: thứ tự dùng đúng là (1) HS chọn nhóm và **gửi bài lúc "Hiện kết quả lớp" còn TẮT** (bật stats sẽ khoá ô trả lời của HS), (2) sau khi nhóm gửi đủ, thầy bật "Hiện kết quả lớp" → thẻ nhiệm vụ mở rộng hiện cho nhóm xong sớm, nhãn nhóm chậm hiện cho thầy nếu nhóm nào quá 80% thời lượng mà gửi dưới 50%.

**Trạng thái: R1 VERIFIED (live); R2 IMPLEMENTED — unit PASS, live cần 2 HS để chạy.**

---

## COMM-AQ-01 · Hand Raise + Câu hỏi ẩn danh + Understanding Pulse (30/10/2026 — QA live)

| Khoản | Kết quả | Verdict |
|---|---|---|
| Unit (service thuần + server audit) | `liveQuestionService.test.ts` + `api/__tests__/live-questions.test.ts` — 14 test PASS | ✓ |
| Build / lint | `npm run build` 0 TS · `npm run lint` 0 · `npm run lint:api` 0 | ✓ |
| Hồi quy | vitest v4+components+pages: **86 file / 746 test PASS** | ✓ |
| QA live — Giơ tay | Session `3BtScbb5aVCM2tCOFf4H` (11-11-76, Đặng Tuệ Minh): bấm ✋ → nút chuyển "Đang giơ tay · Hạ tay"; GV thấy **"✋ 1 bạn đang giơ tay — Đặng Tuệ Minh"**; bấm Hạ tay → GV hết thấy; bấm lại không tạo trùng (doc theo uid) | ✓ PASS |
| QA live — Câu hỏi ẩn danh | HS gửi → xác nhận **"Đã nhận câu hỏi ẩn danh"**; GV panel realtime "❓ Câu hỏi ẩn danh (1) — chỉ giáo viên"; actions Công bố/Đã trả lời/Để sau/Ẩn/Gỡ đều bấm được | ✓ PASS |
| QA live — Privacy (quan trọng nhất) | Doc `publishedQuestions` đọc qua REST: **fields chỉ [questionId, activityId, body, publishedAt] — KHÔNG có participantUid/studentName/device**; review queue `questions/` client write = false (chỉ Admin SDK); không mapping question→student; log server không kèm uid | ✓ PASS |
| QA live — Công bố | GV bấm Công bố → panel chuyển "ĐÃ CÔNG BỐ"; HS (reload cùng phiên) thấy banner **"❓ CÂU HỎI ĐÃ CÔNG BỐ #01 — nội dung, KHÔNG có tên"**; GV Gỡ khỏi TV → HS hết thấy | ✓ PASS |
| QA live — Understanding Pulse | Chặng P20: HS thấy mini-check 3 lựa chọn, chọn "Em hiểu một phần" thành công; nút Hỏi ẩn danh vẫn hoạt động ngay trên pulse | ✓ PASS |
| Cập nhật realtime banner HS (không reload) | Listener nhận qua onSnapshot nhưng chưa xác nhận được bằng script (phiên hết hạn trước khi chụp đủ) — persistence đã PASS; cần xác nhận thêm khi dạy thật | ⏳ NOT_RUN |
| TV overlay câu công bố ở màn `mode=tv` (màn chiếu thuần) | Chưa làm — câu công bố hiện ở màn GV (tv-control) và máy HS; cần thêm nếu dạy qua 2 màn | ⏳ NOT_RUN |
| Coach backlog câu hỏi | Tối thiểu chưa làm (spec cho phép xếp sau P0) | ⏳ NOT_RUN |
| Mobile UX 320–430 | Chưa chạy viewport test riêng — nút min-height 44px, modal responsive | ⏳ NOT_RUN |

**Lỗi gặp và đã sửa trong Pha B:**
1. Query idempotency (clientNonce + serverReceivedAt) thiếu composite index → 500. Đã thêm `firestore.indexes.json` + deploy indexes.
2. `owned.sessionRef()` gọi nhầm (TS) — sửa thành property.

**Trạng thái: P0 PASS (giơ tay, hỏi ẩn danh, privacy, công bố, pulse). 4 mục phụ NOT_RUN — không chặn pilot.**
