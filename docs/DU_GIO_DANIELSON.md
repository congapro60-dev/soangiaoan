# Module dự giờ Danielson — nền tảng dữ liệu và bảo mật

## Vai trò

| Vai trò | Đọc danh sách | Đọc chi tiết | Tạo/sửa | Xóa |
|---|---|---|---|---|
| `bgh` hoặc claim `admin: true` | Toàn bộ | Toàn bộ | Tạo như quản lý; chỉ sửa biên bản mình lập | Toàn bộ |
| `to_truong` | Chỉ biên bản mình lập | Chỉ biên bản mình lập | Chỉ biên bản mình lập, trước `da_trao_doi` | Không |
| `giao_vien` | Không | Không khi cờ chính sách đang tắt | Không | Không |

Mọi vai trò dự giờ còn phải có email đã xác minh thuộc `@thedeweyschools.edu.vn`.

## Collections và contract dữ liệu

`duGioGiaoVien/{gvId}` là danh sách giáo viên được dự giờ. Quản lý được đọc; BGH được ghi.

`duGio/{bienBanId}` là biên bản dự giờ. Khi tạo, các trường sau là bắt buộc:

- `gvId`: định danh bản ghi giáo viên trong danh mục.
- `gvUid`: Firebase Auth UID của giáo viên được dự giờ.
- `nguoiDuUid`: Firebase Auth UID của người lập; phải bằng UID đang đăng nhập.
- `ngay`, `bienBan`, `trangThai`; trạng thái ban đầu phải là `nhap`.

`gvId`, `gvUid` và `nguoiDuUid` không được đổi sau khi tạo. Khi trạng thái hiện tại là `da_trao_doi`, biên bản không được sửa.

## Query lịch sử của tổ trưởng

Rules yêu cầu cả bộ lọc owner và giới hạn tối đa 200:

```ts
query(
  collection(db, 'duGio'),
  where('nguoiDuUid', '==', auth.currentUser.uid),
  orderBy('ngay', 'desc'),
  limit(200),
)
```

`firestore.indexes.json` khai báo composite index `nguoiDuUid ASC, ngay DESC`. Query thiếu `where`, thiếu `limit`, giới hạn lớn hơn 200 hoặc lọc theo UID khác sẽ bị `permission-denied`.

## Gán vai trò

Chạy bằng đúng service account/project đích:

```powershell
npx tsx scripts/gan-vai-tro.ts <email> <bgh|to_truong|giao_vien>
```

Script giữ các custom claim khác và chỉ cập nhật `vai_tro`. Người dùng phải đăng nhập lại hoặc gọi `getIdToken(true)` để token nhận claim mới.

## Kiểm thử và deploy

```powershell
$env:PATH = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot\bin;$env:PATH"
npm run test:rules
npm run lint
npm run test
npm run build
```

Trước production, deploy rules/index vào project test hoặc staging, đợi index ở trạng thái READY và chạy query lịch sử thật. Sau đó mới deploy production:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

Không dùng Admin SDK để test hoặc dọn dữ liệu production.
