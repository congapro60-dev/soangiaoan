import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode, command}) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.VITE_API_TARGET || 'https://giaoandewey.vercel.app';
  const productionProxy = new URL(apiTarget).hostname === 'giaoandewey.vercel.app';
  return {
    plugins: [react(), tailwindcss(), ...(command === 'serve' && productionProxy ? [{
      name: 'production-api-warning',
      configureServer() { console.warn('CẢNH BÁO: /api trên localhost đang gọi production giaoandewey.vercel.app. Thao tác lưu/nộp/chấm sẽ tác động dữ liệu thật. Đổi VITE_API_TARGET để dùng backend thử nghiệm.'); },
      transformIndexHtml(html: string) { return html.replace('<body>', '<body><div role="alert" style="padding:8px 12px;background:var(--dewey-blue-50);color:var(--dewey-ink);font:14px sans-serif">Localhost đang dùng API production: lưu, nộp hoặc chấm sẽ tác động dữ liệu thật.</div>'); },
    }] : [])],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      // Dev-only: Vite không serve các Vercel Function trong api/ → proxy sang production
      // để các endpoint (exam, adaptive-progress, export-lesson...) hoạt động khi chạy
      // localhost (E2E, demo mode).
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'pdf-export': ['html2pdf.js'],
            'pptx': ['pptxgenjs'],
            'katex': ['katex'],
            'pdfjs': ['pdfjs-dist'],
            'markdown': ['marked', 'react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex', 'rehype-raw'],
            'motion': ['motion/react', 'framer-motion'],
            'docx-export': ['docx', 'jszip'],
            'diagram': ['pako'],
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'lucide': ['lucide-react'],
            'ai-sdks': ['@google/genai', '@anthropic-ai/sdk', 'openai'],
            'ui-vendor': ['sweetalert2', '@uiw/react-md-editor'],
            'export-utils': ['html2canvas-pro', 'jspdf', 'xlsx', 'mammoth'],
            'charting': ['recharts'],
            'three': ['three']
          },
        },
      },
    },
  };
});
