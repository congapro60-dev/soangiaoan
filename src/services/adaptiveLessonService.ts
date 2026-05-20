import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdaptiveLesson } from '../lib/adaptive/types';

const COL = 'adaptiveLessons';

export async function saveLessonToFirestore(lesson: AdaptiveLesson): Promise<void> {
  await setDoc(doc(db, COL, lesson.id), lesson);
}

export async function updateLessonInFirestore(lessonId: string, patch: Partial<AdaptiveLesson>): Promise<void> {
  await updateDoc(doc(db, COL, lessonId), patch);
}

export async function getLessonFromFirestore(lessonId: string): Promise<AdaptiveLesson | null> {
  const snap = await getDoc(doc(db, COL, lessonId));
  return snap.exists() ? (snap.data() as AdaptiveLesson) : null;
}

export async function listLessonsForTeacher(teacherId: string): Promise<AdaptiveLesson[]> {
  const q = query(collection(db, COL), where('teacherId', '==', teacherId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as AdaptiveLesson);
}

export async function deleteLessonFromFirestore(lessonId: string): Promise<void> {
  await deleteDoc(doc(db, COL, lessonId));
}
