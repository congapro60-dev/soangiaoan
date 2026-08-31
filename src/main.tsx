import { StrictMode, Component, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { StudentExamPage } from './pages/StudentExamPage';
import { StudentResultPage } from './pages/StudentResultPage';
import { AnswerReviewPage } from './pages/AnswerReviewPage';
import { TeacherGradingPage } from './pages/TeacherGradingPage';
import { ExamConfigPage } from './pages/ExamConfigPage';
import { AdaptiveStudentPortalPage } from './pages/AdaptiveStudentPortalPage';
import { DuGioPage } from './pages/DuGioPage';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { StudentClassExamPage } from './pages/StudentClassExamPage';
import './index.css';
import 'katex/dist/katex.min.css';

const AdaptiveLessonListPage = lazy(() => import('./pages/AdaptiveLessonListPage').then(m => ({ default: m.AdaptiveLessonListPage })));
const AdaptiveLessonBuilderPage = lazy(() => import('./pages/AdaptiveLessonBuilderPage').then(m => ({ default: m.AdaptiveLessonBuilderPage })));
const LiveLessonPage = lazy(() => import('./pages/LiveLessonPage').then(m => ({ default: m.LiveLessonPage })));

const RouteLoading = () => (
  <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-700">
    <p className="text-sm font-black">Đang tải chức năng...</p>
  </main>
);

// Error Boundary để ngăn màn trắng khi có lỗi bất ngờ
class ErrorBoundary extends Component {
  state = { hasError: false, error: null as any };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif',
          background: '#f8fafc', color: '#1e293b', padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Đã xảy ra lỗi</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '400px' }}>
            {String(this.state.error?.message || 'Lỗi không xác định')}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #4A90E2, #FF9500)',
              color: 'white', border: 'none', borderRadius: '1rem',
              fontWeight: 700, cursor: 'pointer', fontSize: '1rem'
            }}
          >
            🔄 Tải lại ứng dụng
          </button>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/lop" element={<StudentPortalPage />} />
          <Route path="/lop/:joinCode/exam/:assignmentId" element={<StudentClassExamPage />} />
          <Route path="/lop/:joinCode" element={<StudentPortalPage />} />
          <Route path="/du-gio" element={<DuGioPage />} />
          <Route path="/du-gio/:id" element={<DuGioPage />} />
          <Route path="/adaptive-lessons" element={<Suspense fallback={<RouteLoading />}><AdaptiveLessonListPage /></Suspense>} />
          <Route path="/adaptive-builder/:id" element={<Suspense fallback={<RouteLoading />}><AdaptiveLessonBuilderPage /></Suspense>} />
          <Route path="/adaptive-portal/:id" element={<AdaptiveStudentPortalPage />} />
          <Route path="/adaptive-portal" element={<AdaptiveStudentPortalPage />} />
          <Route path="/adaptive-live/:sessionId" element={<Suspense fallback={<RouteLoading />}><LiveLessonPage /></Suspense>} />
          <Route path="/adaptive/student/:teacherId" element={<AdaptiveStudentPortalPage />} />
          <Route path="/exam/:code/review/:submissionId" element={<AnswerReviewPage />} />
          <Route path="/exam/:code/result/:submissionId" element={<StudentResultPage />} />
          <Route path="/exam/:examId/grade" element={<TeacherGradingPage />} />
          <Route path="/exam/:examId/config" element={<ExamConfigPage />} />
          <Route path="/exam/:code" element={<StudentExamPage />} />
          <Route path="*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
