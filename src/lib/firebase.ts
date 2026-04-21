import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
// Session-only persistence — clears when browser/tab is closed, each visit requires login
setPersistence(auth, browserSessionPersistence).catch(() => {});
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);
