# Task 9 — Cross-check V4 contract ↔ generator giáo án banToan (g10 · W5 · P31)

**Ngày**: 2026-08-28 · **Loại**: phân tích READ-ONLY, không sinh code runtime · **Bài**: Bất phương trình bậc nhất hai ẩn — Tiết 1.

Đối chiếu hai nguồn cho **cùng một tiết** để xác định: (a) chúng có mô tả cùng nội dung đã duyệt không, (b) kịch bản GV có bị lộ lên TV không. Không nguồn nào bị sửa; không có import chéo worktree ở runtime.

## Hai nguồn

| | File | Hàm/định danh |
|---|---|---|
| **A. Generator giáo án Word** (main repo, untracked) | `giao an manus tao/_qa/ban_toan_rebuild/g10Content.ts` → `banToanContent.ts` → `generateBanToanDocs.ts` | `g10(31, …)` → spec key `10-5-31`; `buildLessonModel({grade:10,week:5,period:31})` |
| **B. V4 canonical contract** (branch `codex/g10-p31-firestore`) | `src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4.ts` (+ `.cues.ts`) | `getG10P31V4Contract()` → id `g10_w5_p31_bpt_tiet1_v4` |

## Kết luận nhanh

- ✅ **Cùng tiết, cùng kỹ năng lõi** (nhận diện BPT bậc nhất hai ẩn, đường biên, miền nghiệm, kiểm tra điểm).
- ⚠️ **Khác nhau ở NỘI DUNG CỤ THỂ**: hai nguồn dùng các **ví dụ số khác nhau** và **AI error khác hẳn**. Không phải bản sao của nhau — cần quyết định nguồn nào là canonical trước khi "đồng bộ".
- ✅ **Không lộ script GV lên TV** ở cả hai phía (V4 có allowlist chặn ở code; banToan tách screenPlan.tv khỏi teacher).

## Bảng chênh lệch (file · field · nội dung)

### 1. Định danh — khớp
| Field | A (banToan) | B (V4) |
|---|---|---|
| tên bài | `title: 'Bất phương trình bậc nhất hai ẩn'` | `title: 'Bất phương trình bậc nhất hai ẩn — Tiết 1'` |
| loại tiết | `kind: 'formation'` | (live-lesson, formation-style) |
| grade/week/period | 10 / 5 / 31 | lessonId `g10_w5_p31_bpt_tiet1` |

→ Chênh nhỏ: V4 thêm hậu tố "— Tiết 1". Không phải vấn đề.

### 2. Mục tiêu — B chi tiết hơn
| | A (`g10Content.ts` field `focus`) | B (`contract.objectives`) |
|---|---|---|
| Toán | 1 câu: "Nhận diện bất phương trình bậc nhất hai ẩn và miền nghiệm" | **3 mục tiêu**: lập BPT từ bối cảnh · nhận biết đường biên + mô tả miền nghiệm · kiểm tra điểm |
| Ngôn ngữ | có `languageObjective` riêng (prose) | **2 mục tiêu ngôn ngữ** có cấu trúc (dùng đúng thuật ngữ · giải thích bằng khung câu) |

→ Chênh: B tách "lập BPT từ bối cảnh" và "kiểm tra điểm" thành mục tiêu độc lập; A gộp trong một câu focus.

### 3. Ví dụ số — **KHÁC HẲN** (chênh lệch chính)
| | A (banToan `examples`/`exercises`) | B (V4 `taskVariants`/`aiError`/`checkpoints`) |
|---|---|---|
| BPT mẫu | trừu tượng: `2x+y-4>0`, `x-2y+1≤0`, `3x-y+2>0`, `x-2y≤4`, `2x+y-m≥0` | ngữ cảnh cố định: **`3x + 2y ≤ 30`** xuyên suốt; ngân sách **`15x + 10y ≤ 150`** |
| bối cảnh | không có tình huống mở đầu (thuần đại số) | **"tình huống bánh nước" + ngân sách 150** (P00, aiError) |
| post-check | (không có post-check cá nhân riêng) | `x+2y≤8 (2;3)`, `2x+y≤10 (3;4)`, `3x+2y≤14 (4;1)`, `2x+y≤12 (5;3)` |

