import JSZip from 'jszip';
import type { AppData } from '../../types';
import { callAIWithVision } from '../aiProviders';
import {
  extractQuestionCatalogFromText,
  normalizeQuestionKey,
  type ClassReportQuestionCatalogItem,
  type ClassReportQuestionSource,
} from './questionCatalog';

export type QuestionSourceReadMode = 'text' | 'ocr' | 'mixed' | 'empty';

export interface QuestionSourceReadInput {
  sources: readonly ClassReportQuestionSource[];
  questionNumbers: readonly string[];
  sourceText?: string;
  settings: AppData['settings'];
}

export interface QuestionSourceReadResult {
  catalog: ClassReportQuestionCatalogItem[];
  mode: QuestionSourceReadMode;
  warnings: string[];
}

export interface QuestionSourceReaderDeps {
  fetch: typeof fetch;
  readSourceFile: (file: File) => Promise<{ text: string; images: string[]; note: string }>;
  ocr: (images: string[], settings: AppData['settings'], questionNumbers?: readonly string[]) => Promise<string>;
}

const MAX_SOURCE_FILES = 8;
const MAX_SOURCE_IMAGES = 6;
const MAX_SOURCE_FILE_BYTES = 20 * 1024 * 1024;
const SOURCE_FETCH_TIMEOUT_MS = 20_000;

const QUESTION_SOURCE_OCR_PROMPT = `
Bạn là bộ OCR đề bài cho báo cáo lớp học Việt Nam.

NHIỆM VỤ: Chỉ chép lại nguyên văn các câu hỏi xuất hiện trong ảnh đề được gửi kèm, để giáo viên đối chiếu câu đang thống kê. Không giải bài, không chấm điểm, không tự suy luận phần bị mờ.

YÊU CẦU:
- Chỉ trả về Markdown chứa nội dung câu hỏi, không lời chào, không giải thích, không code fence.
- Giữ nguyên nhãn phần/câu/bài gốc, ví dụ “Phần III – Bài 4”, “Câu 2”, “Tự luận – Bài 1”. Mỗi câu bắt đầu trên dòng riêng.
- Giữ đủ phương án A/B/C/D và các ý a), b), c), d) nếu có.
- Mọi công thức Toán phải dùng LaTeX trong $...$ hoặc $$...$$; không thay công thức bằng chữ mô tả.
- Chỗ nào không đọc chắc chắn ghi đúng [không đọc rõ], tuyệt đối không bịa.

DANH SÁCH NHÃN CẦN TÌM:
`.trim();

const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const defaultDeps: QuestionSourceReaderDeps = {
  fetch: globalThis.fetch.bind(globalThis),
  readSourceFile: async file => (await import('./readSourceFile')).readSourceFile(file),
  ocr: (images, settings, questionNumbers = []) => callAIWithVision(
    `${QUESTION_SOURCE_OCR_PROMPT}\n${questionNumbers.length > 0 ? `Chỉ cần ưu tiên các nhãn: ${questionNumbers.join(', ')}.` : ''}\n${images.length > 0 ? 'Hãy đọc toàn bộ các trang ảnh và chỉ giữ các câu trong danh sách.' : ''}`,
    images,
    settings,
  ),
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message.trim() ? error.message.trim() : 'không đọc được file.';

const extensionOf = (name: string, mimeType?: string): string => {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/u);
  if (match?.[1]) return match[1];
  const normalizedMimeType = (mimeType || '').toLowerCase().split(';')[0].trim();
  if (MIME_TO_EXTENSION[normalizedMimeType]) return MIME_TO_EXTENSION[normalizedMimeType];
  if (normalizedMimeType.startsWith('image/')) {
    const imageExtension = normalizedMimeType.slice('image/'.length);
    return imageExtension === 'jpeg' || imageExtension === 'jpg' ? 'jpg' : imageExtension === 'png' || imageExtension === 'webp' || imageExtension === 'gif' ? imageExtension : 'jpg';
  }
  return 'bin';
};

const fileNameForSource = (source: ClassReportQuestionSource, mimeType: string): string => {
  const name = source.name.trim() || 'de-goc';
  return /\.[a-z0-9]+$/iu.test(name) ? name : `${name}.${extensionOf(name, mimeType)}`;
};

const isDocx = (file: File): boolean => /\.docx$/iu.test(file.name);

const mimeTypeForEmbeddedImage = (name: string): string => {
  const extension = extensionOf(name);
  return extension === 'jpg' || extension === 'jpeg'
    ? 'image/jpeg'
    : extension === 'webp' ? 'image/webp'
      : extension === 'gif' ? 'image/gif' : 'image/png';
};

const extractEmbeddedDocxImages = async (file: File): Promise<string[]> => {
  if (!isDocx(file)) return [];
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files)
    .filter(entry => !entry.dir && /^word\/media\//iu.test(entry.name))
    .slice(0, MAX_SOURCE_IMAGES);
  return Promise.all(entries.map(async entry => {
    const base64 = await entry.async('base64');
    return `data:${mimeTypeForEmbeddedImage(entry.name)};base64,${base64}`;
  }));
};

const questionKey = (value: string): string => normalizeQuestionKey(value);

const uniqueQuestionNumbers = (questionNumbers: readonly string[]): string[] => [...new Map(
  questionNumbers
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .map(value => [questionKey(value), value] as const),
).values()];

