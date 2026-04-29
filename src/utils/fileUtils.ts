import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { TemplateFile } from '../types';

// Set PDF.js worker
try {
  // Use unpkg CDN for the worker to ensure it works in both dev and production
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;
} catch (e) {
  // fallback: no worker (slower but works)
  console.warn('PDF.js worker initialization failed, processing might be slower');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const safeFilename = (title: string | undefined, fallback = 'giao-an'): string => {
  if (!title || UUID_RE.test(title.trim())) return fallback;
  return title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim() || fallback;
};

/** Clear UUID titles on load so corrupted Firestore plans show as untitled rather than a UUID string. */
export const normalizePlanTitle = (title: string | undefined): string =>
  !title || UUID_RE.test(title.trim()) ? '' : title;

// Chrome quirk: when downloading a Blob URL via <a>.click(), Chrome occasionally
// ignores the `download` attribute and saves the file using the UUID portion of
// the blob URL as the filename. Workarounds applied here:
//   1. Append the anchor BEFORE setting attributes so the document context is set.
//   2. Use MouseEvent dispatch instead of .click() — more reliable in Chrome.
//   3. Revoke the object URL only after the download has been initiated.
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.rel = 'noopener';
  a.href = url;
  a.download = filename;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
  );
  setTimeout(() => {
    if (a.parentNode === document.body) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 200);
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  } catch (workerError) {
    console.warn('PDF worker failed, retrying without worker:', workerError);
    // fallback: disable worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    try {
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer, 
        useWorkerFetch: false, 
        isEvalSupported: false, 
        useSystemFonts: true 
      }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } catch (fallbackError) {
      console.error('PDF extraction failed completely:', fallbackError);
      throw new Error(`Không thể đọc file PDF. Vui lòng đổi sang định dạng Word (.docx).`);
    }
  }
};

export const extractTextFromWord = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

export const extractTextFromExcel = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  let fullText = '';
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    fullText += `Sheet: ${sheetName}\n` + json.map((row: any) => (row as any[]).join('\t')).join('\n') + '\n\n';
  });
  return fullText;
};

export const extractBase64FromImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const processUploadedFile = async (
  file: File, 
  category: TemplateFile['category'], 
  index: number
): Promise<TemplateFile> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let type: string = extension || 'unknown';
  
  let content = '';
  if (type === 'pdf') {
    content = await extractTextFromPDF(file);
  } else if (type === 'docx' || type === 'doc') {
    content = await extractTextFromWord(file);
  } else if (type === 'xlsx' || type === 'xls') {
    content = await extractTextFromExcel(file);
  } else if (['png', 'jpg', 'jpeg', 'webp'].includes(type)) {
    content = await extractBase64FromImage(file);
  }

  return {
    id: `file-${Date.now()}-${index}`,
    name: file.name,
    type,
    content,
    category
  };
};
