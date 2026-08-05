# Hướng dẫn Browser Testing với @playwright/mcp

> ## ⛔ LEGACY — KHÔNG DÙNG LÀM CỔNG NGHIỆM THU (do-not-run-as-gate)
>
> **Bước 2 bên dưới mở Chrome bằng profile `Default` thật của người dùng.** Đó là phiên
> đăng nhập Google thật, cookie thật, khoá API thật của họ. Một agent QA lái phiên đó là
> đang thao tác dưới danh nghĩa người dùng trên production — không phải kiểm thử.
>
> Tài liệu này cũng mâu thuẫn với `e2e_testing_guide.md`: một bên bảo dùng Playwright MCP
> qua CDP, bên kia dùng Puppeteer. Không có bên nào là nguồn sự thật, vì **dự án hiện không
> có bộ E2E tự động nào**.
>
> **Nếu cần xem UI:** dùng browser tool sẵn có của phiên làm việc, trỏ vào `localhost:3000`
> sau khi `npm run dev`. Không đụng profile cá nhân, không cần cổng `9222`.
>
> **Cảnh báo kèm theo:** `vite.config.ts:20-24` proxy `/api` sang
> `https://giaoandewey.vercel.app`. Chạy localhost **không** đồng nghĩa an toàn — mọi lời gọi
> API trên máy đều đi thẳng ra production. Chỉ smoke UI không ghi dữ liệu.
>
> Lệnh thật đang chạy được: xem `QA_TESTING_PROTOCOL.md` mục 1.

## Vấn đề thường gặp

Khi có nhiều MCP browser được bật cùng lúc (`playwright` + `chrome-devtools`), Cline có thể tự chọn sai MCP, mở Chrome mới không có session đăng nhập → Google chặn, viewport sai.

---

## Cấu hình chuẩn

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--cdp-endpoint", "http://localhost:9222"],
      "env": {}
    }
  }
}
```

---

## Quy trình — Cline tự thực hiện toàn bộ, KHÔNG yêu cầu người dùng đóng Chrome

### Bước 1: Kiểm tra port 9222 có sẵn chưa
```powershell
try { (Invoke-WebRequest http://localhost:9222/json -TimeoutSec 2).StatusCode } catch { "unavailable" }
```

### Bước 2: Nếu chưa có → Tự mở Chrome với debug port (không đóng Chrome cũ)
```powershell
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=`"C:\Users\ADMIN\AppData\Local\Google\Chrome\User Data`"", "--profile-directory=Default"
Start-Sleep -Seconds 3
```

> Chrome sẽ mở thêm cửa sổ mới với debug port — Chrome cũ của người dùng vẫn còn nguyên.

### Bước 3: Xác nhận CDP hoạt động
Truy cập `http://localhost:9222/json` — thấy JSON → ✅

### Bước 4: Set viewport
Lấy screen resolution thực tế bằng PowerShell, set viewport khớp màn hình.

---

## Quy tắc bắt buộc
- **KHÔNG bao giờ đóng Chrome của người dùng**
- Chỉ dùng **Playwright MCP**, không dùng `chrome-devtools` MCP
