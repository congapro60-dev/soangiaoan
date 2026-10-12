import { PRODUCT_THEMES } from '../product-content.js';

const details = {
  modern: ['hồ sơ tín hiệu cuối cùng', 'Em chọn manh mối đầu tiên trước khi chuyến tàu đêm rời bến', 'Thành phố còn một tuyến liên lạc chưa nối'],
  historical: ['dấu vết năm ấn tín', 'Em cùng sứ đoàn dò dấu ấn trong màn sương, tìm lối an toàn cho đoàn dân', 'Long Thành còn vài dấu ấn chưa tìm thấy'],
  future: ['mã đồng bộ Aurora', 'Em chọn điểm lệch cần kiểm tra trước khi vòng lặp thời gian khép lại', 'Aurora còn một điểm lệch cần kiểm chứng'],
  dewey: ['mảnh mật mã chiếc rương tri thức', 'Tiếng chuông sắp vang lên; em chọn nơi tìm mảnh mật mã đầu tiên', 'Chiếc rương tri thức còn một mảnh mật mã chưa ghép'],
  pastoral: ['bản ghi đường nước mùa hội', 'Em lần theo tiếng guồng nước, chọn cách đưa vật dụng qua sông trước mùa hội', 'Bên sông còn một đường nước cần kiểm tra'],
  cube: ['mã tọa độ các khối đảo', 'Em chọn khối đảo đầu tiên cần đưa về lưới, tìm đường nối những nhịp cầu rời', 'Các khối đảo còn một nhịp cầu chưa nối'],
  ring: ['sơ đồ các nút giao vòng bo', 'Em chọn nút giao đầu tiên để nối lại đường vòng trước khi tín hiệu tắt', 'Vòng bo còn một đoạn đường chưa khép'],
  zones: ['bản đồ tín hiệu năm khu', 'Em dò đường tiếp tế, chọn cách nối các khu để không nơi nào bị bỏ lại', 'Năm khu còn một tuyến tín hiệu đang chờ nối'],
  academy: ['bảng quy tắc Hỗn Nguyên', 'Em chọn căn phòng đầu tiên cần tháo gỡ quy tắc trước khi cánh cửa học viện khép', 'Học viện còn một quy tắc chưa được làm rõ'],
  survival: ['tín hiệu hải đăng giữa quần đảo', 'Em chọn tuyến tiếp tế cần kiểm tra trước đợt thủy triều, tìm đường không bỏ lại ai', 'Quần đảo còn một tuyến tiếp tế cần kiểm chứng'],
  galaxy: ['bản ghi quỹ đạo đoàn tàu sao', 'Em dò tín hiệu từ vành đai, chọn quỹ đạo đưa đoàn tàu về bến', 'Đoàn tàu sao còn một quỹ đạo cần kiểm tra'],
  maze: ['mảnh mã của lối ra chung', 'Em chọn dấu mã đầu tiên để dò lối ra trước khi mê cung đổi cửa', 'Mê cung còn một mảnh mã chưa ghép'],
};
const reading = {
  modern: { title: 'UNESCO — Hoi An Ancient Town', url: 'https://whc.unesco.org/en/list/948', use: 'optional_teacher_context' },
  historical: { title: 'UNESCO — Central Sector of the Imperial Citadel of Thang Long — Hanoi', url: 'https://whc.unesco.org/en/list/1328', use: 'optional_teacher_context' },
};
const phases = {
  experience: (p, c) => `${p[0]} giữ một chi tiết về ${c}. Em quan sát dữ kiện, chọn điều cần thử và ghi lại thắc mắc của mình.`,
  guided: (p, c) => `Tại ${p[2]}, ${c} còn một bước chưa rõ. Em thử từng bước, dùng gợi ý khi cần rồi tự kiểm tra cách mình làm.`,
  formation: (p, c) => `Trong ${p[1]}, các dấu vết quanh ${c} đang khớp lại. Em tìm mối liên hệ, giải thích vì sao cách nối mình chọn hợp lý.`,
  practice: (p, c) => `${p[3]} gửi thử thách mới về ${c}. Em chọn cách kiểm tra; nếu làm nhóm, hãy góp ý của mình trước khi cùng thống nhất.`,
  recheck: (p, c) => `Trước ${p[4]}, đội cần em tự kiểm chứng ${c}. Em tự làm nhiệm vụ này, nói rõ phần mình cần hỗ trợ nếu chưa chắc.`,
  exit: (p, c) => `Em để lại lời giải của mình bên ${c} tại ${p[4]}. Hãy giữ cả cách làm lẫn câu hỏi em muốn quay lại.`,
  reflection: (p, c) => `Nhìn lại ${c}, em đã đổi cách nghĩ ở đâu? Hãy chọn một lần em sửa cách làm và kể điều khiến mình đổi ý.`,
};

export const STORY_PROFILES = Object.freeze(Object.fromEntries(Object.entries(PRODUCT_THEMES).map(([id, theme]) => {
  const [clue, action, unfinished] = details[id];
  return [id, Object.freeze({
    title: theme.title, goal: theme.goal, places: Object.freeze([...theme.places]), clue,
    opening: `${theme.intro} ${action}.`,
    cues: Object.freeze(Object.fromEntries(Object.entries(phases).map(([phase, build]) => [phase, build(theme.places, clue)]))),
    ending: `${theme.ending} Em giữ lại các ghi chép đã kiểm tra để hành trình sau có thể tiếp tục.`,
    partialEnding: `${unfinished}. Em giữ lại manh mối đã kiểm tra, chọn việc muốn tiếp tục ở lần sau.`,
    culture: Object.freeze({ kind: 'fiction', notice: 'Thế giới, nhân vật và biến cố là hư cấu; nguồn đọc thêm không xác nhận tình tiết trong truyện.',
      furtherReading: Object.freeze(reading[id] ? [Object.freeze({ ...reading[id] })] : []) }),
  })];
})));

export function storyCue({ theme = 'modern', phase, concluded = false, complete = false } = {}) {
  const profile = typeof theme === 'string' && Object.hasOwn(STORY_PROFILES, theme) ? STORY_PROFILES[theme] : STORY_PROFILES.modern;
  if (concluded === true) return complete === true ? profile.ending : profile.partialEnding;
  return typeof phase === 'string' && Object.hasOwn(profile.cues, phase) ? profile.cues[phase] : profile.opening;
}
