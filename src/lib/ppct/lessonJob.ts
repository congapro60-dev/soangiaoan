// Chuyển một TIẾT trong phân phối chương trình thành đầu vào soạn giáo án.
//
// Ba hàm dưới đây trước nằm private trong `components/features/creator/LessonControls.tsx` nên
// không test được. Dời ra đây vì hàng đợi soạn theo PPCT cần dùng đúng chúng — nếu chép lại thì
// tiêu đề và yêu cầu của đường soạn đơn với đường soạn hàng loạt sẽ trôi khác nhau.
//
// LOGIC GIỮ NGUYÊN XI bản cũ, không sửa một ký tự nào.

import type { PpctLesson, PpctProgram, PpctSource } from '../../data/ppct';
import type { ToanKeHoach } from '../../types';

/**
 * Tiêu đề giáo án phải phân biệt được từng tiết: một bài "Mệnh đề" có thể trải 4 tiết, lưu cả
 * bốn cùng tên thì trong thư viện lẫn trên Drive không biết đâu là đâu.
 * Ưu tiên số tiết mà chính PPCT ghi trong ô nội dung ("Tiết 3: ..."), vì nó đếm theo cả bài
 * chứ không reset theo tuần.
 */
export const buildTitle = (lesson: PpctLesson): string => {
  if (lesson.isElective) {
    return `Tiết tự chọn — Tuần ${lesson.week}${lesson.periodNo ? `, tiết ${lesson.periodNo}` : ''}`;
  }
  const nhanTiet = lesson.detail.match(/^\s*Ti[êế]t\s*(\d+)/i)?.[1];
  if (nhanTiet) return `${lesson.title} — Tiết ${nhanTiet}`;
  if (lesson.periodCount > 1) return `${lesson.title} — Tiết ${lesson.periodIndex}/${lesson.periodCount}`;
  return lesson.title;
};

/** Mẫu giáo án ban Toán có ba kế hoạch; đoán từ chính chữ của PPCT, giáo viên đổi lại được. */
export const suyRaKeHoach = (lesson: PpctLesson): ToanKeHoach | null => {
  const text = `${lesson.title} ${lesson.detail}`.toLowerCase();
  // Tiết CHỮA / TRẢ BÀI là tiết dạy thật — giáo viên chữa đề, phân tích lỗi sai, chốt cách làm.
  // Phải xét TRƯỚC luật loại trừ bên dưới vì tên nó cũng chứa chữ "kiểm tra"; trước đây cả 9
  // tiết loại này của TDS lớp 10 bị gộp nhầm vào nhóm "không soạn được".
  if (/chữa|trả\s*bài/.test(text)) return 'luyen_tap';
  // Tiết học sinh làm bài thì không hợp kế hoạch dạy học nào.
  if (/kiểm tra|đề thi/.test(text)) return null;
  if (/luyện tập|bài tập|ôn tập|thực hành/.test(text)) return 'luyen_tap';
  return 'kien_thuc';
};

/**
 * Gói bài đã chọn thành yêu cầu soạn, giữ nguyên chữ của PPCT để AI không tự bịa mục tiêu.
 * Toàn bộ khối này là DỮ LIỆU ĐẦU VÀO — không được đổi bố cục mẫu giáo án người dùng đã chọn.
 */
export const buildRequirement = (
  lesson: PpctLesson,
  source: PpctSource,
  grade: number,
  schoolYear: string,
  unitPlanContext?: string,
  /**
   * Chỉ dùng cho TIẾT TỰ CHỌN khi soạn hàng loạt: bối cảnh các tiết chính trong tuần, để AI tự
   * chọn nội dung. Bỏ trống (đường soạn đơn) thì vẫn để chỗ trống cho giáo viên tự điền.
   */
  goiYTuChon?: string,
): string => {
  const viTri = lesson.periodCount > 1
    ? `tiết ${lesson.periodIndex}/${lesson.periodCount} của bài này`
    : 'bài dạy 1 tiết';
  const parts = [
    `Soạn ${viTri}, theo phân phối chương trình ${source} lớp ${grade}, tuần ${lesson.week}` +
      (lesson.periodNo ? `, tiết ${lesson.periodNo} của năm học.` : '.'),
    `Điền đúng vào các ô sẵn có ở đầu giáo án: Lớp ${grade} · Tuần học ${lesson.week} · Năm học ${schoolYear}.`,
    lesson.isElective && (goiYTuChon
      ? goiYTuChon
      : 'Đây là TIẾT TỰ CHỌN: phân phối chương trình để trống nội dung, giáo viên tự quyết dạy gì. '
        + 'Hãy điền nội dung muốn dạy vào dòng dưới đây trước khi bấm soạn.\nNỘI DUNG TỰ CHỌN: '),
    lesson.subject && `Phân môn: ${lesson.subject}.`,
    lesson.detail && `\nNội dung của chính tiết này theo PPCT:\n${lesson.detail}`,
    lesson.objectives && `\n${source === 'MOET' ? 'Yêu cầu cần đạt' : 'Mục tiêu'} của cả bài (trích nguyên văn PPCT):\n${lesson.objectives}`,
    lesson.notes && `\nGhi chú: ${lesson.notes}`,
    unitPlanContext && `\n${unitPlanContext}`,
    '\nLƯU Ý: các thông tin trên chỉ là tư liệu nội dung. Giữ nguyên bố cục và các mục của mẫu giáo án đã chọn, không thêm bớt mục nào.',
  ];
  return parts.filter(Boolean).join('\n');
};

