import { StrictMode, Component, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import 'katex/dist/katex.min.css';
import { isStaleChunkError, isStaleReloadInProgress, reloadForStaleChunk } from './lib/staleChunkReload';

// Tab mở từ bản deploy cũ đi tìm file JS theo tên cũ mà Vercel đã xoá khi deploy bản mới.
// Vite phát sự kiện này đúng lúc đó: tự tải lại một lần để lấy bản mới, thay vì hiện trang lỗi.
window.addEventListener('vite:preloadError', event => {
  if (reloadForStaleChunk()) event.preventDefault();
});

const AdaptiveLessonListPage = lazy(() => import('./pages/AdaptiveLessonListPage').then(m => ({ default: m.AdaptiveLessonListPage })));
const AdaptiveLessonBuilderPage = lazy(() => import('./pages/AdaptiveLessonBuilderPage').then(m => ({ default: m.AdaptiveLessonBuilderPage })));
const LiveLessonPage = lazy(() => import('./pages/LiveLessonPage').then(m => ({ default: m.LiveLessonPage })));
const StudentExamPage = lazy(() => import('./pages/StudentExamPage').then(m => ({ default: m.StudentExamPage })));
const StudentResultPage = lazy(() => import('./pages/StudentResultPage').then(m => ({ default: m.StudentResultPage })));
const AnswerReviewPage = lazy(() => import('./pages/AnswerReviewPage').then(m => ({ default: m.AnswerReviewPage })));
const TeacherGradingPage = lazy(() => import('./pages/TeacherGradingPage').then(m => ({ default: m.TeacherGradingPage })));
const ExamConfigPage = lazy(() => import('./pages/ExamConfigPage').then(m => ({ default: m.ExamConfigPage })));
const AdaptiveStudentPortalPage = lazy(() => import('./pages/AdaptiveStudentPortalPage').then(m => ({ default: m.AdaptiveStudentPortalPage })));
const DuGioPage = lazy(() => import('./pages/DuGioPage').then(m => ({ default: m.DuGioPage })));
const StudentPortalPage = lazy(() => import('./pages/StudentPortalPage').then(m => ({ default: m.StudentPortalPage })));
const ParentPortalPage = lazy(() => import('./pages/ParentPortalPage').then(m => ({ default: m.ParentPortalPage })));
const StudentClassExamPage = lazy(() => import('./pages/StudentClassExamPage').then(m => ({ default: m.StudentClassExamPage })));
const DiscoverSelfStudyPage = lazy(() => import('./pages/DiscoverSelfStudyPage').then(m => ({ default: m.DiscoverSelfStudyPage })));

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
    // Lọt qua được lớp nghe sự kiện ở trên (import không qua bộ preload của Vite) thì chữa ở đây.
    if (isStaleChunkError(error) && reloadForStaleChunk()) this.forceUpdate();
  }

  render() {
    if (this.state.hasError && isStaleReloadInProgress()) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
          fontFamily: 'sans-serif', background: '#f8fafc', color: '#475569', fontWeight: 700,
        }}>
          Đang tải phiên bản mới của app…
        </div>
      );
    }
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
            {isStaleChunkError(this.state.error)
              ? 'App vừa được cập nhật lên phiên bản mới. Bấm "Tải lại ứng dụng" để dùng bản mới — dữ liệu của bạn không mất gì.'
              : String(this.state.error?.message || 'Lỗi không xác định')}
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
          <Route path="/lop" element={<Suspense fallback={<RouteLoading />}><StudentPortalPage /></Suspense>} />
          <Route path="/lop/:joinCode/exam/:assignmentId" element={<Suspense fallback={<RouteLoading />}><StudentClassExamPage /></Suspense>} />
          <Route path="/lop/:joinCode" element={<Suspense fallback={<RouteLoading />}><StudentPortalPage /></Suspense>} />
          <Route path="/ph" element={<Suspense fallback={<RouteLoading />}><ParentPortalPage /></Suspense>} />
          <Route path="/ph/:joinCode" element={<Suspense fallback={<RouteLoading />}><ParentPortalPage /></Suspense>} />
          <Route path="/du-gio" element={<Suspense fallback={<RouteLoading />}><DuGioPage /></Suspense>} />
          <Route path="/du-gio/:id" element={<Suspense fallback={<RouteLoading />}><DuGioPage /></Suspense>} />
          <Route path="/adaptive-lessons" element={<Suspense fallback={<RouteLoading />}><AdaptiveLessonListPage /></Suspense>} />
          <Route path="/adaptive-builder/:id" element={<Suspense fallback={<RouteLoading />}><AdaptiveLessonBuilderPage /></Suspense>} />
          <Route path="/adaptive-portal/:id" element={<Suspense fallback={<RouteLoading />}><AdaptiveStudentPortalPage /></Suspense>} />
          {/* Bài học phân hoá THẦY CÔ GIAO cho lớp: mở qua máy chủ (bản đã bỏ đáp án). */}
          <Route path="/adaptive-portal/assignment/:assignmentId" element={<Suspense fallback={<RouteLoading />}><AdaptiveStudentPortalPage /></Suspense>} />
          <Route path="/adaptive-portal" element={<Suspense fallback={<RouteLoading />}><AdaptiveStudentPortalPage /></Suspense>} />
          <Route path="/adaptive-live/:sessionId" element={<Suspense fallback={<RouteLoading />}><LiveLessonPage /></Suspense>} />
          <Route path="/adaptive/student/:teacherId" element={<Suspense fallback={<RouteLoading />}><AdaptiveStudentPortalPage /></Suspense>} />
          <Route path="/discover-self-study" element={<Suspense fallback={<RouteLoading />}><DiscoverSelfStudyPage /></Suspense>} />
          <Route path="/exam/:code/review/:submissionId" element={<Suspense fallback={<RouteLoading />}><AnswerReviewPage /></Suspense>} />
          <Route path="/exam/:code/result/:submissionId" element={<Suspense fallback={<RouteLoading />}><StudentResultPage /></Suspense>} />
          <Route path="/exam/:examId/grade" element={<Suspense fallback={<RouteLoading />}><TeacherGradingPage /></Suspense>} />
          <Route path="/exam/:examId/config" element={<Suspense fallback={<RouteLoading />}><ExamConfigPage /></Suspense>} />
          <Route path="/exam/:code" element={<Suspense fallback={<RouteLoading />}><StudentExamPage /></Suspense>} />
          <Route path="*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
