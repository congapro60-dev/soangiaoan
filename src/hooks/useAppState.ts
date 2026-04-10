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

  // Sync settings and templates to local, but NOT lesson plans
  useEffect(() => {
    const dataToSave = { ...data, lessonPlans: [] };
    localStorage.setItem('smart_lesson_plan_data', JSON.stringify(dataToSave));
  }, [data.settings, data.templates, data.subjects]);

  // Fetch personal plans when user logs in
  useEffect(() => {
    if (user) {
      const fetchPersonalPlans = async () => {
        try {
          const q = query(
            collection(db, 'lessonPlans'), 
            where('userId', '==', user.uid), 
            orderBy('updatedAt', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const cloudPlans: LessonPlan[] = [];
          querySnapshot.forEach((doc) => {
            cloudPlans.push(doc.data() as LessonPlan);
          });
          setData(prev => ({ ...prev, lessonPlans: cloudPlans }));
        } catch (err) {
          console.error("Error fetching personal plans", err);
        }
      };
      fetchPersonalPlans();
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

  const updateSettings = (newSettings: Partial<AppData['settings']>) => {
    setData(prev => ({ ...prev, settings: { ...prev.settings, ...newSettings } }));
  };

  const addTemplate = (template: LessonTemplate) => {
    setData(prev => ({ ...prev, templates: [template, ...prev.templates] }));
  };

  const deleteTemplate = async (id: string) => {
    setData(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== id) }));
  };

  const updateTemplate = (templateId: string, updatedTemplate: Partial<LessonTemplate>) => {
    setData(prev => ({
      ...prev,
      templates: prev.templates.map(t => t.id === templateId ? { ...t, ...updatedTemplate } : t)
    }));
  };

  return { 
    data, 
    setData, 
    communityPlans, 
    isLoading, 
    setIsLoading, 
    updateSettings, 
    addTemplate, 
    deleteTemplate, 
    updateTemplate,
    fetchCommunityPlans
  };
};
