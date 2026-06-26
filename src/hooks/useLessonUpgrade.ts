import { useState } from 'react';
import type { AppData, LessonAnalysis, UpgradeMenuItemId, UpgradeResult, TemplateFile } from '../types';
import { analyzeLessonPlan } from '../lib/lessonUpgrade/analysisPrompt';
import { getProductPrompt } from '../lib/lessonUpgrade/productPrompts';
import { processUploadedFile } from '../utils/fileUtils';
import { callAI } from '../lib/aiProviders';

export type UpgradeState = 'idle' | 'analyzing' | 'menu' | 'generating' | 'result';

export const useLessonUpgrade = (data: AppData, showToast: (msg: string, icon?: any) => void) => {
  const [state, setState] = useState<UpgradeState>('idle');
  const [originalFiles, setOriginalFiles] = useState<TemplateFile[]>([]);
  const [lessonText, setLessonText] = useState<string>('');
  const [analysis, setAnalysis] = useState<LessonAnalysis | null>(null);
  const [results, setResults] = useState<Record<UpgradeMenuItemId, UpgradeResult>>({} as Record<UpgradeMenuItemId, UpgradeResult>);
  const [activeMenuId, setActiveMenuId] = useState<UpgradeMenuItemId | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setState('analyzing');
    try {
      const processedFiles: TemplateFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const resultFiles = await processUploadedFile(files[i], 'lesson_doc', i);
        processedFiles.push(...resultFiles);
      }
      
      setOriginalFiles(processedFiles);
      
      const combinedText = processedFiles.map(f => f.content).join('\n\n');
      setLessonText(combinedText);
      
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
    setResults({} as Record<UpgradeMenuItemId, UpgradeResult>);
    setActiveMenuId(null);
  };

  return {
    state,
    setState,
    originalFiles,
    lessonText,
    analysis,
    results,
    activeMenuId,
    setActiveMenuId,
    handleFileUpload,
    generateProduct,
    reset
  };
};
