import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db, removeUndefinedFields } from '../lib/firebase';
import { sampleAdaptiveLesson } from '../lib/adaptive/sampleAdaptiveLesson';
import { AdaptiveLesson } from '../lib/adaptive/types';

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

  return lesson.id ? lesson : null;
}

export async function saveLessonToFirestore(lesson: AdaptiveLesson): Promise<void> {
  await setDoc(doc(db, COL, lesson.id), removeUndefinedFields(lesson));
}

export async function updateLessonInFirestore(lessonId: string, patch: Partial<AdaptiveLesson>): Promise<void> {
  await updateDoc(doc(db, COL, lessonId), removeUndefinedFields(patch));
}

export async function getLessonFromFirestore(lessonId: string): Promise<AdaptiveLesson | null> {
  if (lessonId === sampleAdaptiveLesson.id || lessonId === 'sample') return { ...sampleAdaptiveLesson };

  const snap = await getDoc(doc(db, COL, lessonId));
  return snap.exists() ? normalizeAdaptiveLessonDocument(snap.data(), snap.id) : null;
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
