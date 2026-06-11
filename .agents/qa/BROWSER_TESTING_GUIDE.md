# Hướng dẫn Browser Testing với @playwright/mcp

## Vấn đề thường gặp

Khi có nhiều MCP browser được bật cùng lúc (`playwright` + `chrome-devtools`), Cline có thể tự chọn sai MCP, mở Chrome mới không có session đăng nhập → Google chặn, viewport sai.

---

## Cấu hình chuẩn (đã kiểm thử hoạt động)

### File: `cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--cdp-endpoint",
        "http://localhost:9222"
      ],
      "env": {}
    }
  }
}
```

> ⚠️ **Quan trọng**: Chỉ giữ **một** MCP browser. Nếu có `chrome-devtools` MCP, hãy disable hoặc xóa đi.

---

## Quy trình sử dụng

### Bước 1: Mở Chrome với Remote Debugging (làm 1 lần trước khi test)

Chạy lệnh PowerShell sau (hoặc tạo file `start-chrome-debug.bat`):

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="C:\Users\ADMIN\AppData\Local\Google\Chrome\User Data" `
  --profile-directory="Default"
```

> Chrome sẽ mở với profile thật, đã đăng nhập Google sẵn → không bị chặn.
> **Đóng hoàn toàn Chrome cũ trước khi chạy lệnh này.**

### Bước 2: Kiểm tra CDP hoạt động

Truy cập `http://localhost:9222/json` — nếu thấy danh sách JSON các tab → CDP đang chạy ✅

### Bước 3: Prompt cho Cline trước mỗi browser task

Thêm vào đầu prompt khi cần Cline thao tác browser:

> "Trước mọi task browser: (1) lấy screen resolution bằng PowerShell, (2) set viewport khớp màn hình, (3) maximize Chrome window."

---

## Lý do dùng CDP thay vì để Playwright tự mở Chrome

| Cách | Kết quả |
|------|---------|
| Playwright tự mở Chrome mới | ❌ Không có profile → Google chặn đăng nhập |
| CDP kết nối Chrome đang chạy | ✅ Có profile thật → đã đăng nhập, không bị chặn |

---

## Checklist trước khi chạy QA

- [ ] Chrome đã được mở với `--remote-debugging-port=9222`
- [ ] Truy cập `http://localhost:9222/json` thấy JSON → CDP OK
- [ ] `cline_mcp_settings.json` chỉ có `playwright` MCP (không có `chrome-devtools`)
- [ ] Prompt Cline tự detect + set viewport trước khi test
