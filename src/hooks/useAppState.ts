import { useState, useEffect } from 'react';
import { AppData, DEFAULT_DATA, LessonPlan, Subject, LessonTemplate } from '../types';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';

export const useAppState = (user: User | null, showToast: (msg: string, icon?: any) => void) => {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('smart_lesson_plan_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.templates) parsed.templates = DEFAULT_DATA.templates;
      return parsed;
    }
    return DEFAULT_DATA;
  });

  const [communityPlans, setCommunityPlans] = useState<LessonPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync ALL data to local cache
  useEffect(() => {
    localStorage.setItem('smart_lesson_plan_data', JSON.stringify(data));
  }, [data]);

  // Fetch Cloud data (Plans, Templates, Settings, Distributions) when user logs in
  useEffect(() => {
    if (user) {
      const fetchCloudData = async () => {
        setIsLoading(true);
        try {
          // 1. Fetch Personal Plans
          const qPlans = query(
            collection(db, 'lessonPlans'), 
            where('userId', '==', user.uid), 
            orderBy('updatedAt', 'desc')
          );
          const snapPlans = await getDocs(qPlans);
          const cloudPlans: LessonPlan[] = [];
          snapPlans.forEach((doc) => cloudPlans.push(doc.data() as LessonPlan));

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

          // 4. Fetch Distributions
          const qDist = query(collection(db, 'distributions'), where('userId', '==', user.uid));
          const snapDist = await getDocs(qDist);
          const cloudDist: CurriculumDistribution[] = [];
          snapDist.forEach(doc => cloudDist.push(doc.data() as CurriculumDistribution));

          // Combine with default templates (keep unique)
          const combinedTemplates = [...userTemplates, ...DEFAULT_DATA.templates.filter(dt => !userTemplates.some(ut => ut.id === dt.id))];

          setData(prev => ({ 
            ...prev, 
            lessonPlans: cloudPlans,
            templates: combinedTemplates,
            distributions: cloudDist,
            authorName: cloudAuthorName,
            settings: { ...prev.settings, ...cloudSettings }
          }));
        } catch (err) {
          console.error("Error fetching cloud data", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchCloudData();
    }
  }, [user]);

  const fetchCommunityPlans = async () => {
    try {
      const q = query(collection(db, 'lessonPlans'), where('isPublic', '==', true));
      const snap = await getDocs(q);
      const cp: LessonPlan[] = [];
      snap.forEach(d => cp.push(d.data() as LessonPlan));
      setCommunityPlans(cp.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e) {
      console.error("Lỗi tải cộng đồng", e);
    }
  };

  const updateSettings = async (newSettings: Partial<AppData['settings']>) => {
    const updated = { ...data.settings, ...newSettings };
    setData(prev => ({ ...prev, settings: updated }));
    if (user) {
      try {
        await setDoc(doc(db, 'userSettings', user.uid), { userId: user.uid, settings: updated, authorName: data.authorName }, { merge: true });
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
      const newTemplates = prev.templates.map(t => t.id === templateId ? { ...t, ...updatedTemplate } : t);
      const target = newTemplates.find(t => t.id === templateId);
      if (user && target) {
        setDoc(doc(db, 'userTemplates', templateId), { ...target, userId: user.uid }, { merge: true });
      }
      return { ...prev, templates: newTemplates };
    });
  };

  const deleteFile = async (templateId: string, fileId: string) => {
    setData(prev => {
      const newTemplates = prev.templates.map(t => 
        t.id === templateId ? { ...t, files: t.files.filter(f => f.id !== fileId) } : t
      );
      const target = newTemplates.find(t => t.id === templateId);
      if (user && target) {
        setDoc(doc(db, 'userTemplates', templateId), { ...target, userId: user.uid }, { merge: true });
      }
      return { ...prev, templates: newTemplates };
    });
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
    fetchCommunityPlans
  };
};

