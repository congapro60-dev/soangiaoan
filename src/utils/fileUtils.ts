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

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode === document.body) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 100);
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

export const processUploadedFile = async (
  file: File, 
  category: TemplateFile['category'], 
  index: number
): Promise<TemplateFile> => {
  let type: 'pdf' | 'word' | 'excel' = 'pdf';
  if (file.name.endsWith('.pdf')) type = 'pdf';
  else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) type = 'word';
  else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) type = 'excel';
  
  let content = '';
  if (type === 'pdf') {
    content = await extractTextFromPDF(file);
  } else if (type === 'word') {
    content = await extractTextFromWord(file);
  } else if (type === 'excel') {
    content = await extractTextFromExcel(file);
  }

  return {
    id: `file-${Date.now()}-${index}`,
    name: file.name,
    type,
    content,
    category
  };
};
