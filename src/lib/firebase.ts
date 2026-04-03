import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAtWzHyQWUahuteQ_6fnWHiwf1Iuxy4Z8c",
  authDomain: "smartplan-ai-14200.firebaseapp.com",
  projectId: "smartplan-ai-14200",
  storageBucket: "smartplan-ai-14200.firebasestorage.app",
  messagingSenderId: "1030734458631",
  appId: "1:1030734458631:web:ec22242e491ea567fc5fa2",
  measurementId: "G-JQ4QX69VL6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
