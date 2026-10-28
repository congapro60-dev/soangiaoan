import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db, removeUndefinedFields } from '../lib/firebase';
import { sampleAdaptiveLesson } from '../lib/adaptive/sampleAdaptiveLesson';
import { AdaptiveLesson, DEFAULT_LESSON_KIND } from '../lib/adaptive/types';

const COL = 'adaptiveLessons';

interface LegacyAdaptiveLessonDocument {
  id?: string;
  teacherId?: string;
  lessonId?: string;
  title?: string;
  lesson?: AdaptiveLesson;
}

function normalizeAdaptiveLessonDocument(raw: unknown, fallbackId?: string): AdaptiveLesson | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Partial<AdaptiveLesson> & LegacyAdaptiveLessonDocument;
  const lesson = data.lesson && typeof data.lesson === 'object'
    ? { ...data.lesson }
    : ({ ...data } as AdaptiveLesson);

  if (!lesson || typeof lesson !== 'object') return null;
  if (!lesson.id) lesson.id = data.lessonId || data.id || fallbackId || '';
  if (!lesson.teacherId && data.teacherId) lesson.teacherId = data.teacherId;
  if (!lesson.title && data.title) lesson.title = data.title;
  // Bài tạo trước khi tách "tự học / tương tác" không có lessonKind → mặc định tự học.
  if (!lesson.lessonKind) lesson.lessonKind = DEFAULT_LESSON_KIND;

  return lesson.id ? lesson : null;
}

export async function saveLessonToFirestore(lesson: AdaptiveLesson): Promise<void> {
  // portalEnabled cho phép học sinh ẩn danh đọc bài qua link cổng (khớp firestore.rules).
  // Bật khi đã xuất bản, tắt khi nháp/lưu trữ — để bài chưa publish vẫn kín với người lạ.
  await setDoc(
    doc(db, COL, lesson.id),
    removeUndefinedFields({ ...lesson, portalEnabled: lesson.status === 'published' }),
  );
}

export async function updateLessonInFirestore(lessonId: string, patch: Partial<AdaptiveLesson>): Promise<void> {
  await updateDoc(doc(db, COL, lessonId), removeUndefinedFields(patch));
}

export async function getLessonFromFirestore(lessonId: string): Promise<AdaptiveLesson | null> {
  if (lessonId === sampleAdaptiveLesson.id || lessonId === 'sample') return { ...sampleAdaptiveLesson };

  const snap = await getDoc(doc(db, COL, lessonId));
  return snap.exists() ? normalizeAdaptiveLessonDocument(snap.data(), snap.id) : null;
}

export interface SelfStudyLibraryItem {
  id: string;
  title: string;
  grade: string;
  week: string;
  period: number | null;
  updatedAt: string;
}

/**
 * 10 tiết Tuần 11 — map adaptive id (bài tự học tạo từ giáo án nguồn) sang tuần/tiết
 * chuẩn của app. Các bài nguồn có curriculumRef.week = "Dạy thử" (dữ liệu giáo án)
 * → override để HS nhận ra bài tuần mình trên Thư viện học lại (thầy 28/10).
 */
const SELF_STUDY_WEEK11_OVERRIDE: Readonly<Record<string, { week: string; period: number }>> = {
  'adaptive-1792827090625': { week: '11', period: 79 }, // 10-11-79 — Số gần đúng và sai số
  'adaptive-1792826324771': { week: '11', period: 80 }, // 10-11-80 — Các số đặc trưng đo xu thế trung tâm
  'adaptive-1792831747929': { week: '11', period: 75 }, // 11-11-75 — Mẫu số liệu ghép nhóm
  'adaptive-1792831154099': { week: '11', period: 76 }, // 11-11-76 — Các số đặc trưng đo xu thế trung tâm
  'adaptive-1792827844375': { week: '11', period: 78 }, // 11-11-78 — Hai mặt phẳng song song Tiết 2
  'adaptive-1792828475281': { week: '11', period: 79 }, // 11-11-79 — Hai mặt phẳng song song Tiết 3
  'adaptive-1792832396461': { week: '11', period: 77 }, // 12-11-77 — Nguyên hàm Tiết 2
  'adaptive-1792834706906': { week: '11', period: 80 }, // 12-11-80 — Phương sai và độ lệch chuẩn
  'adaptive-1792833009074': { week: '11', period: 78 }, // 12-11-78 — Khoảng biến thiên Tiết 1
  'adaptive-1792833650874': { week: '11', period: 79 }, // 12-11-79 — Mức độ phân tán Tiết 2
};

/**
 * Thư viện học lại — mọi HS xem được: các bài TỰ HỌC PHÂN HOÁ đã xuất bản
 * (portalEnabled == true khớp firestore.rules). Không lọc theo lớp: bất kỳ HS nào
 * cũng vào list để xem và chọn bài học lại (yêu cầu thầy 28/10).
 */
export async function listPublishedSelfStudyLessons(): Promise<SelfStudyLibraryItem[]> {
  const q = query(collection(db, COL), where('portalEnabled', '==', true));
  const snap = await getDocs(q);
  const items: SelfStudyLibraryItem[] = [];
  snap.forEach((docSnap) => {
    const lesson = normalizeAdaptiveLessonDocument(docSnap.data(), docSnap.id);
    if (!lesson || lesson.lessonKind !== 'self_study' || lesson.status !== 'published') return;
    const override = SELF_STUDY_WEEK11_OVERRIDE[lesson.id];
    items.push({
      id: lesson.id,
      title: lesson.title || 'Bài tự học phân hoá',
      grade: String(lesson.grade || ''),
      week: /^\d+$/.test((lesson.curriculumRef?.week || '').trim())
        ? lesson.curriculumRef!.week!.trim()
        : (override ? override.week : ''),
      period: override
        ? override.period
        : (typeof lesson.curriculumRef?.period === 'number' ? lesson.curriculumRef.period : null),
      updatedAt: lesson.updatedAt || '',
    });
  });
  items.sort((a, b) => a.grade.localeCompare(b.grade, 'vi')
    || String(a.period ?? '').localeCompare(String(b.period ?? ''), 'vi', { numeric: true })
    || a.title.localeCompare(b.title, 'vi'));
  return items;
}

export async function listLessonsForTeacher(teacherId: string): Promise<AdaptiveLesson[]> {
  const q = query(collection(db, COL), where('teacherId', '==', teacherId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => normalizeAdaptiveLessonDocument(d.data(), d.id))
    .filter((lesson): lesson is AdaptiveLesson => Boolean(lesson));
}

export async function deleteLessonFromFirestore(lessonId: string): Promise<void> {
  await deleteDoc(doc(db, COL, lessonId));
}
