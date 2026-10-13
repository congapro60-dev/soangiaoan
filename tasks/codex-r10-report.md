# R10 — Khám phá trong game: bản thử và kiểm tra

Cập nhật 13/10/2026 (giờ Việt Nam). Phạm vi owner: “đưa thử vào game và test xem”. Bản local đã chạy; chưa phát hành R10. Không tuyên bố toàn plan hoặc nghiệm thu dạy thật đã xong.

## Có trong bản thử
- Ba thẻ Dãy số: Hàng ghế có điểm dừng; n và u_n; Ba số chưa kể hết câu chuyện. Ví dụ tự soạn, nguồn/mục tiêu ghi rõ, chưa có thẻ lịch sử/nhà Toán học chưa kiểm chứng.
- Ba điểm Khám phá trên đường đi, xác định ổn định từ seed. Xúc xắc dừng đúng ô mới đánh dấu đã gặp; đi vượt không nhận mảnh. Tất cả vẫn được đọc mọi thẻ trong giờ Khám phá.
- Chọn một ý phản hồi bất kỳ để nhận mảnh đã gặp. Không chấm đúng/sai; lựa chọn đầu tiên bất biến. Đủ 3/3 mở khung sổ tay Nhà thám hiểm. Không tăng điểm Toán, ví, mastery hoặc quyền qua cổng.
- GV bật thử; mở/đóng cửa sổ tối đa 120 giây cộng dồn. Không tự cộng giờ tiết học. Đóng khi chuyển hoạt động/đánh giá/sự kiện; server chặn hết giờ dù chưa TICK. Pause không tính thời gian hoạt động.
- GV “Cả lớp nhìn lên”/“Tiếp tục làm bài”; native modal phủ màn hình, chặn nền và Escape. Nhiệm vụ vẫn mounted, giữ nháp. Màn waiting không gửi task/currentActivity/practice cho HS/TV. TV không gửi bộ sưu tập riêng.
- Máy chung dùng actor đã được service xác thực; mỗi HS có bộ sưu tập riêng. Không thêm DB schema, dependency, AI generation.

## Bằng chứng đạt
- Candidate đúng `.sites-runtime/takeover-candidate-20261011`; 189 tệp source trong manifest byte-match. Worker `f4dc4dbf8f722922baaa07988a1db162d35ba3290246d787bd9b72d66b2835cb`, tree `e55ab6e3d45948f99eb2474b5bc3f790a6bc3c9be66182c27f96d19042643a67`.
- Full 1191/1191 tests PASS (`codex-r10-tests-final.log`), typecheck/build exit0; lint0errors/394warnings hiện hữu. Fulltest ban đầu fail: harness thiếu renderDiscovery và hai test presenter cũ chờ nhiệm vụ lúc waiting; sửa harness/assertion, không bỏ test.
- Native compiled Worker/D1/R2:95 HTTP checks PASS,0external. Chặn role sai/learnerId giả/cardId sai/stale/replay/expired; actual ROLL đánh found với vị trí boundary staged, nhận mảnh/giữ lựa chọn; shared actor ngoài device403; TV/wait privacy. Nhận đủ3fragment thật qua HTTP trên synthetic found-mask7 chỉ để kiểm reward; không giả là3 lần xúc xắc may mắn.
- CUA live synthetic fixture tìm được1card bằng serverROLL từ0, không staged vị trí/fragment. Giao diện: GV mở120s; HS đọc đủ3thẻ, chọn “Dùng một bảng nhỏ”, nhận1/3; ví0; marker hiện đã nhận. Không popup tự động.
- CUA pause: attention native modal1280x720, focusInside=true; sổ tay open=false. Escape không đóng attention. Nhập “23” trước pause; sau resume vẫn “23”.
- CUA viewport375x812, document.scrollWidth360, nút sổ tay44px; không tràn ngang. Thẻ mở375 đã xác minh ở mục tiếp tục bên dưới.
- Load exactWorker:307HTTP150SUBMIT/ownGET+revoke/passport rồi453HTTP150HINT/150ASSESS/150ownGET. Explicit seeded maximum450fragments,900tutorhistory,600eventreceipts,1650submissions. Peak1,541,241bytes < cap1,572,864; headroom31,623. Final1,499,991bytes. Retention450fragments/choices verified after both passes. Cached6310reducercommands không phải lượtHTTP/join mới.
- Actual released version7 Worker `c3b1250d...` đọc state mới, PAUSE resaves giữ nguyên exploration root. Không thêm compressedextrasversion1 nên rollback đã kiểm chứng.
- Review độc lập `ag/gemini-3.1-pro-low` PASS0findings,8reviewedsourcehash unchanged. Raw BLOCKED trước đó giữ; bốn góp ý bị bác bằng contract/source: pause bị chặn đọc, circular import không top-level TDZ, collectedradio đọc serverselected, endpoint-only là yêu cầu owner. Review không thay proof API/CUA.

