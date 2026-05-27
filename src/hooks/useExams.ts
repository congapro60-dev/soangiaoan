import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, getDocs, doc, setDoc, deleteDoc,
  getDoc, orderBy, updateDoc
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { Exam, ExamSubmission } from '../types';

const normalizeExam = (e: Exam): Exam => {
  const {
    proctorMode = 'off',
    showResultWhen = 'submit',
    hideLeaderboard = false,
    tfScoringMode = 'all_or_nothing',
    allowReview = true,
    shuffleQuestions = false,
    maxAttempts = 0,
    ...rest
  } = e;

  return {
    ...rest,
    proctorMode,
    showResultWhen,
    hideLeaderboard,
    tfScoringMode,
    allowReview,
    shuffleQuestions,
    maxAttempts,
  };
};

export const getSubmissions = async (examId: string): Promise<ExamSubmission[]> => {
  const q = query(collection(db, 'examSubmissions'), where('examId', '==', examId));
  const snap = await getDocs(q);
  const list: ExamSubmission[] = [];
  snap.forEach(d => list.push(d.data() as ExamSubmission));
  return list.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
};

export const useExams = (user: User | null) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMyExams = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'exams'),
        where('teacherId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const list: Exam[] = [];
      snap.forEach(d => list.push(normalizeExam(d.data() as Exam)));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExams(list);
    } catch (e) {
      console.error('Lỗi tải danh sách đề thi:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchMyExams();
  }, [user, fetchMyExams]);

  const saveExam = async (exam: Exam) => {
    if (!user) throw new Error('Chưa đăng nhập');
    await setDoc(doc(db, 'exams', exam.id), exam);
    setExams(prev => {
      const idx = prev.findIndex(e => e.id === exam.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = exam;
        return copy;
      }
      return [exam, ...prev];
    });
  };

  const deleteExam = async (id: string) => {
    await deleteDoc(doc(db, 'exams', id));
    setExams(prev => prev.filter(e => e.id !== id));
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await updateDoc(doc(db, 'exams', id), { isActive, updatedAt: new Date().toISOString() });
    setExams(prev => prev.map(e => e.id === id ? { ...e, isActive } : e));
  };

  return { exams, loading, fetchMyExams, saveExam, deleteExam, toggleActive };
};

export const findExamByCode = async (code: string): Promise<Exam | null> => {
  const q = query(
    collection(db, 'exams'),
    where('code', '==', code.toUpperCase()),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return normalizeExam(snap.docs[0].data() as Exam);
};

const fillSecureRandom = (random: Uint8Array): void => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(random as Uint8Array<ArrayBuffer>);
    return;
  }
  for (let index = 0; index < random.length; index += 1) {
    random[index] = Math.floor(Math.random() * 256);
  }
};

export const createSubmissionId = (): string => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return `sub_${globalThis.crypto.randomUUID()}`;
  }
  const random = new Uint8Array(16);
  fillSecureRandom(random);
  return `sub_${Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('')}`;
};

export const createSubmissionNonce = (): string => {
  const random = new Uint8Array(18);
  fillSecureRandom(random);
  return Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const createSubmission = async (submission: ExamSubmission): Promise<string> => {
  await setDoc(doc(db, 'examSubmissions', submission.id), submission);
  return submission.id;
};

export const updateSubmission = async (
  id: string,
  patch: Partial<ExamSubmission>
): Promise<void> => {
  await updateDoc(doc(db, 'examSubmissions', id), patch);
};

export const getSubmission = async (id: string): Promise<ExamSubmission | null> => {
  const snap = await getDoc(doc(db, 'examSubmissions', id));
  return snap.exists() ? (snap.data() as ExamSubmission) : null;
};

export const getExamById = async (id: string): Promise<Exam | null> => {
  const snap = await getDoc(doc(db, 'exams', id));
  return snap.exists() ? normalizeExam(snap.data() as Exam) : null;
};

export const updateExam = async (id: string, patch: Partial<Exam>): Promise<void> => {
  await updateDoc(doc(db, 'exams', id), { ...patch, updatedAt: new Date().toISOString() });
};
