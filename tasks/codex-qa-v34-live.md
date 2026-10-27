# QA live v34 - 27/10/2026 (chay tren Codex Desktop)

## Pham vi va cam ket

- Site live: https://mat-ma-da-gioi.cuong-vuviet.chatgpt.site — DA xac nhan la version 34
  (SHA256 live khop archive, kiem doc lap 27/10). KHONG can kiem lai, KHONG deploy lai.
- KHONG sua code, KHONG commit, KHONG deploy. Chi QA va bao cao.
- KHONG dong vao lib/exam/**, KHONG dung phong demo 7E42C2.
- Tao phong rieng cho QA (ten nhom ngau nhien - rejoin trung ten bi 409); ket thuc QA
  don dep phong qua UI GV ("Phien cua toi") de khong roi rac.
- Dong ho phong 30 phut: lam gon trong 1 phien; het gio thi tao phong moi.
- Request PowerShell thuong bi Cloudflare 403 — dung browser that (Chrome/Puppeteer).

## BG1 - Reward dice moi o campaign (thay doi cot loi cua v34)

1. Tao phong campaign, HS choi den cau thuong (tra loi dung).
2. Panel "Doi muon loi ich nao?" phai co lua chon **"Nhan 100 diem ma luc"**
   (KHONG duoc la "Mot xuc xac them").
3. Chon no: ma luc tang DUNG +100 (vi du 240 -> 340), lich su ghi label "diem ma luc".
4. Doi phan thuong khong cong them diem cua cau do (chi lan chot dau tien duoc tinh).
5. Hoi quy duel: phong duel van hien "Mot xuc xac them" va luot sau lan 2 vien.

## BG2 - Mua buoc (skill choose)

1. Panel 6 nut 1-6 buoc, gia 30-180; nut vuot so ma luc hien co phai disabled.
2. Mua 3 buoc: tru 90, di chuyen dung so buoc, toast "Mua 3 buoc ... = 90",
   lich su hien "1 luot da mua x 3".
3. Het ma luc: 6 nut disabled, HS thay trang thai "Da het ma luc",
   dashboard GV cung nhan dien duoc trang thai nay.
4. Dung o cong dung quy dinh, buoc du duoc carry sang luot sau.

## BG3 - Responsive 375/390/430 (no S5/C3 ke tu truoc deploy)

1. Man mua buoc o 3 viewport: media 480px -> .step-options xep 3 cot;
   khong tran ngang (scrollWidth = innerWidth), khong bi cat chu.
2. Shop co ghi chu ".skill-note"; reward panel co lua chon dice moi; khong tran layout.
3. Luu screenshot vao C:\Users\ADMIN\.codex\sites-release\v34-qa-screens\
   (ten file kem viewport, vi du: step-buy-375.png).
4. Console: 0 error tren moi man, moi viewport.

## Bao cao

- PASS/FAIL tung muc, kem screenshot va log console.
- Neu FAIL: chup console/network log, KHONG tu sua code — bao lai de hoi quyet dinh.
- Ghi ket qua vao tasks/qa-v34-live-20261027/REPORT.md (tao thu muc moi, khong commit).