## Nghiệm thu giao diện tiếp tục 13/10 — đã đạt
Tab30 đã không còn trong phiên khi owner cho phép hủy. Không có hộp xác nhận trên tab32; sổ tay hoạt động lại ngay. Không sửa app để giải quyết lỗi công cụ.
- Concluded album mở bằng nút: đầy đủ nội dung, giữ lựa chọn và1/3mảnh; mọi claim disabled.
- Thẻ375x812:dialog322px,document.scrollWidth360,khôngtràn ngang;cuộnđọc,button44px. Active native modal có focusInside=true khiTab từĐóngsổtay sangradio;Escapeđóng vàquaytrigger. Với concluded chỉcòn1nútfocusable,Tab cóthểđifocusbrowserchrome;khôngclaimfocusinsidebodyalways.
- Shared chọnHS1hiện1/3;HS2hiện0/3,đọc3thẻchưagặp;pauseattentioncovers/resume/đổilạiHS1giữ1/3. Deviceconcludedloginrejectedexpected,nênQAshareddùngfixtureactive mới.
- Waitingstateexplicitstaged:sharedvàTVhiện“Chờ thầy cô bắt đầu”,khôngvisible task;serializedblankđãnativeAPIđốisoát.
- Reloadown1/3giữ. Marker toolbar ở2D vàactual3D mởalbum;GVĐóngKhámpháđóngdialog/disabletrigger. 3Dtải banđầu chậm3s,khôngcoi timeoutengine làapplogicfail;đốisoátcanOpenexpired rồirenewbudgetbằngsyntheticfixturewindowstage,rồiGVmởthật vàmarkerPASS.
- Localproxy503pupilAPI:submitfailalertđượcdismissbằngAPIhợp lệ;input23còngiữ,khôiphục503rồisubmit lạiaccepted“Chưa chính xác”. KhôngOSoffline/networksetting đổi.
- Syntheticreward3/3seeded:hiệnkhungNhàthámhiểm và“KhôngcộngđiểmToán”;ảnhgiữ. Khôngtuyênbố3lầnxúcxắc trúngmaymắn.
Bằngchứng `tasks/codex-r10-browser-final-evidence.json`:10checksPASS,9screenshothashes,189sourcehashunchanged/finalWorkerf4dc4dbf. Appsourcekhôngsửa;chỉQAfixturecóstagewaiting/reward/window và503proxyteacherorigin;productionkhôngcóendpointQA.

## Cổng hiện tại
PASS_LOCAL_PILOT. R10.1–R10.4 implementation/QA/report hoàn tất phạm vi thử. Chưa phát hành R10; chủ hệ thống duyệt bản cụ thể theo sharedplan19.9 trước phát hành.
Còn riêng: học liệu/GV/year/source,150HS40min,thiếtbịthật/3Dvisual và2citationnhápGeminicũ; không bịtickbởipilot. KhôngclaimOSoffline,unsavedclose-tabdraft hoặc nghiệm thu tiết học thật.
Previewlocalhost5202/play hiệnrewarddemo3/3gieosẵn,giữtab36đểownerxem. TeacherQA5201/qa;khônginPIN/token. Version7production/SiteV7/key/HSthật khôngđổi.
## Artifact
`codex-r10-source-manifest.json`, `codex-r10-exploration-native.json`, `codex-r10-browser-fixture-evidence.json`, `codex-r10-code-recheck-gemini-2026-10-12T16-38-40-331Z.json`, `codex-r6-load-r10.json`, `codex-r6-load-assess-r10.json`, `codex-r10-load-exploration-retention.json`.
Screenshot đã lưu: `qa-takeover/r10-attention.png`. `r10-album-desktop.png` là ảnh map sau kết thúc, album không mở; không dùng ảnh này làm proof album.
Local QA server hiện5201/5202 vẫn chạy; dùng `/qa` để bootstrap synthetic credentials, không in token/PIN. Cần nguồn server mới chỉ khi fixture hết giờ; không kéo lại production.

