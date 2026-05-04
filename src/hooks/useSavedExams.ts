import { useState, useEffect, useCallback } from 'react';
import {
  collection, query, where, getDocs, doc, setDoc, deleteDoc,
  orderBy, updateDoc
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';

export interface SavedExam {
  id: string;
  title: string;
  content: string;        // Markdown thô từ Bảng Kiểm tra
  subject?: string;
  grade?: string;
  authorName: string;
  userId: string;
  isPublic: boolean;
  questionCount?: number; // Ước tính số câu (đếm từ Markdown)
  createdAt: string;
  updatedAt: string;
}

/** Ước tính số câu hỏi từ nội dung Markdown */
export const estimateQuestionCount = (markdown: string): number => {
  const matches = markdown.match(/^(Câu\s+\d+|##?\s*\d+\.|^\d+\.)/gim);
  return matches ? matches.length : 0;
};

export const useSavedExams = (user: User | null) => {
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  const [communityExams, setCommunityExams] = useState<SavedExam[]>([]);
  const [loading, setLoading] = useState(false);

  /** Tải đề của tôi */
  const fetchMyExams = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'savedExams'),
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      const snap = await getDocs(q);
      const list: SavedExam[] = [];
      snap.forEach(d => list.push(d.data() as SavedExam));
      setSavedExams(list);
    } catch (e) {
      console.error('Lỗi tải danh sách đề đã lưu:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /** Tải đề Kho chung */
  const fetchCommunityExams = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'savedExams'),
        where('isPublic', '==', true),
        orderBy('updatedAt', 'desc')
      );
      const snap = await getDocs(q);
      const list: SavedExam[] = [];
      snap.forEach(d => list.push(d.data() as SavedExam));
      setCommunityExams(list);
    } catch (e) {
      console.error('Lỗi tải kho chung đề thi:', e);
    }
  }, []);

  useEffect(() => {
    if (user) fetchMyExams();
  }, [user, fetchMyExams]);

  /** Lưu / cập nhật đề */
  const saveExam = async (exam: SavedExam) => {
    if (!user) throw new Error('Chưa đăng nhập');
    await setDoc(doc(db, 'savedExams', exam.id), exam);
    setSavedExams(prev => {
      const idx = prev.findIndex(e => e.id === exam.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = exam;
        return copy;
      }
      return [exam, ...prev];
    });
  };

  /** Xóa đề */
  const deleteExam = async (id: string) => {
    await deleteDoc(doc(db, 'savedExams', id));
    setSavedExams(prev => prev.filter(e => e.id !== id));
  };

  /** Bật/tắt chia sẻ lên Kho chung */
  const toggleShareExam = async (id: string, isPublic: boolean) => {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'savedExams', id), { isPublic, updatedAt: now });
    setSavedExams(prev => prev.map(e => e.id === id ? { ...e, isPublic, updatedAt: now } : e));
  };

  return {
    savedExams, communityExams, loading,
    fetchMyExams, fetchCommunityExams,
    saveExam, deleteExam, toggleShareExam,
  };
};