const mergeCatalog = (
  requested: readonly string[],
  ...catalogs: readonly (readonly ClassReportQuestionCatalogItem[])[]
): ClassReportQuestionCatalogItem[] => uniqueQuestionNumbers(requested)
  .map(questionNumber => catalogs.flat().find(item => questionKey(item.questionNumber) === questionKey(questionNumber)))
  .filter((item): item is ClassReportQuestionCatalogItem => Boolean(item));

const missingQuestions = (
  requested: readonly string[],
  catalog: readonly ClassReportQuestionCatalogItem[],
): string[] => uniqueQuestionNumbers(requested).filter(questionNumber =>
  !catalog.some(item => questionKey(item.questionNumber) === questionKey(questionNumber)));

const fetchSourceWithTimeout = async (
  fetcher: typeof fetch,
  url: string,
): Promise<Response> => new Promise((resolve, reject) => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => {
    controller.abort();
    reject(new Error('nguồn đề phản hồi quá thời gian 20 giây'));
  }, SOURCE_FETCH_TIMEOUT_MS);
  void fetcher(url, { signal: controller.signal }).then(
    response => { globalThis.clearTimeout(timeout); resolve(response); },
    error => { globalThis.clearTimeout(timeout); reject(error); },
  );
});

interface DownloadedSource {
  source: ClassReportQuestionSource;
  file: File;
  text: string;
  images: string[];
}

export const readQuestionCatalogFromSources = async (
  input: QuestionSourceReadInput,
  deps: Partial<QuestionSourceReaderDeps> = {},
): Promise<QuestionSourceReadResult> => {
  const activeDeps = { ...defaultDeps, ...deps };
  const requested = uniqueQuestionNumbers(input.questionNumbers);
  if (requested.length === 0) return { catalog: [], mode: 'empty', warnings: [] };

  const fromStoredText = extractQuestionCatalogFromText(input.sourceText, requested);
  if (missingQuestions(requested, fromStoredText).length === 0) {
    return { catalog: fromStoredText, mode: 'text', warnings: [] };
  }

  const warnings: string[] = [];
  const uniqueSources = [...new Map(
    input.sources
      .filter(source => /^https?:\/\//iu.test(source.url.trim()))
      .map(source => [source.url.trim(), source] as const),
  ).values()].slice(0, MAX_SOURCE_FILES);
  const downloaded: DownloadedSource[] = [];

  if (uniqueSources.length === 0) {
    warnings.push('Bài giao chưa có nguồn đề gốc dạng PDF, Word hoặc ảnh để đọc câu hỏi.');
  }

  await Promise.all(uniqueSources.map(async source => {
    try {
      const response = await fetchSourceWithTimeout(activeDeps.fetch, source.url);
      if (!response.ok) throw new Error(`máy chủ trả ${response.status}`);
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_SOURCE_FILE_BYTES) throw new Error('file vượt quá 20 MB');
      const blob = await response.blob();
      if (blob.size > MAX_SOURCE_FILE_BYTES) throw new Error('file vượt quá 20 MB');
      const mimeType = (blob.type || source.mimeType || '').split(';')[0].trim();
      const file = new File([blob], fileNameForSource(source, mimeType), { type: mimeType || undefined });
      const read = await activeDeps.readSourceFile(file);
      let images = [...read.images];
      if (isDocx(file) && (read.text.trim() === '' || images.length === 0)) {
        images = [...images, ...(await extractEmbeddedDocxImages(file))];
      }
      downloaded.push({ source, file, text: read.text, images });
    } catch (error) {
      warnings.push(`${source.name || 'Đề gốc'}: ${asErrorMessage(error)}`);
    }
  }));

  const extractedText = downloaded.map(item => item.text.trim()).filter(Boolean).join('\n\n');
  const fromDigitalText = extractQuestionCatalogFromText(extractedText, requested);
  const textCatalog = mergeCatalog(requested, fromStoredText, fromDigitalText);
  const unresolved = missingQuestions(requested, textCatalog);
  if (unresolved.length === 0) {
    return { catalog: textCatalog, mode: 'text', warnings };
  }

  const images = [...new Set(downloaded.flatMap(item => item.images).filter(Boolean))].slice(0, MAX_SOURCE_IMAGES);
  if (images.length === 0) {
    warnings.push(`Chưa tìm thấy nội dung ${unresolved.join(', ')} trong lớp chữ của nguồn đề.`);
    return { catalog: textCatalog, mode: textCatalog.length > 0 ? 'text' : 'empty', warnings };
  }

  try {
    const ocrText = await activeDeps.ocr(images, input.settings, unresolved);
    const fromOcr = extractQuestionCatalogFromText(ocrText, unresolved);
    const catalog = mergeCatalog(requested, textCatalog, fromOcr);
    if (fromOcr.length === 0) warnings.push('OCR đã chạy nhưng chưa tách chắc chắn được câu hỏi cần xem; hãy mở đề gốc để đối chiếu.');
    const stillMissing = missingQuestions(requested, catalog);
    if (stillMissing.length > 0) warnings.push(`Chưa đọc chắc chắn được: ${stillMissing.join(', ')}.`);
    return {
      catalog,
      mode: catalog.length > textCatalog.length ? (textCatalog.length > 0 ? 'mixed' : 'ocr') : textCatalog.length > 0 ? 'text' : 'empty',
      warnings,
    };
  } catch (error) {
    warnings.push(`Không thể OCR đề gốc: ${asErrorMessage(error)}`);
    return { catalog: textCatalog, mode: textCatalog.length > 0 ? 'text' : 'empty', warnings };
  }
};
