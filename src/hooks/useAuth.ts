import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInAnonymously, signInWithPopup, signOut, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import Swal from 'sweetalert2';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const showToast = (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    Swal.fire({
      title,
      icon,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
      showToast('Đăng nhập thành công!');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    showToast('Đã đăng xuất');
  };

  const handleDemoLogin = async () => {
    // Ưu tiên Anonymous Auth để chế độ dùng thử có token thật (Firestore rules cho phép ghi).
    // Nếu Anonymous chưa bật trong Firebase Console thì fallback về mock user cũ (offline, không lưu cloud).
    try {
      const credential = await signInAnonymously(auth);
      try {
        await updateProfile(credential.user, { displayName: 'Khách dùng thử' });
      } catch { /* tên hiển thị không bắt buộc */ }
      showToast('Đã vào chế độ dùng thử (tài khoản khách) — dữ liệu được lưu thật.', 'info');
    } catch (err) {
      console.warn('Anonymous Auth chưa bật trong Firebase Console — dùng demo cục bộ', err);
      const mockUser: any = {
        uid: 'demo-agent-001',
        displayName: 'Senior AI Agent',
        email: 'agent@smartplan.ai',
        photoURL: 'https://cdn-icons-png.flaticon.com/512/4712/4712139.png'
      };
      setUser(mockUser);
      showToast('Đã vào chế độ Demo offline (dữ liệu không lưu cloud). Bật Anonymous trong Firebase Console để lưu thật.', 'warning');
    }
  };

  return { user, isAuthLoading, handleLogin, handleLogout, handleDemoLogin, showToast };
};
