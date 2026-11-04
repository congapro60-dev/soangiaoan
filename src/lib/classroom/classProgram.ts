import { asProgram, type Program } from './reportStage';

/**
 * Chương trình học của lớp (TDS hay MOET) — quyết định học kì của các bài mà hai chương trình xếp khác nhau
 * (khối 11 Bài 18–19, khối 12 Bài 12–14) khi lọc báo cáo phụ huynh theo giai đoạn. Lưu trên máy giáo viên theo từng lớp.
 */
const key = (classId: string) => `smartplan.classProgram.${classId}`;

export const loadClassProgram = (classId: string): Program | null => {
  try { return asProgram(localStorage.getItem(key(classId))); } catch { return null; }
};

export const saveClassProgram = (classId: string, program: Program | null): void => {
  try {
    if (program) localStorage.setItem(key(classId), program);
    else localStorage.removeItem(key(classId));
  } catch { /* không lưu được thì dùng tạm trong phiên */ }
};
