import { setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { LessonPlan, AppData } from '../types';
import { validateLessonPlan } from '../utils/dataValidators';
import Swal from 'sweetalert2';

interface ActionsParams {
  user: User | null;
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast: (msg: string, type?: any) => void;
  setIsLoading: (val: boolean) => void;
  setActiveTab: (tab: any) => void;
  setAuthorName: (name: string) => void;
  creator: {
    currentPlan: Partial<LessonPlan>;
    setCurrentPlan: (plan: any) => void;
    bulkResults: LessonPlan[];
    setBulkResults: (results: LessonPlan[]) => void;
  };
}

export const useLessonPlanActions = ({
  user, data, setData, showToast, setIsLoading, setActiveTab, setAuthorName, creator
}: ActionsParams) => {

  const saveLessonPlan = async () => {
    if (!creator.currentPlan.title || !creator.currentPlan.content) return;
    if (!user) { showToast('Vui lòng đăng nhập để lưu!', 'warning'); return; }

    const isEditingOthers = creator.currentPlan.userId && creator.currentPlan.userId !== user.uid;
    const id = (isEditingOthers || !creator.currentPlan.id)
      ? crypto.randomUUID()
      : creator.currentPlan.id;

    const newPlan: LessonPlan = {
      id,
      subjectId: creator.currentPlan.subjectId || 'math',
      templateId: creator.currentPlan.templateId,
      title: creator.currentPlan.title,
      content: creator.currentPlan.content,
      status: 'completed',
      createdAt: creator.currentPlan.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user.uid,
      authorName: data.authorName,
      isPublic: isEditingOthers ? false : (creator.currentPlan.isPublic || false),
      grade: creator.currentPlan.grade,
      week: creator.currentPlan.week,
      // Định dạng built-in đã dùng — route xuất Word có style (Firestore không nhận undefined → spread điều kiện)
      ...(creator.currentPlan.builtinFormat ? { builtinFormat: creator.currentPlan.builtinFormat } : {}),
      ...(creator.currentPlan.toanKeHoach ? { toanKeHoach: creator.currentPlan.toanKeHoach } : {})
    };

    try {
      validateLessonPlan(newPlan);
      await setDoc(doc(db, 'lessonPlans', id), newPlan);
      setData(prev => ({
        ...prev,
        lessonPlans: prev.lessonPlans.some(p => p.id === id)
          ? prev.lessonPlans.map(p => p.id === id ? newPlan : p)
          : [newPlan, ...prev.lessonPlans]
      }));
      creator.setCurrentPlan({ title: '', content: '', subjectId: 'math', templateId: '' });
      setActiveTab('library');
      showToast(isEditingOthers ? 'Đã tạo bản sao riêng vào thư viện!' : 'Đã lưu giáo án thành công!');
    } catch (e: any) {
      if (e.name === 'DataValidationError') {
        showToast(e.message, 'error');
      } else {
        showToast('Lỗi khi lưu lên Cloud!', 'error');
      }
    }
  };

  /**
   * Lưu MỘT giáo án do hàng đợi PPCT vừa soạn xong. Ghi ngay chứ không gom cuối lô: chạy cả
   * học kỳ mất vài giờ, sập tab ở tiết thứ 90 mà gom cuối lô thì mất sạch 89 tiết trước đó.
   */
  const saveOnePlan = async (plan: LessonPlan): Promise<string> => {
    if (!user) throw new Error('Chưa đăng nhập, không lưu được giáo án.');
    const toSave: LessonPlan = {
      ...plan,
      userId: user.uid,
      authorName: data.authorName,
      isPublic: false,
    };
    validateLessonPlan(toSave);
    await setDoc(doc(db, 'lessonPlans', toSave.id), toSave);
    setData(prev => ({ ...prev, lessonPlans: [toSave, ...prev.lessonPlans] }));
    return toSave.id;
  };

  const saveBulkPlans = async () => {
    if (creator.bulkResults.length === 0 || !user) return;
    setIsLoading(true);
    try {
      // `builtinFormat`/`toanKeHoach` phải theo sang, nếu không giáo án soạn hàng loạt lưu xong
      // sẽ không xuất được theo form trường (đường xuất Word route theo hai trường này).
      // Firestore không nhận undefined nên phải spread có điều kiện.
      const plansToSave = creator.bulkResults.map(p => ({
        ...p,
        status: 'completed' as 'draft' | 'completed',
        userId: user.uid,
        authorName: data.authorName,
        isPublic: false,
        ...(creator.currentPlan.builtinFormat ? { builtinFormat: creator.currentPlan.builtinFormat } : {}),
        ...(creator.currentPlan.toanKeHoach ? { toanKeHoach: creator.currentPlan.toanKeHoach } : {}),
      }));
      for (const plan of plansToSave) {
        validateLessonPlan(plan);
        await setDoc(doc(db, 'lessonPlans', plan.id), plan);
      }
      setData(prev => ({ ...prev, lessonPlans: [...plansToSave, ...prev.lessonPlans] }));
      creator.setBulkResults([]);
      setActiveTab('library');
      showToast(`Đã lưu ${plansToSave.length} bài lên Cloud!`);
    } catch (e) {
      showToast('Lỗi lưu hàng loạt', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const duplicatePlan = async (plan: LessonPlan) => {
    if (!user) return;
    const newId = crypto.randomUUID();
    const duplicatedPlan: LessonPlan = {
      ...plan,
      id: newId,
      title: `Bản sao - ${plan.title}`,
      userId: user.uid,
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      validateLessonPlan(duplicatedPlan);
      await setDoc(doc(db, 'lessonPlans', newId), duplicatedPlan);
      setData(prev => ({ ...prev, lessonPlans: [duplicatedPlan, ...prev.lessonPlans] }));
      showToast('Đã nhân bản giáo án thành công!');
    } catch {
      showToast('Lỗi nhân bản', 'error');
    }
  };

  const deletePlan = (id: string) => {
    Swal.fire({
      title: 'Xác nhận xóa?',
      text: 'Giáo án sẽ biến mất vĩnh viễn!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Xóa ngay',
      cancelButtonText: 'Hủy'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, 'lessonPlans', id));
          setData(prev => ({ ...prev, lessonPlans: prev.lessonPlans.filter(p => p.id !== id) }));
          showToast('Đã xóa giáo án!');
        } catch {
          showToast('Lỗi khi xóa', 'error');
        }
      }
    });
  };

  const updatePlanMetadata = async (id: string, updates: Partial<LessonPlan>) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'lessonPlans', id), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
      setData(prev => ({
        ...prev,
        lessonPlans: prev.lessonPlans.map(p => p.id === id ? { ...p, ...updates } : p)
      }));
      showToast('Đã cập nhật thông tin!');
    } catch (err: any) {
      console.warn('Lỗi cập nhật ID cũ, đang thử tạo bản sao mới...', err);
      const newId = crypto.randomUUID();
      const originalPlan = data.lessonPlans.find(p => p.id === id);
      if (originalPlan) {
        const repairedPlan: LessonPlan = {
          ...originalPlan, ...updates, id: newId, userId: user.uid,
          isPublic: false, updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'lessonPlans', newId), repairedPlan);
          setData(prev => ({
            ...prev,
            lessonPlans: [repairedPlan, ...prev.lessonPlans.filter(p => p.id !== id)]
          }));
          showToast('Đã đồng bộ và cập nhật bản sao của bạn!');
        } catch {
          showToast('Không thể cập nhật giáo án này', 'error');
        }
      } else {
        showToast('Lỗi: Không tìm thấy dữ liệu giáo án', 'error');
      }
    }
  };

  const toggleSharePlan = async (e: React.MouseEvent, plan: LessonPlan) => {
    e.stopPropagation();
    if (!user) return;
    let nameToUse = data.authorName;
    if (!plan.isPublic && !data.authorName) {
      const { value: name } = await Swal.fire({
        title: 'Chia sẻ giáo án',
        text: 'Vui lòng nhập tên thực của bạn để hiển thị trên giáo án cộng đồng:',
        input: 'text',
        inputPlaceholder: 'Ví dụ: Cô giáo Minh Anh...',
        allowOutsideClick: false,
        confirmButtonText: 'Lưu & Chia sẻ',
        confirmButtonColor: '#3b82f6',
        inputValidator: (value) => {
          if (!value) return 'Bạn cần nhập tên để chia sẻ!';
          if (value.length < 2) return 'Tên quá ngắn!';
        }
      });
      if (name) {
        setAuthorName(name);
        nameToUse = name;
        setData(prev => ({ ...prev, authorName: name }));
      } else {
        return;
      }
    }
    try {
      await setDoc(doc(db, 'lessonPlans', plan.id), {
        ...plan, isPublic: !plan.isPublic, authorName: nameToUse
      }, { merge: true });
      setData(prev => ({
        ...prev,
        lessonPlans: prev.lessonPlans.map(p =>
          p.id === plan.id ? { ...p, isPublic: !p.isPublic, authorName: nameToUse } : p
        )
      }));
      showToast(!plan.isPublic ? 'Đã chia sẻ cộng đồng!' : 'Đã thu hồi quyền riêng tư.');
    } catch {
      showToast('Lỗi chia sẻ', 'error');
    }
  };

  return { saveLessonPlan, saveOnePlan, saveBulkPlans, duplicatePlan, deletePlan, updatePlanMetadata, toggleSharePlan };
};
