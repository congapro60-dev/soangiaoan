import { useState, useEffect, useCallback } from 'react';
import { AppData, DEFAULT_DATA, LessonPlan, Subject, LessonTemplate, CurriculumDistribution, GradingSession } from '../types';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { normalizePlanTitle } from '../utils/fileUtils';

const PAGE_SIZE = 20;

export const useAppState = (user: User | null, showToast: (msg: string, icon?: any) => void) => {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('smart_lesson_plan_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Đảm bảo cấu trúc dữ liệu mới nhất được hợp nhất với dữ liệu cũ
        return {
          ...DEFAULT_DATA,
          ...parsed,
          lessonPlans: parsed.lessonPlans || [],
          subjects: parsed.subjects || DEFAULT_DATA.subjects,
          templates: parsed.templates || DEFAULT_DATA.templates,
          distributions: parsed.distributions || [],
          settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
          authorName: parsed.authorName || ''
        };
      } catch (e) {
        console.error("Lỗi parse dữ liệu local", e);
        return DEFAULT_DATA;
      }
    }
    return DEFAULT_DATA;
  });

  const [communityPlans, setCommunityPlans] = useState<LessonPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPlanDoc, setLastPlanDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMorePlans, setHasMorePlans] = useState(false);
  const [lastCommunityDoc, setLastCommunityDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreCommunity, setHasMoreCommunity] = useState(false);

  // Sync ALL data to local cache — đợi 1 giây sau khi ngừng thao tác mới ghi
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('smart_lesson_plan_data', JSON.stringify(data));
    }, 1000);
    return () => clearTimeout(timer);
  }, [data]);

  // Fetch Cloud data (Plans, Templates, Settings, Distributions) when user logs in
  useEffect(() => {
    if (user) {
      const fetchCloudData = async () => {
        setIsLoading(true);
        try {
          // 1. Fetch Personal Plans (20 bài đầu tiên)
          const qPlans = query(
            collection(db, 'lessonPlans'),
            where('userId', '==', user.uid),
            orderBy('updatedAt', 'desc'),
            limit(PAGE_SIZE)
          );
          const snapPlans = await getDocs(qPlans);
          const cloudPlans: LessonPlan[] = [];
          snapPlans.forEach((doc) => {
            const p = doc.data() as LessonPlan;
            cloudPlans.push({ ...p, title: normalizePlanTitle(p.title) });
          });
          setLastPlanDoc(snapPlans.docs[snapPlans.docs.length - 1] || null);
          setHasMorePlans(snapPlans.docs.length === PAGE_SIZE);

          // 2. Fetch User Templates
          const qTemplates = query(
            collection(db, 'userTemplates'),
            where('userId', '==', user.uid)
          );
          const snapTemplates = await getDocs(qTemplates);
          const userTemplates: LessonTemplate[] = [];
          snapTemplates.forEach(doc => userTemplates.push(doc.data() as LessonTemplate));

          // 3. Fetch Settings
          const docSettings = await getDocs(query(collection(db, 'userSettings'), where('userId', '==', user.uid)));
          let cloudSettings = data.settings;
          let cloudAuthorName = data.authorName;
          if (!docSettings.empty) {
            const settingsData = docSettings.docs[0].data();
            cloudSettings = settingsData.settings;
            cloudAuthorName = settingsData.authorName || '';
          }
          // Auto-populate từ Google profile nếu chưa có tên
          if (!cloudAuthorName && user.displayName) {
            cloudAuthorName = user.displayName;
            await setDoc(doc(db, 'userSettings', user.uid), { authorName: cloudAuthorName }, { merge: true });
          }

          // 4. Fetch Distributions
          const qDist = query(collection(db, 'distributions'), where('userId', '==', user.uid));
          const snapDist = await getDocs(qDist);
          const cloudDist: CurriculumDistribution[] = [];
          snapDist.forEach(doc => cloudDist.push(doc.data() as CurriculumDistribution));

          // Combine with default templates (keep unique)
          const combinedTemplates = [...userTemplates, ...DEFAULT_DATA.templates.filter(dt => !userTemplates.some(ut => ut.id === dt.id))];

          // 5. Fetch Grading Sessions
          const qSessions = query(
            collection(db, 'gradingSessions'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
          const snapSessions = await getDocs(qSessions);
          const cloudSessions: GradingSession[] = [];
          snapSessions.forEach(d => cloudSessions.push(d.data() as GradingSession));

          setData(prev => {
            // Giữ lại các giáo án local chưa có trên cloud (tạo offline hoặc chưa kịp sync)
            const cloudPlanIds = new Set(cloudPlans.map(p => p.id));
            const localOnlyPlans = prev.lessonPlans.filter(p => !cloudPlanIds.has(p.id));
            // Merge grading sessions — cloud takes priority
            const cloudSessionIds = new Set(cloudSessions.map(s => s.id));
            const localOnlySessions = (prev.gradingSessions || []).filter(s => !cloudSessionIds.has(s.id));
            return {
              ...prev,
              lessonPlans: [...cloudPlans, ...localOnlyPlans],
              templates: combinedTemplates,
              distributions: cloudDist,
              authorName: cloudAuthorName,
              settings: { ...prev.settings, ...cloudSettings },
              gradingSessions: [...cloudSessions, ...localOnlySessions],
            };
          });
        } catch (err) {
          console.error("Error fetching cloud data", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchCloudData();
    }
  }, [user]);

  const loadMorePlans = useCallback(async () => {
    if (!user || !lastPlanDoc) return;
    try {
      const q = query(
        collection(db, 'lessonPlans'),
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc'),
        startAfter(lastPlanDoc),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const morePlans: LessonPlan[] = [];
      snap.forEach(d => {
        const p = d.data() as LessonPlan;
        morePlans.push({ ...p, title: normalizePlanTitle(p.title) });
      });
      setLastPlanDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMorePlans(snap.docs.length === PAGE_SIZE);
      setData(prev => ({ ...prev, lessonPlans: [...prev.lessonPlans, ...morePlans] }));
    } catch (e) {
      console.error("Lỗi tải thêm giáo án", e);
    }
  }, [user, lastPlanDoc]);

  const fetchCommunityPlans = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'lessonPlans'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const cp: LessonPlan[] = [];
      snap.forEach(d => {
        const p = d.data() as LessonPlan;
        cp.push({ ...p, title: normalizePlanTitle(p.title) });
      });
      setLastCommunityDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMoreCommunity(snap.docs.length === PAGE_SIZE);
      setCommunityPlans(cp);
    } catch (e) {
      console.error("Lỗi tải cộng đồng", e);
    }
  }, []);

  const loadMoreCommunity = useCallback(async () => {
    if (!lastCommunityDoc) return;
    try {
      const q = query(
        collection(db, 'lessonPlans'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        startAfter(lastCommunityDoc),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const more: LessonPlan[] = [];
      snap.forEach(d => more.push(d.data() as LessonPlan));
      setLastCommunityDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMoreCommunity(snap.docs.length === PAGE_SIZE);
      setCommunityPlans(prev => [...prev, ...more]);
    } catch (e) {
      console.error("Lỗi tải thêm cộng đồng", e);
    }
  }, [lastCommunityDoc]);

  const updateSettings = async (newSettings: Partial<AppData['settings']>) => {
    const updated = { ...data.settings, ...newSettings };
    setData(prev => ({ ...prev, settings: updated }));
    if (user) {
      try {
        // Loại bỏ API Keys trước khi ghi lên Firebase — chỉ lưu cục bộ
        const { geminiApiKey: _k1, claudeApiKey: _k2, openaiApiKey: _k3, grokApiKey: _k4, ...settingsToSync } = updated;
        await setDoc(doc(db, 'userSettings', user.uid), { userId: user.uid, settings: settingsToSync, authorName: data.authorName }, { merge: true });
      } catch (e) {
        console.error("Lỗi lưu cài đặt", e);
      }
    }
  };

  const setAuthorName = async (name: string) => {
    setData(prev => ({ ...prev, authorName: name }));
    if (user) {
      try {
        await setDoc(doc(db, 'userSettings', user.uid), { authorName: name }, { merge: true });
      } catch (e) {
        console.error("Lỗi lưu tên người soạn", e);
      }
    }
  };

  const addDistribution = async (dist: CurriculumDistribution) => {
    setData(prev => ({ ...prev, distributions: [dist, ...prev.distributions] }));
    if (user) {
      try {
        await setDoc(doc(db, 'distributions', dist.id), { ...dist, userId: user.uid });
      } catch (e) {
        showToast('Lỗi lưu phân phối lên Cloud', 'error');
      }
    }
  };

  const deleteDistribution = async (id: string) => {
    setData(prev => ({ ...prev, distributions: prev.distributions.filter(d => d.id !== id) }));
    if (user) {
      try {
        await deleteDoc(doc(db, 'distributions', id));
      } catch (e) {
        console.error("Lỗi xóa phân phối Cloud", e);
      }
    }
  };

  const addTemplate = async (template: LessonTemplate) => {
    setData(prev => ({ ...prev, templates: [template, ...prev.templates] }));
    if (user) {
      try {
        await setDoc(doc(db, 'userTemplates', template.id), { ...template, userId: user.uid });
      } catch (e) {
        showToast('Lỗi lưu mẫu lên Cloud', 'error');
      }
    }
  };

  const deleteTemplate = async (id: string) => {
    setData(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== id) }));
    if (user) {
      try {
        await deleteDoc(doc(db, 'userTemplates', id));
      } catch (e) {
        console.error("Lỗi xóa mẫu Cloud", e);
      }
    }
  };

  const updateTemplate = async (templateId: string, updatedTemplate: Partial<LessonTemplate>) => {
    setData(prev => {
      const currentTemplates = prev.templates || [];
      const newTemplates = currentTemplates.map(t => t.id === templateId ? { ...t, ...updatedTemplate } : t);
      return { ...prev, templates: newTemplates };
    });
    if (user) {
      const target = data.templates.find(t => t.id === templateId);
      if (target) {
        const updated = { ...target, ...updatedTemplate };
        try {
          await setDoc(doc(db, 'userTemplates', templateId), { ...updated, userId: user.uid }, { merge: true });
        } catch (e) {
          console.error("Lỗi cập nhật mẫu Cloud", e);
        }
      }
    }
  };

  const deleteFile = async (templateId: string, fileId: string) => {
    setData(prev => {
      const currentTemplates = prev.templates || [];
      const newTemplates = currentTemplates.map(t =>
        t.id === templateId ? { ...t, files: (t.files || []).filter(f => f.id !== fileId) } : t
      );
      return { ...prev, templates: newTemplates };
    });
    if (user) {
      const target = data.templates.find(t => t.id === templateId);
      if (target) {
        const updatedFiles = (target.files || []).filter(f => f.id !== fileId);
        try {
          await setDoc(doc(db, 'userTemplates', templateId), { ...target, files: updatedFiles, userId: user.uid }, { merge: true });
        } catch (e) {
          console.error("Lỗi xóa file Cloud", e);
        }
      }
    }
  };

  const saveGradingSession = async (session: GradingSession) => {
    setData(prev => ({
      ...prev,
      gradingSessions: [session, ...(prev.gradingSessions || []).filter(s => s.id !== session.id)]
    }));
    if (user) {
      try {
        // Strip file content before saving to Firestore (too large)
        const sessionToSave = {
          ...session,
          userId: user.uid,
          masterFiles: (session.masterFiles || []).map(f => ({ ...f, content: '' })),
        };
        await setDoc(doc(db, 'gradingSessions', session.id), sessionToSave);
      } catch (e) {
        console.error('Lỗi lưu phiên chấm Cloud', e);
      }
    }
  };

  const deleteGradingSession = async (id: string) => {
    setData(prev => ({
      ...prev,
      gradingSessions: (prev.gradingSessions || []).filter(s => s.id !== id)
    }));
    if (user) {
      try {
        await deleteDoc(doc(db, 'gradingSessions', id));
      } catch (e) {
        console.error('Lỗi xóa phiên chấm Cloud', e);
      }
    }
  };

  const deleteGradingResult = async (sessionId: string, resultId: string) => {
    const session = data.gradingSessions?.find(s => s.id === sessionId);
    if (!session) return;
    const updatedSession = { ...session, results: session.results.filter(r => r.id !== resultId) };
    setData(prev => ({
      ...prev,
      gradingSessions: (prev.gradingSessions || []).map(s => s.id === sessionId ? updatedSession : s)
    }));
    if (user) {
      try {
        await setDoc(doc(db, 'gradingSessions', sessionId), updatedSession);
      } catch (e) {
        console.error('Lỗi xóa kết quả Cloud', e);
      }
    }
  };

  return {
    data,
    setData,
    communityPlans,
    isLoading,
    setIsLoading,
    updateSettings,
    setAuthorName,
    addDistribution,
    deleteDistribution,
    addTemplate,
    deleteTemplate,
    updateTemplate,
    deleteFile,
    fetchCommunityPlans,
    loadMorePlans,
    hasMorePlans,
    loadMoreCommunity,
    hasMoreCommunity,
    saveGradingSession,
    deleteGradingSession,
    deleteGradingResult,
  };
};

