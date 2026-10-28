# Pre-flight Zalo Bot — CHAY TRUOC MOI BUOI HS TEST (bai hoc 27/10: khong hen HS khi chua E2E that).
# Cach chay:  powershell -ExecutionPolicy Bypass -File tasks\preflight-zalo.ps1
# Mat ~2 phut. Tat ca dong phai hien PASS thi moi bao "bot song". Co FAIL -> dung, khong cho HS vao.
# Luu y: file nay PHAI giu ASCII thuan (khong dau Tieng Viet) de PowerShell 5.1 doc dung.
$ErrorActionPreference = 'Continue'
$proj = "C:\Users\ADMIN\Downloads\spai-assistant-ph-hs"
Set-Location $proj
$alias = "https://zalo-test.congapro60-devs-projects.vercel.app/api/assistant?transport=zalo_bot"
$script:fail = 0

Write-Host "=== [1/5] Function song? (webhook.test khong secret -> phai 401) ==="
try {
  Invoke-WebRequest -Uri $alias -Method Post -ContentType "application/json" -Body "{}" -UseBasicParsing -TimeoutSec 30 | Out-Null
  Write-Host "FAIL: khong secret ma van 200" -ForegroundColor Red
  $script:fail++
} catch {
  $c = $_.Exception.Response.StatusCode.value__
  if ($c -eq 401) { Write-Host "PASS (401)" -ForegroundColor Green }
  else { Write-Host "FAIL HTTP=$c (khong phai 401)" -ForegroundColor Red; $script:fail++ }
}

Write-Host "=== [2/5] Env production du khong (ten only) ==="
$envls = npx vercel env ls production 2>&1 | Out-String
foreach ($k in @('ZALO_BOT_TOKEN','ZALO_BOT_ID','ZALO_BOT_ALLOWED_IDS','ZALO_BOT_WEBHOOK_SECRET','PH_CHAT_VILAO_KEY')) {
  if ($envls -match [regex]::Escape($k)) { Write-Host "PASS $k" -ForegroundColor Green }
  else { Write-Host "FAIL MISSING $k" -ForegroundColor Red; $script:fail++ }
}

if (Test-Path ".env.probe") { Remove-Item ".env.probe" -Force }
npx vercel env pull .env.probe --environment production --yes 2>&1 | Out-Null
$sec = ((Get-Content ".env.probe" | Where-Object { $_ -match '^ZALO_BOT_WEBHOOK_SECRET=' }) -join '')
$sec = $sec.Substring($sec.IndexOf('=') + 1).Trim().Trim('"')
function Send($txt) {
  $mid = "pf-" + [DateTimeOffset]::Now.ToUnixTimeMilliseconds() + "-" + (Get-Random -Maximum 9999)
  $body = @{ event_name = 'message.text.received'; message = @{ from = @{ id = '6428d37c9d35746b2d24'; is_bot = $false }; chat = @{ id = '6428d37c9d35746b2d24'; chat_type = 'PRIVATE' }; text = $txt; message_id = $mid; date = [DateTimeOffset]::Now.ToUnixTimeMilliseconds() } } | ConvertTo-Json -Depth 8 -Compress
  try { $r = Invoke-WebRequest -Uri $alias -Method Post -Headers @{ "x-bot-api-secret-token" = $sec } -ContentType "application/json" -Body $body -UseBasicParsing -TimeoutSec 150; return $r.StatusCode }
  catch { return $_.Exception.Response.StatusCode.value__ }
}

# Dem so anh TRUOC khi ban cau hoi — de buoc 5 so sanh, tranh PASS gia nho anh cu.
$before = (node (Join-Path $proj "tasks\preflight-storage.cjs") 2>&1 | Select-String -Pattern '^COUNT=' | ForEach-Object { $_.Line }) -replace 'COUNT=', ''
$before = [int]($before -as [string] -replace '\D', '')
Write-Host "Anh trong Storage truoc khi test: $before"

Write-Host "=== [3/5] Menu '0' tra loi (khong AI) ==="
$c = Send "0"
if ($c -eq 200) { Write-Host "PASS HTTP=200 - kiem tra Zalo: ban PHAI nhan duoc menu" -ForegroundColor Green }
else { Write-Host "FAIL HTTP=$c" -ForegroundColor Red; $script:fail++ }

Write-Host "=== [4/5] Cau hoi hinh hoc (AI + ve anh) ==="
$c = Send "Cho hinh chop S.ABCD co day ABCD la hinh vuong canh a, SA vuong goc voi mat phang day. Tinh the tich khoi chop."
if ($c -eq 200) { Write-Host "PASS HTTP=200 - kiem tra Zalo: PHAI co LOI GIAI (va anh neu model xuat khoi geometry)" -ForegroundColor Green }
else { Write-Host "FAIL HTTP=$c" -ForegroundColor Red; $script:fail++ }
Start-Sleep -Seconds 6

Write-Host "=== [5/5] Anh MOI da upload Storage? (so sanh truoc/sau) ==="
$out = node (Join-Path $proj "tasks\preflight-storage.cjs") 2>&1
$out | Select-String -Pattern "STORAGE_CHECK|geometry/" | ForEach-Object { Write-Host $_.Line }
$after = ($out | Select-String -Pattern '^COUNT=' | ForEach-Object { $_.Line }) -replace 'COUNT=', ''
$after = [int]($after -as [string] -replace '\D', '')
if ($after -gt $before) {
  Write-Host "PASS co $($after - $before) anh MOI (truoc=$before, sau=$after)" -ForegroundColor Green
} else {
  Write-Host "CANH BAO: khong co anh moi (truoc=$before, sau=$after)." -ForegroundColor Yellow
  Write-Host "  Model co the khong xuat khoi geometry lan nay - khong phai loi ha tang." -ForegroundColor Yellow
  Write-Host "  Neu Zalo VAN co anh thi pipeline OK; neu khong co anh nao thi kiem tra log [geometry]." -ForegroundColor Yellow
}

try { Remove-Item ".env.probe" -Force -ErrorAction SilentlyContinue } catch {}
Write-Host ""
if ($script:fail -eq 0) { Write-Host "KET LUAN: 0 loi - BOT SONG, cho HS vao duoc." -ForegroundColor Green }
else { Write-Host "KET LUAN: $script:fail loi - DUNG cho HS vao. Sua truoc." -ForegroundColor Red }
