import { useState } from 'react';
import type { AppData, LessonAnalysis, UpgradeMenuItemId, UpgradeResult, TemplateFile } from '../types';
import { analyzeLessonPlan } from '../lib/lessonUpgrade/analysisPrompt';
import { getProductPrompt } from '../lib/lessonUpgrade/productPrompts';
import { processUploadedFile, downloadBlob, safeFilename } from '../utils/fileUtils';
import { callAI } from '../lib/aiProviders';
import { auditLesson, buildSupplementMarkdown, formatLessonReport, type LessonAuditResult } from '../lib/lessonUpgrade/lessonAudit';
import { UPGRADE_MENU } from '../lib/lessonUpgrade/menu';
import { buildRevisedDocxBlob } from '../utils/docxLessonRevision';
import { exportToWordA4 } from '../utils/wordExportA4';

export type UpgradeState = 'idle' | 'analyzing' | 'menu' | 'generating' | 'result';

/** File .docx gốc (giữ nguyên byte) để chèn góp ý mà không phá layout. */
interface OriginalDocx {
  name: string;
  bytes: ArrayBuffer;
}

export const useLessonUpgrade = (data: AppData, showToast: (msg: string, icon?: any) => void) => {
  const [state, setState] = useState<UpgradeState>('idle');
  const [originalFiles, setOriginalFiles] = useState<TemplateFile[]>([]);
  const [lessonText, setLessonText] = useState<string>('');
  const [analysis, setAnalysis] = useState<LessonAnalysis | null>(null);
  const [standardsAudit, setStandardsAudit] = useState<LessonAuditResult | null>(null);
  const [originalDocx, setOriginalDocx] = useState<OriginalDocx | null>(null);
  const [results, setResults] = useState<Record<UpgradeMenuItemId, UpgradeResult>>({} as Record<UpgradeMenuItemId, UpgradeResult>);
  const [activeMenuId, setActiveMenuId] = useState<UpgradeMenuItemId | null>(null);
  /** Các sản phẩm giáo viên giữ lại để gộp vào file Word bổ sung. */
  const [basket, setBasket] = useState<UpgradeMenuItemId[]>([]);
  const [isRevising, setIsRevising] = useState(false);

  const MAX_DOCX_BYTES = 20 * 1024 * 1024; // 20 MB

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setState('analyzing');
    try {
      // Giữ byte gốc của file .docx ĐẦU TIÊN để có thể chèn góp ý mà giữ nguyên layout.
      const firstDocx = Array.from(files).find(f => /\.docx$/i.test(f.name));
      if (firstDocx) {
        if (firstDocx.size > MAX_DOCX_BYTES) {
          showToast('File .docx vượt quá 20 MB, không giữ được layout. Vẫn phân tích nội dung.', 'warning');
          setOriginalDocx(null);
        } else {
          setOriginalDocx({ name: firstDocx.name, bytes: await firstDocx.arrayBuffer() });
        }
      } else {
        setOriginalDocx(null); // PDF/ảnh: chỉ phân tích, không giữ layout
      }

      const processedFiles: TemplateFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const resultFiles = await processUploadedFile(files[i], 'lesson_doc', i);
        processedFiles.push(...resultFiles);
      }

      setOriginalFiles(processedFiles);

      const combinedText = processedFiles.map(f => f.content).join('\n\n');
      setLessonText(combinedText);

      // Rà soát deterministic (checklist toàn trường + chuẩn Toán nếu đúng môn) — chạy song
      // song với phân tích AI.
      setStandardsAudit(auditLesson(combinedText));

      const analysisResult = await analyzeLessonPlan(combinedText, data.settings);
      setAnalysis(analysisResult);
      setState('menu');
      showToast('Phân tích giáo án thành công', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Lỗi khi xử lý file', 'error');
      setState('idle');
    }
  };

  /**
   * Tải bản đã bổ sung góp ý. Đầu vào .docx → chèn phần "NỘI DUNG ĐÃ BỔ SUNG" vào chính file
   * gốc (giữ layout). Không có .docx → xuất Word mới từ báo cáo rà soát.
   */
  const downloadRevisedDocx = async () => {
    if (!standardsAudit) return;
    setIsRevising(true);
    try {
      // Ghép báo cáo rà soát + mọi sản phẩm đang nằm trong giỏ, theo đúng thứ tự menu.
      const items = UPGRADE_MENU.filter((m) => basket.includes(m.id) && results[m.id]?.content).map(
        (m) => ({ id: m.id, label: m.label, content: results[m.id].content }),
      );
      const supplement = buildSupplementMarkdown(formatLessonReport(standardsAudit), items);

      if (originalDocx) {
        const blob = await buildRevisedDocxBlob(originalDocx.bytes, supplement);
        const base = safeFilename(originalDocx.name.replace(/\.docx$/i, '')) + '_da-bo-sung';
        downloadBlob(blob, `${base}.docx`);
        showToast('Đã tạo bản Word đã bổ sung (giữ layout gốc)!', 'success');
      } else {
        await exportToWordA4(
          { title: `${analysis?.tenBai || 'Giao-an'} - Bao cao ra soat`, content: supplement },
          showToast,
          'portrait',
        );
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Lỗi khi tạo bản Word đã bổ sung', 'error');
    } finally {
      setIsRevising(false);
    }
  };

  const generateProduct = async (menuId: UpgradeMenuItemId) => {
    if (!analysis || !lessonText) {
      showToast('Không có dữ liệu phân tích. Vui lòng tải lại giáo án.', 'error');
      return;
    }

    const analysisSummary = JSON.stringify(analysis, null, 2);
    const prompt = getProductPrompt(menuId, lessonText, analysisSummary);

    if (!prompt) {
      showToast('Tính năng này đang được phát triển, sẽ có ở pha sau!', 'info');
      return;
    }

    setActiveMenuId(menuId);
    setState('generating');

    try {
      const response = await callAI(prompt, data.settings);
      
      setResults(prev => ({
        ...prev,
        [menuId]: {
          menuId,
          content: response,
          timestamp: Date.now()
        }
      }));
      // Sinh ra là để dùng — tự cho vào giỏ, giáo viên bỏ ra nếu không ưng.
      setBasket(prev => prev.includes(menuId) ? prev : [...prev, menuId]);

      setState('result');
      showToast('Tạo sản phẩm thành công!', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Lỗi khi tạo sản phẩm', 'error');
      setState('menu');
    }
  };

  const reset = () => {
    setState('idle');
    setOriginalFiles([]);
    setLessonText('');
    setAnalysis(null);
    setStandardsAudit(null);
    setOriginalDocx(null);
    setResults({} as Record<UpgradeMenuItemId, UpgradeResult>);
    setActiveMenuId(null);
    setBasket([]);
  };

  const toggleBasket = (menuId: UpgradeMenuItemId) =>
    setBasket(prev => prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]);

  return {
    state,
    setState,
    originalFiles,
    lessonText,
    analysis,
    standardsAudit,
    hasOriginalDocx: !!originalDocx,
    isRevising,
    results,
    activeMenuId,
    setActiveMenuId,
    basket,
    toggleBasket,
    handleFileUpload,
    generateProduct,
    downloadRevisedDocx,
    reset
  };
};
