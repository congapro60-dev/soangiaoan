(function(){
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const guides={
  campaign:['Chiến dịch','Giải bài ở cổng, nhận manh mối rồi đi tiếp trên bản đồ.','Hoàn thành các cổng bắt buộc và mở đích theo nhiệm vụ của phòng.','Xếp hạng theo hoàn thành, điểm và thời gian điều chỉnh. Gợi ý, sai và kỹ năng theo quy định của ván.'],
  duel:['Đấu đơn','Nhận câu ở từng vòng, tự kiểm tra rồi chốt câu trả lời. Thua một vòng vẫn tiếp tục.','Thi đấu đủ các vòng hoặc chờ đồng hồ kết thúc.','Điểm trận ưu tiên kết quả đúng; thời gian trả lời phân định khi bằng kết quả.'],
  zones:['Chiếm khu vực','Giải câu để chiếm, củng cố vùng hoặc làm mục tiêu chung của phe.','Tích lũy điểm kiểm soát; ván kết thúc khi đạt mục tiêu hoặc hết giờ.','Xếp hạng theo kiểm soát, câu đúng và tài nguyên của phe.'],
  survival:['Sinh tồn','Giữ vị trí trong vùng hoạt động; giải mục tiêu hoặc câu hồi năng lượng.','Vượt các vòng khi vùng thu hẹp; hết năng lượng thì tạm thời dừng tham gia.','Xếp hạng theo số vòng, mục tiêu hoàn thành và năng lượng.'],
  escort:['Hộ tống','Giải bài sửa tuyến hoặc nạp nhiên liệu, rồi đưa đoàn xe tiến lên.','Đưa đoàn xe hoàn thành tuyến; không tiến được khi hết nhiên liệu hoặc độ bền.','Xếp hạng theo quãng đường, nhiên liệu/độ bền và thời điểm hoàn thành.'],
  treasure:['Săn kho báu','Mở manh mối, chọn nhánh, tìm các mảnh rồi ghép bộ mã.','Hoàn thành số bộ mã mà ván yêu cầu.','Xếp hạng theo bộ mã, câu đúng, điểm và thời điểm hoàn thành.'],
  relay:['Tiếp sức','Người giữ lượt giải phần mình, sau đó bàn giao cho thành viên tiếp theo.','Hoàn thành các chặng và phần việc của thành viên theo luật ván.','Xếp hạng theo chặng, đóng góp thành viên, điểm và thời điểm hoàn thành.'],
  lockdown:['Phòng khóa','Giải bài để cấp điện, rồi thao tác mở từng phòng.','Mở đủ các phòng của nhiệm vụ.','Xếp hạng theo phòng đã mở, điểm và thời điểm hoàn thành.'],
  merchant:['Thương hội','Giải bài kiếm tài nguyên, mua/bán và hoàn thành hợp đồng đủ điều kiện.','Hoàn thành số hợp đồng mà ván yêu cầu.','Xếp hạng theo hợp đồng, giá trị tài nguyên và câu đúng.']
 };
 const participation={individual:'Cá nhân · mỗi em một phiên chơi',pairs:'Cặp hai người · một phần chơi chung',group:'Nhóm · phân vai và đổi người điều khiển'};
 function config(info){return {rule:info?.mode?.rule||info?.campaign?.rule||(info?'campaign':null),participation:info?.mode?.participation||info?.campaign?.participation||(info?.campaign?.playMode==='individual'?'individual':'group')};}
 function render(info){
  const c=config(info),guide=Object.hasOwn(guides,c.rule)?guides[c.rule]:null;
  if(!guide)return '<section class="rules"><h2>Chưa chọn phòng</h2><p>Nhập mã phòng giáo viên cấp để xem thế giới, luật, chế độ và thời lượng thực tế trước khi chơi. Cùng một thế giới có thể dùng các luật khác nhau.</p><p>Tiết học có hồ sơ dùng mã học sinh/PIN; máy nhóm dùng mã thiết bị do giáo viên cấp. Không dùng tên để thay xác thực.</p></section>';
  const seconds=Number.isFinite(info?.durationMs)&&info.durationMs>0?Math.ceil(info.durationMs/1000):0;
  const duration=seconds?`<p>Thời gian tối đa: ${esc(Math.floor(seconds/60))} phút${seconds%60?' '+esc(seconds%60)+' giây':''}. Luật có thể kết thúc sớm; đồng hồ phòng là mốc hiện hành.</p>`:'';
  return `<section class="rules room-rules" aria-label="Luật của phòng này"><h2>Luật của phòng này</h2><p><strong>Thế giới:</strong> ${esc(info?.worldTitle||'Theo phòng giáo viên chọn')} · <strong>Luật:</strong> ${esc(guide[0])} · <strong>Chế độ:</strong> ${esc(participation[c.participation]||'Theo cấu hình phòng')}</p>${duration}<dl><dt><strong>Cách chơi · Cần làm</strong></dt><dd>${esc(guide[1])}</dd><dt><strong>Mục tiêu · Hoàn thành</strong></dt><dd>${esc(guide[2])}</dd><dt><strong>Điểm · Xếp hạng</strong></dt><dd>${esc(guide[3])}</dd></dl><p>Sự kiện chung có luật và đồng hồ riêng; kết thúc sự kiện thì trở lại luật phòng. Trong tiết học, điểm chơi không thay bằng chứng cá nhân trong hộ chiếu.</p></section>`;
 }
 window.SignalRoomRules={render,config,label:rule=>Object.hasOwn(guides,rule)?guides[rule][0]:'Chờ chọn luật'};
})();