→ Cùng kỹ năng, **khác toàn bộ số liệu và ngữ cảnh**. B xây một mạch truyện (ngân sách) mà A (đề trừu tượng) không có.

### 4. AI Error of the Week — **KHÁC HẲN cả loại lỗi lẫn số liệu**
| Field | A (`aiErrorOfWeek.ts['10-5-31']`) | B (`contract.aiError` `ai-error-w01`) |
|---|---|---|
| category | **"Lỗi khái niệm"** | **"Logical"** |
| BPT | `2x + y ≤ 4` | `15x + 10y ≤ 150`, điểm `(6;7)` |
| bản chất lỗi | vẽ đường biên **nét đứt** trong khi dấu ≤ phải **nét liền** | tính `160 ≤ 150` rồi kết luận hợp lệ (sai vì `160 > 150`) |
| correction | "…đường biên phải vẽ nét liền vì dấu ≤ có lấy đường biên" | "160 > 150 nên (6;7) không thuộc miền nghiệm" |

→ **Đây là hai bài lỗi AI hoàn toàn khác nhau.** Nếu muốn "cùng nguồn đã duyệt", phải chọn một.

### 5. Glossary — B có, đã duyệt; A không có ở cấp thuật ngữ
| | A | B (`contract.glossary`) |
|---|---|---|
| thuật ngữ | không có mảng glossary; có `languageSupport` (prose, profile `g10-korean-vietnamese`) | **4 mục `status:'approved'`**: bất phương trình · đường biên · miền nghiệm · điểm thuộc miền nghiệm — có bản dịch EN, notation, example, nonExample, reviewer, version |

→ B có glossary chuẩn hóa + đã review; A hỗ trợ ngôn ngữ theo văn xuôi.

### 6. Cấu trúc bảng — nguyên tắc tổ chức khác
| | A (`boardPlan`) | B (`timeline[].boardLarge/boardSide`) |
|---|---|---|
| tổ chức | tĩnh theo 5 mục **I. MỤC TIÊU … V. SƠ KẾT/BTVN** + CẦU NỐI CIS | theo **pha thời gian** P00→P38 (11 block), bảng tiến hóa theo tiết |

→ A = bảng giáo án in (khung đề mục cố định). B = bảng chiếu trực tiếp theo dòng thời gian. Khác mục đích, khó map 1-1 tự động.

### 7. Riêng tư TV — cả hai đạt
- **B**: `contract.projections.tv` allowlist 10 field (không có script/tên/studentId); `projectTv()` cắt cứng; test Task 6 assert JSON không chứa field cấm.
- **A**: `screenPlan.tv` tách khỏi `screenPlan.teacher`; `generateBanToanDocs.contract.ts` assert TV không chứa thuật ngữ vận hành/English.
- ✅ Không phát hiện script GV lọt TV ở nguồn nào.

## Việc cần quyết định (không tự chọn)

Hai nguồn **không** đang dùng chung một bộ nội dung đã duyệt. Trước khi viết bất kỳ adapter runtime nào:

1. **Canonical là B (V4 contract)?** Nếu đúng, generator giáo án Word cho P31 cần cập nhật ví dụ số + AI error về đúng bộ của B — đây là sửa nội dung sư phạm, cần QA Toán duyệt, không phải việc code thuần.
2. **AI error P31 lấy bản nào?** "Lỗi khái niệm nét liền/nét đứt" (A) hay "Logical 160>150 ngân sách" (B). Chỉ giữ một cho tiết này.
3. **Có cần adapter runtime không?** Nếu có, adapter phải đọc nguồn **đã nằm trong branch V4**, không import chéo worktree/main.

## Ràng buộc kỹ thuật đã giữ
- Phân tích READ-ONLY: không sửa `g10Content.ts`, `generateBanToanDocs.ts`, `aiErrorOfWeek.ts`, hay contract V4.
- Không còn `_v4_snapshot` / import tuyệt đối; runtime V4 không import chéo worktree.
- Chưa commit generator vào branch V4; chưa push/deploy.
