import { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, DEFAULT_DATA, LessonPlan, Subject, LessonTemplate, CurriculumDistribution, GradingSession, TeacherClass } from '../types';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { normalizePlanTitle } from '../utils/fileUtils';

const PAGE_SIZE = 20;
const LOCAL_CACHE_KEY = 'smart_lesson_plan_data';

const buildLocalCache = (data: AppData) => ({
  settings: data.settings,
  authorName: data.authorName,
  classes: data.classes,
});

const fetchCollectionSafely = async <T,>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await loader();
  } catch (error) {
    console.error(`Error fetching ${label}`, error);
    return fallback;
  }
};

export const useAppState = (user: User | null, showToast: (msg: string, icon?: any) => void) => {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem(LOCAL_CACHE_KEY);
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
          classes: parsed.classes || [],
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
  // Chỉ bật sync lớp học lên cloud SAU khi đã đọc xong userSettings — tránh ghi đè dữ liệu cloud bằng state cục bộ lúc mới đăng nhập
  const cloudClassesReadyRef = useRef(false);

  // Sync only lightweight local preferences/API keys/classes to avoid localStorage quota pressure.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(buildLocalCache(data)));
      } catch (error) {
        console.error('Lỗi lưu cache cục bộ', error);
        showToast('Bộ nhớ trình duyệt đã đầy, không thể lưu cache cục bộ.', 'warning');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [data.settings, data.authorName, data.classes, showToast]);

  // Fetch Cloud data (Plans, Templates, Settings, Distributions) when user logs in
  useEffect(() => {
    if (user) {
      const fetchCloudData = async () => {
        setIsLoading(true);
        try {
          const cloudPlansResult = await fetchCollectionSafely('lessonPlans', async () => {
            const qPlans = query(
              collection(db, 'lessonPlans'),
              where('userId', '==', user.uid),
              orderBy('updatedAt', 'desc'),
              limit(PAGE_SIZE)
            );
            const snapPlans = await getDocs(qPlans);
            const plans: LessonPlan[] = [];
            snapPlans.forEach((doc) => {
              const p = doc.data() as LessonPlan;
              plans.push({ ...p, title: normalizePlanTitle(p.title) });
            });
            return { plans, lastDoc: snapPlans.docs[snapPlans.docs.length - 1] || null, hasMore: snapPlans.docs.length === PAGE_SIZE };
          }, { plans: [] as LessonPlan[], lastDoc: null as QueryDocumentSnapshot<DocumentData> | null, hasMore: false });
          setLastPlanDoc(cloudPlansResult.lastDoc);
          setHasMorePlans(cloudPlansResult.hasMore);

          const userTemplates = await fetchCollectionSafely('userTemplates', async () => {
            const qTemplates = query(collection(db, 'userTemplates'), where('userId', '==', user.uid));
            const snapTemplates = await getDocs(qTemplates);
            const templates: LessonTemplate[] = [];
            snapTemplates.forEach(doc => templates.push(doc.data() as LessonTemplate));
            return templates;
          }, [] as LessonTemplate[]);

          const cloudSettingsResult = await fetchCollectionSafely('userSettings', async () => {
            const docSnap = await getDoc(doc(db, 'userSettings', user.uid));
            let cloudSettings = data.settings;
            let cloudAuthorName = data.authorName;
            let cloudClasses: TeacherClass[] | null = null;
            if (docSnap.exists()) {
              const settingsData = docSnap.data();
              if (settingsData.settings) {
                const { geminiApiKey, claudeApiKey, openaiApiKey, grokApiKey, deepseekApiKey, ...rest } = settingsData.settings;
                cloudSettings = { ...cloudSettings, ...rest };
              }
              cloudAuthorName = settingsData.authorName || '';
              if (Array.isArray(settingsData.classes)) {
                cloudClasses = settingsData.classes as TeacherClass[];
              }
            }
            if (!cloudAuthorName && user.displayName) {
              cloudAuthorName = user.displayName;
              await setDoc(doc(db, 'userSettings', user.uid), { authorName: cloudAuthorName }, { merge: true });
            }
            return { cloudSettings, cloudAuthorName, cloudClasses };
          }, { cloudSettings: data.settings, cloudAuthorName: data.authorName, cloudClasses: null as TeacherClass[] | null });

          const cloudDist = await fetchCollectionSafely('distributions', async () => {
            const qDist = query(collection(db, 'distributions'), where('userId', '==', user.uid));
            const snapDist = await getDocs(qDist);
            const distributions: CurriculumDistribution[] = [];
            snapDist.forEach(doc => distributions.push(doc.data() as CurriculumDistribution));
            return distributions;
          }, [] as CurriculumDistribution[]);

          const cloudSessions = await fetchCollectionSafely('gradingSessions', async () => {
            const qSessions = query(
              collection(db, 'gradingSessions'),
              where('userId', '==', user.uid),
              orderBy('createdAt', 'desc'),
              limit(50)
            );
            const snapSessions = await getDocs(qSessions);
            const sessions: GradingSession[] = [];
            snapSessions.forEach(d => sessions.push(d.data() as GradingSession));
            return sessions;
          }, [] as GradingSession[]);

          const combinedTemplates = [...userTemplates, ...DEFAULT_DATA.templates.filter(dt => !userTemplates.some(ut => ut.id === dt.id))];

          setData(prev => {
            const cloudPlanIds = new Set(cloudPlansResult.plans.map(p => p.id));
            const localOnlyPlans = prev.lessonPlans.filter(p => !cloudPlanIds.has(p.id));
            const cloudSessionIds = new Set(cloudSessions.map(s => s.id));
            const localOnlySessions = (prev.gradingSessions || []).filter(s => !cloudSessionIds.has(s.id));
            return {
              ...prev,
              lessonPlans: [...cloudPlansResult.plans, ...localOnlyPlans],
              templates: combinedTemplates,
              distributions: cloudDist,
              classes: cloudSettingsResult.cloudClasses ?? prev.classes,
              authorName: cloudSettingsResult.cloudAuthorName,
              settings: { ...prev.settings, ...cloudSettingsResult.cloudSettings },
              gradingSessions: [...cloudSessions, ...localOnlySessions],
            };
          });
          cloudClassesReadyRef.current = true;
        } finally {
          setIsLoading(false);
        }
      };
      fetchCloudData();
    } else {
      cloudClassesReadyRef.current = false;
    }
  }, [user]);

  // Persist danh sách lớp học vào doc userSettings (rules hiện hành đã cho owner đọc/ghi)
  useEffect(() => {
    if (!user || !cloudClassesReadyRef.current) return;
    const timer = setTimeout(() => {
      setDoc(doc(db, 'userSettings', user.uid), { classes: data.classes || [] }, { merge: true })
        .catch(e => console.error('Lỗi lưu lớp học lên Cloud', e));
    }, 1200);
    return () => clearTimeout(timer);
  }, [data.classes, user]);

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
        const { geminiApiKey: _k1, claudeApiKey: _k2, openaiApiKey: _k3, grokApiKey: _k4, deepseekApiKey: _k5, ...settingsToSync } = updated;
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
      try {
        await setDoc(doc(db, 'userTemplates', templateId), { ...updatedTemplate, id: templateId, userId: user.uid }, { merge: true });
      } catch (e) {
        console.error("Lỗi cập nhật mẫu Cloud", e);
      }
    }
  };

  const deleteFile = async (templateId: string, fileId: string) => {
    // Tính nextFiles NGOÀI updater — React không đảm bảo updater chạy đồng bộ, gán biến bên trong rồi đọc ngay sẽ có lúc còn null
    const template = (data.templates || []).find(t => t.id === templateId);
    if (!template) return;
    const nextFiles = (template.files || []).filter(f => f.id !== fileId);

    setData(prev => ({
      ...prev,
      templates: (prev.templates || []).map(t => t.id === templateId ? { ...t, files: nextFiles } : t),
    }));

    if (user && nextFiles) {
      try {
        await setDoc(doc(db, 'userTemplates', templateId), { files: nextFiles, userId: user.uid }, { merge: true });
      } catch (e) {
        console.error("Lỗi xóa file Cloud", e);
      }
    }
  };

  const updateTemplateFileSkeleton = async (templateId: string, fileId: string, skeleton: import('../lib/documentSkeleton').DocumentSkeleton) => {
    const template = (data.templates || []).find(t => t.id === templateId);
    if (!template) return;
    const nextFiles = (template.files || []).map(f => f.id === fileId ? { ...f, skeleton } : f);

    setData(prev => ({
      ...prev,
      templates: (prev.templates || []).map(t => t.id === templateId ? { ...t, files: nextFiles } : t),
    }));

    if (user && nextFiles) {
      try {
        await setDoc(doc(db, 'userTemplates', templateId), { files: nextFiles, userId: user.uid }, { merge: true });
      } catch (e) {
        console.error("Lỗi cập nhật skeleton Cloud", e);
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
    updateTemplateFileSkeleton,
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

