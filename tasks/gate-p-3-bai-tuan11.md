# GATE P — BÀI HỌC TƯƠNG TÁC V8.8 · 3 bài mẫu Tuần 11 (mỗi khối 1 bài)

> Ngày soạn: 2026-10-24 · **Cập nhật 2026-10-25 sau khi thầy chốt 5 điểm** · Trạng thái: **ĐÃ CÓ QUYẾT ĐỊNH CỦA THẦY — bước sang Gate D**
> Chuẩn áp dụng: `V8_8_CODEX_INTERACTIVE_LESSON_AUTHORING_IMPLEMENTATION_GUIDE.md` (revision 2026-10-12) + template `V8_8_LESSON_EXPERIENCE_MAP_TEMPLATE.md` + mẫu giáo án `MAU_GIAO_AN_BAN_TOAN.md` (trunk).
> Quy tắc: Gate P khoá kế hoạch → Gate D khoá thiết kế → mới được Gate C (code). **Không nhảy vào code.**

## Quyết định thầy (2026-10-25) — đã áp vào toàn bộ file này

1. **Mẫu Ban Toán = CÓ** — giáo án 3 bài theo mẫu Ban Toán đã soạn trước đó xong, lưu ở Thư viện (lịch sử xác minh: lô 15 tiết Tuần 11 "CẬP NHẬT 24/10", tên GV Vũ Việt Cường). Mẫu chuẩn 16 thành phần ở `Downloads\smart-lesson-plan-ai\docs\MAU_GIAO_AN_BAN_TOAN.md`. **Nhiệm vụ còn lại: mở Thư viện, tải thân giáo án 3 bài về tasks/ để đối chiếu Gate D** — cần tab app đăng nhập phiên GV.
2. **Sĩ số = linh hoạt theo lớp**, tối đa 26 (đúng giới hạn trường). Mọi hoạt động nhóm thiết kế chạy với mọi sĩ số từ 12 → 26: nhóm 2–4 HS, số nhóm ≤ 8; các số liệu express (Stats/Công bố) tính theo số nhóm thực tế.
3. **Nguồn = Sách Kết nối tri thức (KNTT)** — đã xác minh: SGK KNTT đủ 10-T1/T2, 11-T1/T2, 12-T1/T2 (PDF scan) tại `Downloads\smart-lesson-plan-ai\SGK Kết nối\`; SGK 12 WORD nguyên văn (zip).
4. **Xác nhận 3 bài mẫu** — giữ nguyên như bảng dưới.
5. **Làm cả 3 bài** (không phải chỉ khối 10).

---

# PHẦN 0 — BÀI MẪU ĐỀ XUẤT (đã được thầy xác nhận)

| Khối | Bài | lessonId | Vì sao chọn |
|---|---|---|---|
| 10 | Số gần đúng và sai số — Tiết 1 | `adaptive-1792827090625` | 6 unit (nhiều nhất khối 10), 4 mục tiêu, có tình huống đo đạc thật → hợp hình thành kiến thức + visual trực quan |
| 11 | Mẫu số liệu ghép nhóm — Tiết 1 | `adaptive-1792831747929` | Có **quy trình 4 bước** rõ ràng → hợp luyện theo bước, dễ kiểm chứng cá nhân và kiểm tra chéo |
| 12 | Phương sai và độ lệch chuẩn — Tiết 1 | `adaptive-1792834706906` | Có **2 công thức song song** (định nghĩa / rút gọn) → hợp hoạt động so sánh, đối chiếu, làm lộ cách nghĩ |

**Căn cứ dữ liệu:** cả 3 bài đã ở trạng thái `published`, đủ 3–6 unit, mỗi unit có 3 tuyến (foundation/standard/challenge), đủ diagnostic 5 câu + exit ticket 3 câu + practiceSet (4 nhận biết / 2 đúng-sai / 2 ngắn).

**Chuyển hoá từ bài tự học sang bài tương tác:** nội dung dùng lại 100% (không soạn lại kiến thức), nhưng phải dựng **3 luồng** và **thêm** những thứ bài tự học không có: timer pha, Stats/Công bố, nhóm, kiểm tra chéo, coach evidence, teacher cue.

---

# PHẦN 1 — BÀI KHỐI 10: SỐ GẦN ĐÚNG VÀ SAI SỐ

## 1.1. Header Gate P

- **Môn/lớp/bài:** Toán 10 · Tuần 11 · Tiết 1 — Số gần đúng, sai số tuyệt đối và quy tròn
- **Nguồn:** `adaptive-1792827090625` (đã published); **SGK KNTT Toán 10 – tập 1**, bài "Số gần đúng và sai số" (PDF scan đã có local, trang cụ thể đối chiếu sau khi OCR/chụp trang) · giáo án nguồn theo mẫu Ban Toán **đã sinh, đang ở Thư viện**
- **Archetype:** `KNOWLEDGE_FORMATION`
- **slotDuration:** 40 phút (core 34 + reserve 6)
- **coreBudget:** 34 phút · **reserveBudget:** 6 phút
- **Sĩ số:** linh hoạt theo lớp, tối đa 26 (nhóm 2–4 HS, ≤ 8 nhóm)
- **Ban Toán template:** `VERIFIED` — giáo án bài này đã sinh theo mẫu chuẩn (lịch sử 24/10); cần tải body nguyên văn từ Thư viện để đối chiếu Gate D

## 1.2. Experience Arc

```text
Nhu cầu thật (đo chiều dài bàn bằng thước dây)
→ Suy nghĩ ban đầu (con số nào là "đúng"?)
→ Khám phá có gợi ý (4 nhóm đo 4 vật, ghi cả số đọc và độ chia)
→ Làm lộ cách nghĩ (nhóm dán kết quả lên Presenter, so 4 cách ghi khác nhau)
→ Xây ý nghĩa (vì sao phải có số đúng vs số gần đúng)
→ Chuẩn hoá (định nghĩa + ký hiệu Δa = |a - ā|)
→ Ví dụ mẫu (GV trình bày 1 ví dụ, có chỗ KS tự làm)
→ Luyện có hướng dẫn (3 câu, mức tăng dần)
→ Tự kiểm tra (exit 3 câu)
→ Vận dụng (cảnh báo làm tròn trong máy tính)
→ Nhìn lại + bước tiếp theo
```

## 1.3. Activity Map

| ID | Mục tiêu | HS nhìn đâu | Hình thức | Tương tác | Cách trả lời | Visual | Hành động | Evidence | Core | Hỗ trợ | Sớm xong |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A01 | Nêu được vì sao phép đo luôn có sai khác | Presenter | Cả lớp | Phát biểu | Chọn nhanh + lời nói | Ảnh cái bàn + thước | Quan sát, đoán | Thăm dò | 3' | Cue: "đo được 1,20 m có đúng không?" | — |
| A02 | Tự đo và ghi số liệu | Máy HS | Nhóm 4 | Đo + điền bảng | Nhập số | Ô nhập 4 vật | Tay đo, ghi | Bảng của nhóm | 8' | Phiếu 4 bước | Câu thêm |
| A03 | So sánh cách ghi của các nhóm | Presenter | Cả lớp | Kiểm tra chéo | Chọn nhóm + nhận xét | Bảng 4 nhóm | Chỉ, nói | Nhận xét của HS | 4' | GV gợi mở | — |
| A04 | Chốt định nghĩa + ký hiệu | Presenter | Cả lớp | Nghe có chỗ làm | Làm chỗ trống | Công thức hiện dần | — | Trả lời chỗ trống | 4' | Cue ngắn | — |
| A05 | Xem ví dụ mẫu | Presenter | Cả lớp | Làm theo | Nhập bước giữa | Bảng tính | — | Bước trung gian | 4' | Nấc 1 | Nấc 2 |
| A06 | Luyện có hướng dẫn | Máy HS | Cá nhân | 3 câu tăng dần | Chọn/nhập | Sơ đồ khoảng chặn | — | 3 câu lưu | 6' | Hint 1→3 | Câu khó hơn |
| A07 | Tự kiểm tra | Máy HS | Cá nhân | 3 câu | Chọn | — | — | Điểm exit | 3' | — | — |
| A08 | Vận dụng: rủi ro làm tròn | Presenter | Cả lớp | Cùng dự đoán | Chọn | Ví dụ 1,005 làm tròn | — | Dự đoán trước/sau | 2' | — | — |

Tổng core = 34' ✔

## 1.4. Construct–Evidence Alignment

| Goal/construct | Task | Evidence | Tiêu chí | Kết luận được phép | Không được kết luận | Recheck |
|---|---|---|---|---|---|---|
| Phân biệt số đúng / số gần đúng | A02 | Bảng nhóm có cả số đọc và độ chia | Nhóm ghi được ≥3/4 vật kèm độ chia | "Nhóm đã phân biệt được hai loại số" | "HS hiểu sâu khái niệm" (chưa có reasoning) | A06 câu 1 |
| Tính sai số tuyệt đối | A05+A06 | Bước giữa + kết quả câu 1–3 | Đúng ≥2/3 câu | "HS tính được Δa ở mức cơ bản" | "Thành thạo" nếu chỉ đúng câu nhận biết | Câu 3 (dạng khác) |
| Nêu khoảng chặn | A06 câu 2 | Câu trả lời khoảng chặn | Đúng dạng a−d ≤ ā ≤ a+d | "HS dựng được khoảng chặn" | "Hiểu vì sao" nếu không nêu lý do | A08 |

## 1.5. Practice Choice

- **applicable?** CÓ
- **learningValue:** nhớ lại và vận dụng ở mức khác nhau
- **MORE_PRACTICE:** 2 câu cùng dạng quy tròn
- **DEEP_CHALLENGE:** bài so sánh chất lượng 2 phép đo qua sai số tương đối
- **EXPLORE:** câu chuyện làm tròn tích luỹ trong bảng tính (1,005 × 1000)
- **teacher override:** GV bấm chuyển nhánh cho cả lớp, HS làm nhanh tự nhảy
- **quay về:** khi GV chuyển pha "Chuẩn hoá tổng kết"
- **N/A?** không áp dụng cho bài này

## 1.6. Attention Handoff

| Từ | Sang | Lời chuyển | Trạng thái Student | Mục tiêu |
|---|---|---|---|---|
| Presenter (A01) | Máy HS (A02) | "Mỗi nhóm lấy thước, đo 4 vật và ghi cả độ chia" | Bàn nhóm, giữ phiếu | Mắt xuống thiết bị, tay đo |
| Máy HS (A02) | Presenter (A03) | "Ngẩng lên, cô đưa kết quả 4 nhóm lên" | Nháp nhóm được lưu | Không mất dữ liệu đã gõ |
| Presenter (A04–A05) | Máy HS (A06) | "Giờ đến lượt em tự làm 3 câu" | Nháp A05 lưu | Tách nghe và làm |

## 1.7. Visual Opportunity Audit

- **Spatial:** trục số thể hiện khoảng chặn a−d … a+d (tĩnh, thấy được)
- **Dynamic:** con trỏ chạy trên trục khi đổi d
- **Representation:** bảng tính Δa theo cột
- **Invariant:** |a−ā| luôn nhỏ hơn hoặc bằng d
- **Compare:** hai phép đo cùng vật, khác thước
- **Error:** 1,005 làm tròn → hậu quả khi nhân
- **Reveal:** công thức hiện **theo từng phần** sau khi HS trả lời chỗ trống
- **no-spoiler:** không lộ đáp án trước A06; công thức A04 chỉ hiện sau khi lớp trả lời
- **fallback:** mất mạng → GV vẽ trục số trên bảng, HS dùng phiếu giấy

## 1.8. Student Agency

- **Voice:** A02 (cách ghi của nhóm mình), A03 (nhận xét nhóm bạn)
- **Choice:** A06 chọn mức (cơ bản / khá / mở rộng)
- **Ownership:** nhóm tự quyết mỗi bạn đo hay ghi
- **Purpose:** A08 nêu lý do học (tránh sai số tích luỹ)
- **nonNegotiables:** phải ghi cả số đọc và độ chia; phải nêu đơn vị
- **teacherAuthority:** GV chốt định nghĩa và chuyển pha
- **Feed Up / Back / Forward:** mục tiêu (A01) → nhận xét (A03) → bước tiếp (A08)

## 1.9. Coach Evidence & Uncertainty

- **Observation:** số câu đúng, có ghi độ chia hay không, có sửa sau khi xem kết quả nhóm khác
- **Hypotheses, not assumptions:** "có thể nhóm chưa tách số đọc và độ chia" — **không** kết luận "nhóm yếu"
- **Teacher check:** GV bấm xem câu của nhóm trước khi chốt
- **Recheck:** câu 3 ở A06 dạng khác để kiểm chứng lại
- **UNKNOWN:** HS chưa gửi → Coach chỉ hiện observation + UNKNOWN, không suy yếu

## 1.10. Timing

- **Core:** 34' · **Reserve:** 6' (A03 dư và A08)
- **Fast-path:** nhóm xong sớm ở A02 → nhận câu thêm, không chờ cả lớp
- **Protected:** A04 (định nghĩa) và A06 (luyện) không được cắt — đây là chỗ sinh bằng chứng

## 1.11. QA — ba gate độc lập (chưa chạy gate nào)

- **Ban Toán DOCX + Dry-teach:** 🟡 `TEMPLATE_VERIFIED` — mẫu chuẩn 16 thành phần đã có; giáo án bài này đã sinh theo mẫu (lịch sử 24/10); **body nguyên văn chờ tải từ Thư viện** để đối chiếu chi tiết khi soạn giáo án in ở Gate D. Chưa chạy dry-teach.
- **Sư phạm CIS/TDS:** NOT_TESTED
- **Runtime/thiết bị/kết nối:** NOT_TESTED

---

# PHẦN 2 — BÀI KHỐI 11: MẪU SỐ LIỆU GHÉP NHÓM

## 2.1. Header

- **Bài:** Toán 11 · Tuần 11 · Tiết 1 — Khái niệm và quy trình ghép nhóm (`adaptive-1792831747929`)
- **Nguồn:** **SGK KNTT Toán 11 – tập 1**, bài về mẫu số liệu ghép nhóm (PDF scan local, trang đối chiếu sau OCR) · giáo án nguồn theo mẫu Ban Toán **đã sinh, đang ở Thư viện**
- **Archetype:** `PRACTICE_REVIEW` (trọng tâm là quy trình 4 bước, luyện thành kỹ năng)
- **slotDuration:** 40' · **coreBudget:** 33' · **reserveBudget:** 7'
- **Sĩ số:** linh hoạt, tối đa 26 (cặp đôi chính là đơn vị tương tác chính)
- **Ban Toán template:** `VERIFIED` (giáo án đã sinh 24/10; body nguyên văn chờ tải từ Thư viện)

## 2.2. Experience Arc

```text
Số liệu thô (bảng 26 điểm kiểm tra)
→ Dự đoán: làm sao tóm gọn 26 số mà không mất xu hướng?
→ Khám phá: thử tự chia nhóm 2 cách khác nhau
→ Làm lộ cách nghĩ: 2 cách chia khác nhau cho kết quả khác nhau ở đâu
→ Chuẩn hoá: nhóm nửa khoảng [a; a+L), giá trị đại diện
→ Chuẩn hoá quy trình 4 bước
→ Ví dụ mẫu + luyện từng bước (điền bước, không làm cả bài)
→ Kiểm tra chéo theo cặp
→ Tự kiểm tra
→ Vận dụng: chọn số nhóm cho mẫu 100 số
→ Nhìn lại
```

## 2.3. Activity Map

| ID | Mục tiêu | HS nhìn đâu | Hình thức | Tương tác | Cách trả lời | Visual | Hành động | Evidence | Core | Hỗ trợ | Sớm xong |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B01 | Thấy vấn đề của bảng 26 số | Presenter | Cả lớp | Dự đoán | Chọn nhanh | Bảng 26 số | — | Thăm dò | 3' | Cue | — |
| B02 | Thử tự chia nhóm | Máy HS | Cặp đôi | Kéo/chọn biên nhóm | Chọn biên + nhập L | Cột số kéo | Tay chọn | Cách chia của cặp | 7' | Khung gợi ý | Cách chia thứ 3 |
| B03 | So sánh 2 cách chia | Presenter | Cả lớp | Kiểm tra chéo cặp | Nhận xét | 2 bảng cạnh nhau | Chỉ | Nhận xét | 4' | GV gợi mở | — |
| B04 | Chốt nhóm nửa khoảng + đại diện | Presenter | Cả lớp | Nghe có chỗ làm | Điền chỗ trống | Khoảng [a; a+L) tô màu | — | Trả lời | 5' | Cue | — |
| B05 | Quy trình 4 bước | Presenter | Cả lớp | Cùng dựng | Sắp xếp bước | 4 thẻ bước | — | Thứ tự đúng | 4' | Cue | — |
| B06 | Luyện từng bước | Máy HS | Cá nhân | 3 nhiệm vụ rời | Nhập từng bước | Bảng trung gian | — | 3 bước lưu | 7' | Hint 1→3 | Nhiệm vụ khó |
| B07 | Kiểm tra chéo theo cặp | Máy HS | Cặp đôi | Cross-check | Chọn + ghi lý do | Bảng của bạn | — | Nhận xét bạn | 4' | Câu hỏi dẫn | — |
| B08 | Tự kiểm tra + vận dụng | Máy HS | Cá nhân | 3 câu | Chọn | — | — | Điểm exit | 4' | — | — |
| B09 | Chọn số nhóm cho mẫu 100 | Presenter | Cả lớp | Biểu quyết | Chọn | 3 phương án | — | Kết quả biểu quyết | 2' | — | — |

Tổng core ≈ 40' → **cần cắt B09 vào reserve** để core = 33'. *(Đây là chỗ tôi tự phát hiện vượt ngân sách — sẽ sửa ở Gate D, ghi lại để thầy thấy.)*

## 2.4. Construct–Evidence Alignment

| Goal/construct | Task | Evidence | Tiêu chí | Kết luận được phép | Không được kết luận | Recheck |
|---|---|---|---|---|---|---|
| Đọc đúng tần số, độ dài nhóm | B06 nhiệm vụ 1–2 | Bảng trung gian | Đúng ≥2/3 | "HS đọc được bảng ghép nhóm" | "HS thành thạo quy trình" | B07 bạn kiểm |
| Thực hiện quy trình 4 bước | B06 nhiệm vụ 3 | Thứ tự bước + kết quả | Đúng thứ tự và kết quả | "HS thực hiện được quy trình" | "Hiểu vì sao 4 bước" (cần reasoning) | B08 |
| Xử lý điểm mút biên | B06 + B07 | Cách chọn nhóm cho giá trị đúng biên | Nêu được quy tắc nửa khoảng | "HS nắm quy tắc biên" | "Không bao giờ sai" | B08 câu khó |

## 2.5–2.8. (tom tắt, cùng khung bài 10)

- **Practice Choice:** applicable; MORE_PRACTICE = chia lại mẫu 30 số; DEEP_CHALLENGE = chứng minh đổi số nhóm không đổi tổng tần số; EXPLORE = vì sao SGK hay chọn 5–10 nhóm
- **Attention Handoff:** Presenter(B01) → Máy(B02) → Presenter(B03) → Máy(B06) → Máy cặp(B07)
- **Visual:** nhóm nửa khoảng tô màu; giá trị đại diện là điểm giữa; so sánh 2 cách chia cạnh nhau; biên mở/đóng hiện rõ
- **Agency:** cặp tự chọn cách chia (Choice), tự phân vai kéo/chốt (Ownership), nhận xét bạn (Voice)
- **Coach:** observation = số nhóm, có xử lý biên đúng không; hypothesis = "có thể cặp hiểu nhầm [a; b] là đóng hai đầu"; **không** kết luận yếu; UNKNOWN cho HS chưa gửi
- **Timing:** core 33' · reserve 7' (B09) · fast-path = B02 xong sớm chuyển ngay B06 nhánh khó · protected = B04 + B05 + B06

## 2.9. QA 3 gate: Ban Toán 🟡 TEMPLATE_VERIFIED (chờ đối chiếu body) · CIS/TDS NOT_TESTED · Runtime NOT_TESTED

---

# PHẦN 3 — BÀI KHỐI 12: PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN

## 3.1. Header

- **Bài:** Toán 12 · Tuần 11 · Tiết 1 — Công thức và quy trình tính (`adaptive-1792834706906`)
- **Nguồn:** **SGK KNTT Toán 12 – tập 1, Bài 2 "Phương sai và độ lệch chuẩn", mở đầu trang 80** (đã xác minh nguyên văn từ bản WORD: tình huống máy đo độ ẩm 20 lần + ví dụ cân nặng nam/nữ) · giáo án nguồn theo mẫu Ban Toán **đã sinh, đang ở Thư viện**
- **Archetype:** `MIXED` (formation phần công thức + practice phần quy trình)
- **slotDuration:** 40' · **coreBudget:** 34' · **reserveBudget:** 6'
- **Sĩ số:** linh hoạt, tối đa 26 (nhóm 3 HS, ≤ 8 nhóm + nhóm lẻ)
- **Ban Toán template:** `VERIFIED` (giáo án đã sinh 24/10; body nguyên văn chờ tải từ Thư viện)

## 3.2. Experience Arc

```text
Hai mẫu cùng số trung bình (điểm hai lớp) — lớp nào "đều" hơn?
→ Dự đoán bằng mắt trên biểu đồ
→ Khám phá: đo độ "tản" bằng 2 cách khác nhau
→ Làm lộ cách nghĩ: vì sao bình phương lại cần thiết (không phải trị tuyệt đối)
→ Chuẩn hoá: công thức định nghĩa σ² và σ
→ Đối chiếu công thức rút gọn — hai đường, một đích
→ Ví dụ mẫu + luyện bảng trung gian
→ Kiểm tra chéo: bạn cùng cặp làm công thức nào, so kết quả
→ Tự kiểm tra
→ Vận dụng: máy tính cầm tay kiểm chứng
→ Nhìn lại
```

## 3.3. Activity Map

| ID | Mục tiêu | HS nhìn đâu | Hình thức | Tương tác | Cách trả lời | Visual | Hành động | Evidence | Core | Hỗ trợ | Sớm xong |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C01 | So hai mẫu cùng trung bình | Presenter | Cả lớp | Dự đoán | Chọn lớp "đều hơn" | 2 biểu đồ chồng | — | Dự đoán | 3' | Cue | — |
| C02 | Thử đo độ tản bằng 2 cách | Máy HS | Nhóm 3 | Chọn cách | Nhập kết quả 2 cách | 2 cột song song | Tay nhập | 2 kết quả | 8' | Phiếu hướng dẫn | Cách thứ 3 |
| C03 | Vì sao phải bình phương | Presenter | Cả lớp | Thảo luận | Chọn + nói lý do | Trục sai lệch +/− | — | Lý do | 4' | Cue | — |
| C04 | Chốt công thức định nghĩa | Presenter | Cả lớp | Nghe có chỗ làm | Điền chỗ trống | Công thức hiện phần | — | Chỗ trống | 4' | Cue | — |
| C05 | Đối chiếu công thức rút gọn | Presenter + Máy | Cả lớp | So sánh | Chọn "tương đương / khác" | 2 công thức cạnh nhau | — | Câu trả lời | 4' | Nấc 1 | Nấc 2 |
| C06 | Luyện bảng trung gian | Máy HS | Cá nhân | 3 câu | Nhập từng cột | Bảng 5 cột | — | Bảng hoàn chỉnh | 6' | Hint 1→3 | Câu khó |
| C07 | Kiểm tra chéo cặp | Máy HS | Cặp đôi | Cross-check | Chọn + lý do | Bảng bạn | — | Nhận xét | 3' | Câu dẫn | — |
| C08 | Tự kiểm tra | Máy HS | Cá nhân | 3 câu | Chọn | — | — | Điểm exit | 2' | — | — |

Tổng core = 34' ✔

## 3.4. Construct–Evidence Alignment

| Goal/construct | Task | Evidence | Tiêu chí | Kết luận được phép | Không được kết luận | Recheck |
|---|---|---|---|---|---|---|
| Xác định c_i, x̄, bảng trung gian | C06 | Bảng 5 cột | Đúng ≥4/5 cột | "HS lập được bảng trung gian" | "HS hiểu ý nghĩa phương sai" | C07/C08 |
| Dùng cả 2 công thức | C05+C06 | Kết quả 2 đường khớp nhau | Sai lệch ≤ sai số làm tròn | "Hai công thức cho cùng kết quả với HS" | "HS chọn được công thức tối ưu" | C08 câu khó |
| So sánh độ phân tán 2 mẫu | C01+C02 | Dự đoán ban đầu vs kết quả | Nêu đúng mẫu nào tản hơn kèm số | "HS so sánh được bằng số" | "HS kết luận được về chất lượng dạy" | C08 |

## 3.5–3.8. (tom tắt, cùng khung)

- **Practice Choice:** MORE_PRACTICE = tính lại với mẫu 4 nhóm; DEEP_CHALLENGE = chứng minh σ² ≥ 0 và bằng 0 khi nào; EXPLORE = so độ lệch chuẩn của điểm 2 môn học
- **Attention Handoff:** Presenter(C01) → Máy nhóm(C02) → Presenter(C03–C05) → Máy cá nhân(C06) → Máy cặp(C07)
- **Visual:** trục sai lệch có dấu +/−; hai công thức song song; bảng trung gian giãn cột theo bước; **không** hiện kết quả cuối trước khi HS điền
- **Agency:** nhóm tự chọn thứ tự làm 2 cách (Choice), tự phân vai (Ownership), nêu lý do vì sao bình phương (Voice)
- **Coach:** observation = cột nào sai nhiều, hai đường có khớp; hypothesis = "có thể HS quên trọng số tần số"; **không** suy kết luận về năng lực từ 1 câu; UNKNOWN nếu chưa gửi
- **Timing:** core 34' · reserve 6' · fast-path = C02 xong sớm làm C06 nhánh khó · protected = C04 + C05 + C06

## 3.9. QA 3 gate: Ban Toán 🟡 TEMPLATE_VERIFIED (chờ đối chiếu body) · CIS/TDS NOT_TESTED · Runtime NOT_TESTED

---

# PHẦN 4 — GATE D SẼ PHẢI CÓ GÌ (đang soạn — xem `tasks/gate-d-3-bai-tuan11.md`)

Storyboard 3 luồng (Presenter 5 vùng / Student tối giản / Coach), wireframe từng pha, visual contract chi tiết, copy tiếng Việt chốt từng câu, timing fast-path, contract nhóm + kiểm tra chéo, và **bản giáo án in/dạy không mạng theo mẫu Ban Toán 16 thành phần (P0→P40)**.

# PHẦN 5 — TRẠNG THÁI CÁC CÂU HỎI CHO THẦY (đã xong phần lớn)

1. ~~Mẫu Ban Toán DOCX~~ → **THẦY XÁC NHẬN CÓ**: giáo án 3 bài đã sinh theo mẫu, ở Thư viện. Cần **phiên GV đăng nhập app 1 lần** để tôi tải body nguyên văn cả 3 bài về `tasks/` đối chiếu.
2. ~~Sĩ số~~ → **linh hoạt theo lớp, tối đa 26** — đã áp vào thiết kế nhóm 2–4 HS, ≤ 8 nhóm.
3. ~~Nguồn SGK~~ → **KNTT**. Đã xác minh: đủ SGK KNTT 10/11/12 (PDF scan + SGK 12 WORD nguyên văn trang 80). Còn thiếu: OCR/chụp trang cụ thể SGK 10-t1 và 11-t1 (scan không có text layer) — đối chiếu khi có ảnh trang.
4. ~~Chọn bài~~ → thầy cố 3 bài như trên.
5. ~~3 hay 1 bài~~ → thầy ra lệnh **làm cả 3**.

# KẾT LUẬN TRUNG THỰC

- Gate P đã khoá theo quyết định của thầy (nguồn KNTT, sĩ số linh hoạt ≤ 26, cả 3 bài, template Ban Toán VERIFIED).
- 2 việc còn treo (không chặn Gate D, chỉ chặn đối chiếu chi tiết): (a) tải body giáo án 3 bài từ Thư viện — cần tab app phiên GV; (b) trang SGK cụ thể của SGK 10-t1 / 11-t1 (scan).
- Bài khối 11 vẫn giữ cảnh báo **vượt ngân sách core** (40' vs 33') — xử lý ở Gate D bằng cách đẩy B09 vào reserve.
