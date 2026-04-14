import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
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

  const handleDemoLogin = () => {
    // Mock user for AI Agent testing or rapid dev
    const mockUser: any = {
      uid: 'demo-agent-001',
      displayName: 'Senior AI Agent',
      email: 'agent@smartplan.ai',
      photoURL: 'https://cdn-icons-png.flaticon.com/512/4712/4712139.png'
    };
    setUser(mockUser);
    showToast('Đã vào chế độ Demo Engineer!', 'info');
  };

  return { user, isAuthLoading, handleLogin, handleLogout, handleDemoLogin, showToast };
};
