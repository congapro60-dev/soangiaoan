import JSZip from 'jszip';
import { marked } from 'marked';
import { LessonPlan } from '../types';
import { downloadBlob, safeFilename } from './fileUtils';

/**
 * Generate a SCORM 1.2 compliant imsmanifest.xml
 */
const generateManifest = (title: string, id: string): string => {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest identifier="com.smartlessonplan.${id}" version="1.0"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="smart_lesson_plan_org">
    <organization identifier="smart_lesson_plan_org">
      <title>${title}</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>${title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html" />
    </resource>
  </resources>
</manifest>`;
};

/**
 * Generate a basic HTML wrapper for the lesson content.
 * Includes minimal SCORM API initialization to mark as completed.
 */
const generateIndexHtml = (title: string, markdownContent: string): string => {
  const htmlContent = marked(markdownContent);
  
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #f9f9ff;
    }
    .container {
      background: #ffffff;
      padding: 2rem 3rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    h1, h2, h3, h4 { color: #005ea1; margin-top: 1.5em; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th, td { border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; color: #0f172a; }
    blockquote { border-left: 4px solid #3b82f6; background: #eff6ff; margin: 1.5rem 0; padding: 1rem; border-radius: 0 8px 8px 0; }
    code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
  </style>
  <script>
    // Minimal SCORM 1.2 wrapper to mark the lesson as completed when viewed
    var scormAPI = null;
    
    function findAPI(win) {
      var attempts = 0;
      while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
        attempts++;
        if (attempts > 7) return null;
        win = win.parent;
      }
      return win.API;
    }

    function initSCORM() {
      scormAPI = findAPI(window);
      if (scormAPI) {
        scormAPI.LMSInitialize("");
        scormAPI.LMSSetValue("cmi.core.lesson_status", "completed");
        scormAPI.LMSCommit("");
      }
    }

    function termSCORM() {
      if (scormAPI) {
        scormAPI.LMSFinish("");
      }
    }

    window.onload = initSCORM;
    window.onunload = termSCORM;
  </script>
</head>
<body>
  <div class="container">
    ${htmlContent}
  </div>
</body>
</html>`;
};

/**
 * Exports a LessonPlan to a SCORM 1.2 zip package.
 */
export const exportToSCORM = async (
  plan: Partial<LessonPlan>,
  showToast: (msg: string, type?: any) => void
): Promise<void> => {
  if (!plan.content) {
    showToast('Giáo án không có nội dung để xuất.', 'warning');
    return;
  }

  showToast('Đang đóng gói SCORM 1.2...', 'info');

  try {
    const zip = new JSZip();
    const safeTitle = safeFilename(plan.title || 'giaoan');
    const id = plan.id || Math.random().toString(36).substring(7);

    // 1. Add manifest
    zip.file('imsmanifest.xml', generateManifest(plan.title || 'Giáo án', id));

    // 2. Add index.html
    zip.file('index.html', generateIndexHtml(plan.title || 'Giáo án', plan.content));

    // 3. Generate ZIP
    const blob = await zip.generateAsync({ type: 'blob' });

    // 4. Download
    downloadBlob(blob, `${safeTitle}_SCORM.zip`);
    
    showToast('Đã xuất file SCORM thành công!', 'success');
  } catch (error: any) {
    console.error('Lỗi khi xuất SCORM:', error);
    showToast(`Lỗi tạo file SCORM: ${error.message}`, 'error');
  }
};