// ── Hàng đợi soạn theo PPCT ───────────────────────────────────────────────────

/** Một tiết đã sẵn sàng đưa vào bộ sinh giáo án. */
export interface PpctJob {
  /** id của tiết trong PPCT — dùng làm khoá ghi nhớ tiến độ, phải ổn định. */
  lessonId: string;
  title: string;
  requirement: string;
  keHoach: ToanKeHoach;
  week: number;
  periodNo: number | null;
  subject: string;
}

export interface QueuePlan {
  jobs: PpctJob[];
  /** Các tiết CỐ Ý không soạn, kèm lý do — giáo viên phải biết mình còn nợ gì. */
  skipped: {
    elective: PpctLesson[];
    kiemTra: PpctLesson[];
  };
}

const weekOf = (lesson: PpctLesson): number => lesson.week ?? lesson.weeks[0] ?? 0;

/** Tiết có soạn được không — dùng chung cho việc lọc hàng đợi và việc dò tiêu đề trùng. */
const soanDuoc = (lesson: PpctLesson): boolean => !lesson.isElective && suyRaKeHoach(lesson) !== null;

/**
 * Tiết tự chọn trong PPCT rỗng hoàn toàn: không nội dung, không mục tiêu, không cả phân môn.
 * Thứ duy nhất định vị được nó là TIẾN ĐỘ CỦA CHÍNH TUẦN ĐÓ. Gom các tiết chính cùng tuần làm
 * bối cảnh; tuần nào không có tiết chính nào thì lùi về tuần liền trước.
 */
const boiCanhTuChon = (program: PpctProgram, week: number): string => {
  const moTa = (l: PpctLesson): string =>
    `- ${[l.subject, l.title, l.detail.split('\n')[0]].filter(Boolean).join(' | ')}`;

  let nguon = program.lessons.filter((l) => weekOf(l) === week && soanDuoc(l));
  let tuanNguon = week;
  if (nguon.length === 0 && week > 1) {
    nguon = program.lessons.filter((l) => weekOf(l) === week - 1 && soanDuoc(l));
    tuanNguon = week - 1;
  }

  const dong = [
    'Đây là TIẾT TỰ CHỌN: phân phối chương trình để trống nội dung, giáo viên tự quyết dạy gì.',
    'Hãy TỰ CHỌN nội dung bám sát tiến độ của chính tuần này rồi soạn thành một tiết hoàn chỉnh.',
  ];
  if (nguon.length) {
    dong.push(
      `\nCác tiết chính ${tuanNguon === week ? `trong tuần ${week}` : `của tuần ${tuanNguon} (tuần liền trước)`}:`,
      ...nguon.slice(0, 8).map(moTa),
    );
  }
  dong.push(
    '\nĐịnh hướng chọn nội dung: ưu tiên luyện tập, củng cố, chữa lỗi sai hoặc mở rộng vừa sức cho ĐÚNG',
    'những nội dung ở trên. TUYỆT ĐỐI KHÔNG dạy trước nội dung của các tuần sau.',
    'Ghi rõ ngay đầu giáo án nội dung tự chọn đã chọn và lý do chọn, để giáo viên đổi lại được nếu muốn.',
  );
  return dong.join('\n');
};

/**
 * `buildTitle` chỉ phân biệt được các tiết TRONG CÙNG MỘT BÀI. Trên dữ liệu thật, nhiều bài
 * khác nhau lại trùng tên: riêng TDS lớp 10 có 28 tiêu đề trùng, ảnh hưởng 82 tiết —
 * "Ôn tập cuối HK1 — Tiết 1/3" xuất hiện 5 lần ở ba tuần và hai phân môn. Soạn hàng loạt mà
 * để vậy thì thư viện có 5 giáo án cùng tên, không biết cái nào của tuần nào.
 *
 * Chỉ thêm hậu tố cho những tiêu đề THẬT SỰ trùng, và tính trên TOÀN BỘ chương trình chứ không
 * phải trên khoảng tuần đang chọn — nhờ vậy soạn tuần 1–10 hay soạn cả năm đều ra cùng một tên,
 * chạy nhiều lô không đẻ ra bản trùng.
 *
 * Cố ý KHÔNG sửa `buildTitle`: đường soạn đơn đang dùng nó, đổi là đổi hành vi đang chạy tốt.
 */
