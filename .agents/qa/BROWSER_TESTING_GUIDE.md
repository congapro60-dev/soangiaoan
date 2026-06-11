# Hướng dẫn Browser Testing với @playwright/mcp

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
