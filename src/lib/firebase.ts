import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAtWzHYQWUahuteQ_6fnWHiwf1Iuxy4Z8c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smartplan-ai-14200.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smartplan-ai-14200",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smartplan-ai-14200.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1030734458631",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1030734458631:web:ec22242e491ea567fc5fa2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-JQ4QX69VL6"
};

/**
 * Cổng học sinh (/lop…) chạy trên app Firebase RIÊNG: phiên ẩn danh của HS lưu dưới khoá riêng,
 * không thay phiên Google của GV/admin trong cùng trình duyệt (trước đây phải đăng xuất mới vào được).
 */
export const STUDENT_PORTAL_APP = 'student-portal';
export const isStudentPortalPath = (path: string): boolean => /^\/lop(\/|$)/.test(path);
const onStudentPortal = typeof window !== 'undefined' && isStudentPortalPath(window.location.pathname);

// HS đang đăng nhập (phiên ẩn danh ở app mặc định, bản cũ) → chép sang khoá của app riêng một lần,
// để khỏi bắt cả trường nhập lại PIN sau bản cập nhật. Phiên GV (không ẩn danh) không đụng.
if (onStudentPortal) {
  try {
    const base = `firebase:authUser:${firebaseConfig.apiKey}:`;
    const legacy = localStorage.getItem(`${base}[DEFAULT]`);
    if (legacy && !localStorage.getItem(`${base}${STUDENT_PORTAL_APP}`) && JSON.parse(legacy)?.isAnonymous === true) {
      localStorage.setItem(`${base}${STUDENT_PORTAL_APP}`, legacy);
    }
  } catch { /* trình duyệt chặn lưu trữ → HS đăng nhập lại như thường */ }
}

// Initialize Firebase
const app = onStudentPortal ? initializeApp(firebaseConfig, STUDENT_PORTAL_APP) : initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service.
// ignoreUndefinedProperties: Firestore tự bỏ field undefined thay vì ném lỗi — lưới đỡ toàn cục
// cho mọi write client, không còn phụ thuộc việc nhớ bọc removeUndefinedFields ở từng chỗ ghi.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

// Dev-only local emulator wiring for the V4 live-lesson browser pilot.
// Guarded so production/preview keep the real Firebase connection untouched:
// only connects under `vite dev` (DEV) AND the explicit opt-in flag. The
// service-layer pilot (test/pilot) connects the emulators itself and does NOT
// set this flag, so there is never a duplicate connection.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

setPersistence(auth, browserLocalPersistence).catch(() => {});
export const googleProvider = new GoogleAuthProvider();

// Initialize Firebase Storage
export const storage = getStorage(app);

/**
 * Recursively removes all properties with `undefined` values from an object/array,
 * which is required because Firestore throws on `undefined` field values.
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields) as unknown as T;
  }
  const result: any = {};
  for (const key of Object.keys(obj as any)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      result[key] = removeUndefinedFields(val);
    }
  }
  return result;
}