const dungBoDatTen = (lessons: PpctLesson[]): ((lesson: PpctLesson) => string) => {
  const dem = new Map<string, number>();
  for (const l of lessons) {
    if (!soanDuoc(l)) continue;
    const t = buildTitle(l);
    dem.set(t, (dem.get(t) ?? 0) + 1);
  }
  return (lesson: PpctLesson): string => {
    const goc = buildTitle(lesson);
    if ((dem.get(goc) ?? 0) <= 1) return goc;
    const phan = [lesson.subject, `tuần ${weekOf(lesson)}`].filter(Boolean).join(', ');
    const themPhanMon = `${goc} (${phan})`;
    // Cùng bài, cùng phân môn, cùng tuần thì chỉ còn số tiết trong năm phân biệt được.
    const conTrung = lessons.filter(
      (l) => soanDuoc(l) && buildTitle(l) === goc && l.subject === lesson.subject && weekOf(l) === weekOf(lesson),
    ).length > 1;
    return conTrung && lesson.periodNo ? `${goc} (${phan}, tiết ${lesson.periodNo})` : themPhanMon;
  };
};

/**
 * Dựng hàng đợi từ một khoảng tuần của PPCT.
 *
 * Hai nhóm bị loại và lý do:
 *  - `isElective` — PPCT để trống nội dung, chỉ giáo viên mới biết định dạy gì. Máy soạn thay
 *    là bịa.
 *  - `suyRaKeHoach` trả `null` (kiểm tra / trả bài / đề thi) — không hợp mẫu giáo án nào trong
 *    ba kế hoạch của ban Toán.
 *
 * Thứ tự trả về bám đúng thứ tự dạy: tuần tăng dần, trong tuần thì theo tiết của năm học.
 */
export const buildQueue = (opts: {
  program: PpctProgram;
  fromWeek: number;
  toWeek: number;
  /** Lọc theo phân môn (Đại số / Hình học). Bỏ trống = lấy hết. */
  subjects?: string[];
  unitPlanContext?: string;
  /**
   * Soạn cả tiết tự chọn, để AI tự chọn nội dung theo tiến độ tuần. Mặc định BẬT — chủ dự án
   * chốt là tiết tự chọn cũng phải có bài, không để trống.
   */
  soanTuChon?: boolean;
}): QueuePlan => {
  const { program, fromWeek, toWeek, subjects, unitPlanContext, soanTuChon = true } = opts;
  const lo = Math.min(fromWeek, toWeek);
  const hi = Math.max(fromWeek, toWeek);

  const inRange = program.lessons.filter((l) => {
    const w = weekOf(l);
    if (w < lo || w > hi) return false;
    if (subjects && subjects.length > 0 && !subjects.includes(l.subject)) return false;
    return true;
  });

  const elective: PpctLesson[] = [];
  const kiemTra: PpctLesson[] = [];
  const jobs: PpctJob[] = [];
  const datTen = dungBoDatTen(program.lessons);

  for (const lesson of inRange) {
    if (lesson.isElective && !soanTuChon) {
      elective.push(lesson);
      continue;
    }
    // Tiết tự chọn luôn soạn theo kế hoạch luyện tập: nó là tiết củng cố tiến độ trong tuần.
    const keHoach = lesson.isElective ? 'luyen_tap' : suyRaKeHoach(lesson);
    if (!keHoach) {
      kiemTra.push(lesson);
      continue;
    }
    jobs.push({
      lessonId: lesson.id,
      title: datTen(lesson),
      requirement: buildRequirement(
        lesson, program.source, program.grade, program.schoolYear, unitPlanContext,
        lesson.isElective ? boiCanhTuChon(program, weekOf(lesson)) : undefined,
      ),
      keHoach,
      week: weekOf(lesson),
      periodNo: lesson.periodNo,
      subject: lesson.subject,
    });
  }

  // Tiết chưa có số thứ tự trong năm xếp sau các tiết đã có, giữ nguyên thứ tự gốc giữa chúng.
  jobs.sort((a, b) =>
    a.week - b.week || (a.periodNo ?? Number.MAX_SAFE_INTEGER) - (b.periodNo ?? Number.MAX_SAFE_INTEGER));

  return { jobs, skipped: { elective, kiemTra } };
};
