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
    items.push({
      id: lesson.id,
      title: lesson.title || 'Bài tự học phân hoá',
      grade: String(lesson.grade || ''),
      week: lesson.curriculumRef?.week || '',
      period: typeof lesson.curriculumRef?.period === 'number' ? lesson.curriculumRef.period : null,
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
