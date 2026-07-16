import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      // Dev-only: Vite không serve các Vercel Function trong api/ → proxy sang production
      // để relay AI (/api/gemini-relay) hoạt động khi chạy localhost (E2E, demo mode).
      proxy: {
        '/api': {
          target: 'https://giaoandewey.vercel.app',
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
            'charting': ['recharts', 'three']
          },
        },
      },
    },
  };
});
