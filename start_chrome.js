import { spawn, execSync, exec } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

function getChromePath() {
  switch (os.platform()) {
    case 'win32': return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; 
    case 'darwin': return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'linux': return '/usr/bin/google-chrome';
    default: throw new Error('Hệ điều hành không được hỗ trợ');
  }
}

function killZombieChrome(port) {
  try {
    if (os.platform() === 'win32') {
      execSync(`FOR /F "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /F /PID %a 2>nul`, { stdio: 'ignore' });
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' });
    }
    console.log(`[Setup] Đã giải phóng cổng mạng ${port}.`);
  } catch (e) {}
}

(() => {
  const port = 9222;
  console.log(`🧹 Đang dọn dẹp các tiến trình Chrome cũ trên cổng ${port}...`);
  killZombieChrome(port);

  const chromePath = getChromePath();
  const userDataDir = path.join(process.cwd(), 'bot_profile');

  // Deleting the LOCK file ensures Chrome starts a new isolated process on port 9222
  const lockPath = path.join(userDataDir, 'LOCK');
  if (fs.existsSync(lockPath)) {
    try {
      fs.unlinkSync(lockPath);
      console.log('🧹 Đã xóa file LOCK cũ trong bot_profile.');
    } catch (e) {
      console.log('⚠️ Không thể xóa file LOCK:', e.message);
    }
  }

  console.log(`🚀 Đang khởi chạy Chrome Native với profile: ${userDataDir} trên cổng debug ${port}...`);
  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--no-first-run`,
    `--no-default-browser-check`,
    '--start-maximized'
  ], { detached: true, stdio: 'ignore' });

  chromeProcess.unref();
  console.log('✅ Chrome đã khởi chạy thành công dưới chế độ Debug.');
  console.log('👉 Bây giờ bạn có thể giữ nguyên trình duyệt này và chỉ cần chạy: node run_test.js');
  
  // Keep alive to prevent sandbox from tearing down Chrome when running in agent environment
  setInterval(() => {}, 60000);
})();
