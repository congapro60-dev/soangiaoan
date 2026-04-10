# Script tự động đồng bộ GitHub dành cho Antigravity
$gitPath = "C:\Users\ADMIN\AppData\Local\GitHubDesktop\app-3.5.7\resources\app\git\cmd\git.exe"
$commitMsg = $args[0]
if (-not $commitMsg) { $commitMsg = "chore: update from Antigravity" }

Write-Host "--- Bắt đầu đồng bộ GitHub ---" -ForegroundColor Cyan

& $gitPath add .
& $gitPath commit -m $commitMsg
& $gitPath push origin main

Write-Host "--- Hoàn tất đồng bộ! ---" -ForegroundColor Green
