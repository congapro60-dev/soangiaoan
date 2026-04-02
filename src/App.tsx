import { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Settings, 
  Plus, 
  FileText, 
  LayoutDashboard, 
  MessageSquare, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  Eye,
  Save,
  Search,
  Sparkles,
  Calculator,
  Zap,
  FlaskConical,
  Dna,
  Key,
  Layout,
  Upload,
  FileUp,
  FileCheck,
  Layers,
  FileSpreadsheet,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
// Native download helper - no file-saver library needed
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};
import { cn } from './lib/utils';
import { callGeminiAI, MODELS } from './lib/gemini';
import { AppData, DEFAULT_DATA, LessonPlan, LessonTemplate, TemplateFile, CurriculumDistribution } from './types';

// Set PDF.js worker - try unpkg CDN, with fallback to disable worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;
} catch (e) {
  // fallback: no worker (slower but works)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
}

// Icon mapping for subjects
const ICON_MAP: Record<string, any> = {
  Calculator,
  Zap,
  FlaskConical,
  Dna,
  BookOpen,
};

export default function App() {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('smart_lesson_plan_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration for templates
      if (!parsed.templates) parsed.templates = DEFAULT_DATA.templates;
      return parsed;
    }
    return DEFAULT_DATA;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'creator' | 'library' | 'chat' | 'templates'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Partial<LessonPlan>>({
    title: '',
    content: '',
    subjectId: 'math',
    templateId: ''
  });
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [generationMode, setGenerationMode] = useState<'single' | 'bulk'>('single');
  const [lessonDocs, setLessonDocs] = useState<TemplateFile[]>([]);
  const [distributionFile, setDistributionFile] = useState<TemplateFile | null>(null);
  const [bulkCommand, setBulkCommand] = useState('');
  const [bulkResults, setBulkResults] = useState<LessonPlan[]>([]);
  const [singleRequirement, setSingleRequirement] = useState('');
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [latexContent, setLatexContent] = useState('');
  const [isLatexModalOpen, setIsLatexModalOpen] = useState(false);

  useEffect(() => {
    if (!data.settings.geminiApiKey) {
      setIsSettingsOpen(true);
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<{ category: 'sample' | 'criteria' | 'lesson_doc' | 'distribution', templateId?: string } | null>(null);

  // File parsing functions
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    try {
      // Thử với worker hiện tại
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
      // Fallback: tắt worker, chạy trực tiếp
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
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

  const extractTextFromWord = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromExcel = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let fullText = '';
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      fullText += `Sheet: ${sheetName}\n` + json.map((row: any) => row.join('\t')).join('\n') + '\n\n';
    });
    return fullText;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !uploadingFiles) return;

    if (uploadingFiles.templateId) {
      const template = data.templates.find(t => t.id === uploadingFiles.templateId);
      if (!template) return;

      const currentFilesCount = template.files.filter(f => f.category === uploadingFiles.category).length;
      const remainingSlots = 10 - currentFilesCount;

      if (files.length > remainingSlots) {
        showToast(`Bạn chỉ có thể tải lên tối đa 10 tệp cho má»—i loại. Còn lại ${remainingSlots} slot.`, 'warning');
        return;
      }
    } else if (uploadingFiles.category === 'lesson_doc') {
      const remainingSlots = 10 - lessonDocs.length;
      if (files.length > remainingSlots) {
        showToast(`Bạn chỉ được tải lên tối đa 10 tài liệu tham khảo. Còn lại ${remainingSlots} slot.`, 'warning');
        return;
      }
    }

    setIsLoading(true);
    try {
      const newFiles: TemplateFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let type: 'pdf' | 'word' | 'excel' = 'pdf';
        if (file.name.endsWith('.pdf')) type = 'pdf';
        else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) type = 'word';
        else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) type = 'excel';
        
        let content = '';
        try {
          if (type === 'pdf') {
            content = await extractTextFromPDF(file);
          } else if (type === 'word') {
            content = await extractTextFromWord(file);
          } else if (type === 'excel') {
            content = await extractTextFromExcel(file);
          }
        } catch (fileError: any) {
          console.error(`Error processing file ${file.name}:`, fileError);
          continue; // Bỏ qua file lỗi, tiếp tục với file khác
        }

        newFiles.push({
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          type,
          content,
          category: uploadingFiles!.category
        });
      }

      if (uploadingFiles.templateId) {
        setData(prev => ({
          ...prev,
          templates: prev.templates.map(t => 
            t.id === uploadingFiles.templateId 
              ? { ...t, files: [...t.files, ...newFiles] } 
              : t
          )
        }));
      } else if (uploadingFiles.category === 'lesson_doc') {
        setLessonDocs(prev => [...prev, ...newFiles]);
      } else if (uploadingFiles.category === 'distribution') {
        setDistributionFile(newFiles[0]);
      }
      
      showToast(`Đã tải lên ${newFiles.length} tệp thành công!`);
    } catch (error) {
      console.error('File upload error:', error);
      showToast('Lỗi khi xử lý tệp. Vui lòng thử lại.', 'error');
    } finally {
      setIsLoading(false);
      setUploadingFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('smart_lesson_plan_data', JSON.stringify(data));
  }, [data]);

  const showToast = (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    Swal.fire({
      title,
      icon,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  };

  // ============================================================
  // Smart Markdown Table Repair
  // Problem: AI generates \n inside table cells â†’ each \n becomes new row â†’ columns misalign
  // Fix: detect orphaned lines adjacent to table rows, merge them back with <br/>
  // Also: strip inline images that break table structure
  // ============================================================
  const cleanMarkdownOutput = (text: string): string => {
    if (!text) return text;

    // Step 1: Normalize <br> variants to <br/> (self-closing, works with rehype-raw)
    let result = text.replace(/<br\s*\/?>/gi, '<br/>');

    // Step 2: Strip image tags INSIDE table rows (images break table structure completely)
    // Pattern: | cell |  ![alt](url) more text | => | cell | more text |
    result = result.replace(
      /\|([^|\n]*)!\[[^\]]*\]\([^)]*\)([^|\n]*)/g,
      '|$1$2'
    );

    // Step 3: Repair orphaned lines that escaped from table cells
    // When AI writes a newline inside what should be 1 table row, Markdown
    // treats subsequent lines as new rows â€” columns completely misalign.
    const lines = result.split('\n');
    const repaired: string[] = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const prevIdx = repaired.length - 1;
      const prevLine = prevIdx >= 0 ? repaired[prevIdx] : '';
      const prevTrimmed = prevLine.trim();

      const isTableRow = trimmed.startsWith('|');
      const isSeparator = /^\|[\s\-:|]+\|/.test(trimmed);
      const isEmpty = trimmed === '';
      const prevIsTableRow = prevTrimmed.startsWith('|');
      const prevIsSeparator = /^\|[\s\-:|]+\|/.test(prevTrimmed);

      if (isSeparator) {
        inTable = true;
        repaired.push(line);
      } else if (isTableRow) {
        inTable = true;
        repaired.push(line);
      } else if (!isEmpty && inTable && prevIsTableRow && !prevIsSeparator) {
        // Orphaned content â€” should be inside the previous row's cell
        // Heuristic: if content starts with GV:/HS:/Họạt động: â†’ inject into col 2 (activity)
        //            otherwise â†’ inject into col 3 (board content)
        const row = repaired[prevIdx];
        const pipes = row.split('|');
        // pipes[0]='', pipes[1]=col1, pipes[2]=col2, pipes[3]=col3, pipes[4]=''
        if (pipes.length >= 4) {
          // Determine which column to inject into
          const isActivityContent = /^(GV|HS|Họ:|Lưu ý|\*{0,2}(GV|HS))/i.test(trimmed);
          if (isActivityContent) {
            // Inject into column 2 (activity column)
            pipes[2] = pipes[2] + '<br/>' + trimmed;
          } else {
            // Inject into column 3 (board content column)
            pipes[3] = pipes[3] + '<br/>' + trimmed;
          }
          repaired[prevIdx] = pipes.join('|');
        } else {
          // Fallback: merge before last pipe
          const lastPipePos = row.lastIndexOf(' |');
          if (lastPipePos > 0) {
            repaired[prevIdx] = row.slice(0, lastPipePos) + '<br/>' + trimmed + row.slice(lastPipePos);
          } else {
            repaired.push(line);
          }
        }
      } else {
        if (isEmpty) inTable = false;
        repaired.push(line);
      }
    }

    result = repaired.join('\n');

    // Step 4: Collapse 3+ blank lines to double blank
    result = result.replace(/\n{3,}/g, '\n\n');

    return result;
  };

  const handleCreateLesson = async () => {
    if (!data.settings.geminiApiKey) {
      setIsSettingsOpen(true);
      showToast('Vui lòng nhập API Key!', 'warning');
      return;
    }

    if (generationMode === 'single' && !currentPlan.title) {
      showToast('Vui lòng nhập tiêu đề giáo án!', 'warning');
      return;
    }

    if (generationMode === 'bulk' && (!distributionFile || !bulkCommand)) {
      showToast('Vui lòng tải lên phân phối chương trình và nhập yêu cầu soạn thảo!', 'warning');
      return;
    }

    setIsLoading(true);
    setBulkResults([]);

    try {
      const subject = data.subjects.find(s => s.id === currentPlan.subjectId)?.name || 'Chung';
      const selectedTemplate = data.templates.find(t => t.id === currentPlan.templateId);
      
      let templateContext = '';
      if (selectedTemplate) {
        const samples = selectedTemplate.files.filter(f => f.category === 'sample').map(f => f.content).join('\n---\n');
        const criteria = selectedTemplate.files.filter(f => f.category === 'criteria').map(f => f.content).join('\n---\n');
        templateContext = `
          DỰA TRÊN MẪU GIÁO ÁN SAU (Cấu trúc và phong cách):
          ${samples}
          
          TUÂN THỦ CÁC TIÊU CHÍ/QUY ĐỊNH SAU:
          ${criteria}
        `;
      }

      if (generationMode === 'single') {
        const lessonDocsContent = lessonDocs.map(f => f.content).join('\n---\n');
        const prompt = `
          Bạn là một chuyên gia giáo dục cao cấp. Hãy soạn một giáo án chi tiết và chuyên nghiệp cho môn học: ${subject}.
          Tiêu đề bài học: ${currentPlan.title}.
          
          ${templateContext}
          ${lessonDocsContent ? `TÀI LIỆU THAM KHẢO CHO BÀI HỌC:\n${lessonDocsContent}` : ''}
          ${singleRequirement ? `YÊU CẦU BỔ SUNG TỪ GIÁO VIÊN: ${singleRequirement}` : ''}

          Yêu cầu chung:
          1. TỔNG HỢP KIẾN THỨC: Hãy sử dụng kiến thức cập nhật nhất từ internet để làm phong phú nội dung bài giảng.

          2. ĐỊNH DẠNG MARKDOWN - QUY TẮC BẮT BUỘC TỐI QUAN TRỌNG:
             a) TIẾN TRÌNH DẠY HỌC PHẢI LUÔN LÀ BẢNG DUY NHẤT CÓ ĐÚNG 3 CỘT: "Thời gian", "Hoạt động của Giáo viên và Học sinh", "Nội dung ghi bảng/chiếu PPT".
             b) QUY TẮC BẢNG: Mỗi hàng bảng PHẢI nằm trên ĐÚNG 1 DÒNG. TUYỆT ĐỐI KHÔNG xuống dòng bằng phím Enter trong ô bảng.
                - Để ngăn cách nội dung (GV, HS) trong ô: Bạn bắt buộc phải dùng duy nhất thẻ "<br/>"
             c) TUYỆT ĐỐI KHÔNG chèn hình ảnh ![...](url) vào trong ô bảng - ảnh chỉ được phép chèn tại các đoạn văn bổ sung bên dưới bảng.
             d) Mỗi hoạt động (Khởi động, Hình thành kiến thức...) phải cách nhau 1 dòng trắng.

          3. CÔNG THỨC TOÁN HỌC:
             - Cả trong bảng và đoạn văn: Ưu tiên dùng biểu thức dạng Toán inline: $...$ (ví dụ: $x^2 + y^2 = 1$).
             - TUYỆT ĐỐI KHÔNG dùng $$...$$ bên trong bảng vì nó sẽ phá vỡ định dạng bảng hiển thị.

          4. HÌNH ẢNH: Chỉ chèn hình ảnh vào đoạn văn ngoài bảng, giới hạn 1 hình cho cả bài. Hình dùng API: ![Mô tả](https://image.pollinations.ai/prompt/{mô_tả_tiếng_anh}?width=600&height=300&nologo=true)

          5. MỤC TIÊU HOẠT ĐỘNG: Viết theo dạng "Tôi có thể...".
             Ví dụ: "Tôi có thể phát biểu được công thức khai triển nhị thức Newton."

          6. KHUNG ĐÁNH GIÁ DANIELSON: Từ tài liệu "Tiêu chí và Quy định" người dùng cung cấp (nếu có), hãy trích dẫn chính xác và cụ thể tên Miền + Các Chỉ số phụ (chữ cái a, b, c...) khi viết mục "Đối chiếu khung đánh giá Danielson".

          7. CHI TIẾT: Đảm bảo đầy đủ các bước (1. Khởi động, 2. Trình bày Mục tiêu, 3. Hoạt động chính, 4. Luyện tập, 5. Vận dụng). Mỗi bước đều phải có Bảng 3 Cột riêng biệt theo mẫu.

          8. VÍ DỤ CÚ PHÁP BẢNG 3 CỘT (MẪU CHUẨN MÀ BẠN PHẢI THEO):
          | Thời gian | Hoạt động của Giáo viên và Học sinh | Nội dung ghi bảng/chiếu PPT |
          |---|---|---|
          | 5 phút | **GV:** Đặt vấn đề bằng bài toán thực tế.<br/>**GV hỏi:** "Các em tính $\\binom{n}{k}$ thế nào?"<br/>**HS suy nghĩ:** 1 phút<br/>**HS dự kiến trả lời:** "Số tổ hợp chập k của n phần tử"<br/>**GV chốt lại:** Trình bày định lý Nhị thức. | **I. Định lý Nhị thức Newton**<br/>Công thức:<br/>$(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k}b^k$ |
          => LUÔN NHỚ: Tuyệt đối không dùng dấu Enter xuống dòng trong ô. Mọi khoảng nghỉ tách dòng giữa GV, HS đều sử dụng "<br/>".
          ${subject === 'Toán học' || subject.toLowerCase().includes('toán') ? `
          
===========================================================
YÊU CẦU ĐẶC BIỆT CHO GIÁO ÁN MÔN TOÁN - BẮT BUỘC TUÂN THỦ
===========================================================

A. THÔNG TIN CHUNG (Nội dung mở đầu trước khi lập bảng)
- Gồm 3 phần bắt buộc:
  1. NĂNG LỰC: Liệt kê năng lực cốt lõi. Gắn thẻ [🌐 Công dân toàn cầu], [💻 Công dân kỹ thuật số] nếu phù hợp.
  2. MỤC TIÊU PHÂN HÓA (Tôi có thể...):
     - Học sinh Trung bình: (Áp dụng công thức căn bản)
     - Học sinh Khá: (Vận dụng tương đối)
     - Học sinh Giỏi: (Vận dụng linh hoạt, mở rộng)
  3. CHUẨN BỊ: Công cụ, phương tiện (máy tính Casio, v.v).

B. HOẠT ĐỘNG LUYỆN TẬP
- Luôn phải có 3 bài tập được phân độ khó rõ ràng (Bài 1: Trung bình, Bài 2: Khá, Bài 3: Giỏi) và có hướng dẫn giải (ẩn hoặc tóm tắt) nằm trực tiếp ở Cột 3 (Nội dung chiếu PPT).

C. KIỂM TRA NHANH: Nêu rõ sau phần lý thuyết/ ví dụ, kèm theo việc check biểu đồ năng lực/giơ bảng nhanh của nhóm học sinh.

D. KIỂM TRA CỐT LÕI (AI SELF-CHECK):
  - [x] Có bảng 3 cột (Thời gian | Hoạt động GV&HS | Ghi bảng) phân hóa chuẩn không?
  - [x] Các dòng ngắt nghỉ trong ô đã dùng <br/> thay cho xuống dòng chưa?
  - [x] Đã format mục tiêu dạng năng lực "Tôi có thể..." chưa?
===========================================================
          ` : ''}
        `;
        const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
        if (result) {
          setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(result) }));
          showToast('Đã khởi tạo giáo án thành công!');
        }
      } else {
        // Bulk mode
        const prompt = `
          Bạn là một chuyên gia giáo dục cao cấp.
          DỰA TRÊN PHÂN PHỐI CHƯƠNG TRÌNH SAU:\n${distributionFile?.content}
          
          YÊU CẦU SOẠN THẢO HÀNG LOẠT: ${bulkCommand}
          MÔN HỌC: ${subject}
          
          ${templateContext}
          
          Hãy soạn các giáo án theo yêu cầu trên. 
          QUAN TRỌNG: Trả về kết quả dưới dạng một mảng JSON các đối tượng, mỗi đối tượng có 2 trường: "title" (tiêu đề bài học) và "content" (nội dung giáo án bằng Markdown).
          Ví dụ: [{"title": "Bài 1...", "content": "..."}, {"title": "Bài 2...", "content": "..."}]
          Chỉ trả về JSON, không kèm theo văn bản giải thích nào khác.
        `;
        const response = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
        if (response) {
          try {
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const results = JSON.parse(jsonStr);
            if (Array.isArray(results)) {
              const newPlans = results.map((r: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                subjectId: currentPlan.subjectId,
                templateId: currentPlan.templateId,
                title: r.title,
                content: r.content,
                status: 'draft' as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }));
              setBulkResults(newPlans);
              showToast(`Đã soạn thảo thành công ${newPlans.length} giáo án!`);
            }
          } catch (e) {
            console.error('JSON parse error:', e, response);
            showToast('Lỗi khi xử lý kết quả từ AI. Vui lòng thử lại.', 'error');
          }
        }
      }
    } catch (error: any) {
      // Bắt lỗi raw API error VD: 429 RESOURCE_EXHAUSTED
      const errorMsg = error.message || JSON.stringify(error) || 'Lỗi không xác định';
      Swal.fire({
        title: 'Đã dừng do lỗi',
        text: `Lỗi kết nối API: ${errorMsg}. Vui lòng kiểm tra lại quota hoặc thử lại sau.`,
        icon: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveBulkPlans = () => {
    if (bulkResults.length === 0) return;

    setData(prev => ({
      ...prev,
      lessonPlans: [...bulkResults.map(p => ({ ...p, status: 'completed' as const })), ...prev.lessonPlans]
    }));
    
    setBulkResults([]);
    setActiveTab('library');
    showToast(`Đã lưu ${bulkResults.length} giáo án vào thư viện!`);
  };

  const saveLessonPlan = () => {
    if (!currentPlan.title || !currentPlan.content) return;

    const newPlan: LessonPlan = {
      id: Math.random().toString(36).substr(2, 9),
      subjectId: currentPlan.subjectId || 'math',
      templateId: currentPlan.templateId,
      title: currentPlan.title,
      content: currentPlan.content,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setData(prev => ({
      ...prev,
      lessonPlans: [newPlan, ...prev.lessonPlans]
    }));
    
    setCurrentPlan({ title: '', content: '', subjectId: 'math', templateId: '' });
    setActiveTab('library');
    showToast('Đã lưu giáo án vào thư viện!');
  };

  const deletePlan = (id: string) => {
    Swal.fire({
      title: 'Xác nhận xóa?',
      text: "Bạn không thể hoàn tác hành động này!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Xóa ngay',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        setData(prev => ({
          ...prev,
          lessonPlans: prev.lessonPlans.filter(p => p.id !== id)
        }));
        showToast('Đã xóa giáo án');
      }
    });
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !data.settings.geminiApiKey) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsLoading(true);

    try {
      const context = currentPlan.content ? `Dựa trên giáo án hiện tại: ${currentPlan.content.substring(0, 1000)}...` : '';
      const prompt = `${context}\n\nNgười dùng hỏi: ${userMsg}\n\nHãy trả lời ngắn gọn và há»— trợ giáo viên tinh chỉnh giáo án.`;
      
      const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
      if (result) {
        setChatMessages(prev => [...prev, { role: 'ai', text: result }]);
      }
    } catch (error) {
      showToast('Lỗi AI Chat', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  const exportToPDF = () => {
    const element = document.getElementById('lesson-content');
    if (!element) return;

    // Inject page-break CSS to prevent tables from splitting across pages
    const style = document.createElement('style');
    style.id = 'pdf-print-style';
    style.innerHTML = `
      @media print {
        table { page-break-inside: avoid !important; border-collapse: collapse !important; }
        tr    { page-break-inside: avoid !important; }
        td, th { page-break-inside: avoid !important; }
        h1, h2, h3 { page-break-after: avoid !important; }
        p  { orphans: 3; widows: 3; }
      }
      #lesson-content * { font-family: 'Times New Roman', Times, serif !important; font-size: 14pt !important; }
      #lesson-content h1 { font-size: 20pt !important; }
      #lesson-content h2 { font-size: 17pt !important; }
      #lesson-content h3 { font-size: 15pt !important; }
      #lesson-content table { page-break-inside: avoid !important; }
      #lesson-content tr    { page-break-inside: avoid !important; }
    `;
    document.head.appendChild(style);
    
    const opt = {
      margin: [15, 12, 15, 12], // mm: top, right, bottom, left
      filename: `${currentPlan.title || 'giao-an'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    // @ts-ignore
    window.html2pdf().from(element).set(opt).save().then(() => {
      // Clean up injected style
      const injected = document.getElementById('pdf-print-style');
      if (injected) injected.remove();
    });
    showToast('Đang xuất file PDF...');
  };

  const exportToWord = async () => {
    if (!currentPlan.content) return;
    try {
      const contentEl = document.getElementById('lesson-content');
      if (!contentEl) { showToast('Không tìm thấy nội dung giáo án', 'error'); return; }

      const cloned = contentEl.cloneNode(true) as HTMLElement;

      // Extract KaTeX MathML natively and inject it with Microsoft Office OMML-compatible mml namespaces
      cloned.querySelectorAll('.katex').forEach(el => {
        const mathmlNode = el.querySelector('.katex-mathml math');
        if (mathmlNode) {
          // Add mml namespaces to all math tags so Word automatically coerces them into Equation Objects
          let mathStr = mathmlNode.outerHTML;
          // Prefix all mathml tags with <mml:...>
          mathStr = mathStr.replace(/<(\/?)(math|semantics|mrow|mi|mo|mn|ms|mspace|mtext|menclose|merror|mfenced|mfrac|mpadded|mphantom|mroot|msqrt|mstyle|msub|msup|msubsup|mtable|mtr|mtd|maligngroup|malignmark|mlabeledtr)/g, '<$1mml:$2');
          
          const span = document.createElement('span');
          span.innerHTML = mathStr;
          el.replaceWith(span);
        } else {
          // Fallback if mathml is missing, just strip katex
          const annotation = el.querySelector('annotation');
          el.replaceWith(document.createTextNode(annotation ? annotation.textContent || '' : ''));
        }
      });
      cloned.querySelectorAll('.katex-html').forEach(el => el.remove());

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns:mml="http://www.w3.org/1998/Math/MathML"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><style>
          body    { font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.8; margin: 2cm; }
          h1      { font-family: 'Times New Roman', Times, serif; font-size: 20pt; font-weight: bold; color: #1a365d; margin-top: 14pt; margin-bottom: 6pt; text-align: center; }
          h2      { font-family: 'Times New Roman', Times, serif; font-size: 17pt; font-weight: bold; color: #2d3748; margin-top: 12pt; margin-bottom: 4pt; }
          h3      { font-family: 'Times New Roman', Times, serif; font-size: 15pt; font-weight: bold; color: #4a5568; margin-top: 10pt; margin-bottom: 4pt; }
          p       { font-family: 'Times New Roman', Times, serif; font-size: 14pt; margin: 4pt 0; text-align: justify; }
          table   { border-collapse: collapse; width: 100%; margin: 10pt 0; page-break-inside: avoid; }
          th, td  { font-family: 'Times New Roman', Times, serif; font-size: 13pt; border: 1px solid #718096; padding: 6pt 8pt; text-align: left; vertical-align: top; }
          th      { background-color: #e2e8f0; font-weight: bold; }
          ul, ol  { font-family: 'Times New Roman', Times, serif; font-size: 14pt; margin-left: 20pt; }
          li      { margin: 2pt 0; }
          strong  { font-weight: bold; }
          em      { font-style: italic; }
        </style></head>
        <body>${cloned.innerHTML}</body></html>
      `;
      const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/vnd.ms-word;charset=utf-8'
      });
      downloadBlob(blob, `${currentPlan.title || 'giao-an'}.doc`);
      showToast('Đã xuất file Word (có Công thức native)!');
    } catch (e) {
      console.error(e);
      showToast('Lỗi khi tải file Word', 'error');
    }
  };

  const exportToLaTeX = async () => {
    if (!currentPlan.content) return;
    if (!data.settings.geminiApiKey) {
      setIsSettingsOpen(true);
      showToast('Vui lòng nhập API Key!', 'warning');
      return;
    }
    setIsLoading(true);
    showToast('Đang chuyển đổi giáo án sang LaTeX...', 'info');
    try {
      const prompt = `
Bạn là chuyên gia LaTeX. Hãy chuyển đổi CHÍNH XÁC nội dung giáo án Markdown sau sang mã nguồn LaTeX (.tex) hoàn chỉnh, có thể biên dịch trực tiếp trên Overleaf.

NỘI DUNG GIÁO ÁN:
---
${currentPlan.content}
---

YÊU CẦU BẮT BUỘC:
1. Tạo file .tex hoàn chỉnh với \\documentclass{article}, \\usepackage cần thiết (inputenc, babel, geometry, array, longtable, graphicx, hyperref, enumitem, titlesec, xcolor).
2. Mọi BẢNG BIỔU phải được chuyển thành \\begin{tabular} hoặc \\begin{longtable} với đầy đủ cột, hàng, đường kẻ (\\hline).
3. Công thức Toán phải bọc trong $ hoặc \\[ \\].
4. Tiêu đề sử dụng \\section, \\subsection, \\subsubsection.
5. Danh sách dùng \\begin{itemize} hoặc \\begin{enumerate}.
6. Hình ảnh (nếu có URL) dùng \\includegraphics hoặc ghi chú URL.
7. Sử dụng tiếng Việt với \\usepackage[vietnamese]{babel} hoặc \\usepackage{fontspec} nếu cần.
8. CHỈ TRẢ VỀ MÃ NGUỒN LATEX THUẦN TÚY, không bọc trong markdown code block, không kèm giải thích.
      `;
      const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
      if (result) {
        const cleanLatex = result.replace(/^```(?:latex|tex)?\n?/i, '').replace(/\n?```$/i, '').trim();
        setLatexContent(cleanLatex);
        setIsLatexModalOpen(true);
        showToast('Đã chuyển đổi sang LaTeX thành công!');
      }
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi chuyển đổi sang LaTeX', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadLaTeXFile = () => {
    if (!latexContent) return;
    const blob = new Blob([latexContent], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${currentPlan.title || 'giao-an'}.tex`);
    showToast('Đã tải file .tex!');
  };

  const openInOverleaf = () => {
    if (!latexContent) return;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.overleaf.com/docs';
    form.target = '_blank';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'snip_uri';
    input.value = 'data:application/x-tex;base64,' + btoa(unescape(encodeURIComponent(latexContent)));
    form.appendChild(input);
    const nameInput = document.createElement('input');
    nameInput.type = 'hidden';
    nameInput.name = 'snip_name';
    nameInput.value = `${currentPlan.title || 'giao-an'}.tex`;
    form.appendChild(nameInput);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    showToast('Đang mở Overleaf...');
  };

  const generatePPTX = async () => {
    if (!currentPlan.title || !currentPlan.content) return;
    if (!data.settings.geminiApiKey) {
      showToast('Vui lòng cung cấp API Key AI để tạo slide', 'warning');
      return;
    }
    
    setIsLoading(true);
    showToast('Đang thiết kế slide bài giảng từ giáo án, vui lòng chờ...', 'info');
    
    try {
      const prompt = `
        Dựa vào nội dung giáo án sau, hãy tạo cấu trúc Slide bài giảng PowerPoint.
        Giáo án:
        ${currentPlan.content}

        YÊU CẦU BẮT BUỘC:
        1. Trả về ĐÃšNG định dạng chuá»—i JSON thuần tuý là một mảng object: [{"title": "Tiêu đề Slide 1", "points": ["Ý 1", "Ý 2"]}, ...]
        2. Tóm tắt súc tích, má»—i slide không vượt quá 5 ý.
        3. TUYỆT ĐỐI KHÔNG DÃ™NG LaTeX ($...$) CHO CÔNG THỨC TOÁN HỌC. Bạn bắt buộc dùng Unicode thuần túy (VD: x², âˆš, âˆ«) để hiển thị công thức ngay ở text (equation format mode).
        4. Tối đa 12 slides.
        Chỉ trả về JSON, không kèm giải thích hay markdown code block chứa json.
      `;
      
      const response = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
      if (!response) throw new Error("No response");
      
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const slidesData = JSON.parse(jsonStr);
      
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_16x9';
      
      const slideTitle = pptx.addSlide();
      slideTitle.background = { color: "0B2447" };
      slideTitle.addText(currentPlan.title, {
        x: 1, y: 2.2, w: '80%', h: 1.5,
        fontSize: 40, color: "FFFFFF", bold: true, align: "center",
        fontFace: "Times New Roman"
      });
      
      slidesData.forEach((s: any) => {
        const pSlide = pptx.addSlide();
        pSlide.background = { color: "F8F9FA" };
        pSlide.addText(s.title, {
          x: 0.5, y: 0.3, w: '90%', h: 0.9,
          fontSize: 28, bold: true, color: "19376D",
          fontFace: "Times New Roman"
        });
        const bulletPoints = s.points.map((p: string) => ({
          text: p,
          options: { bullet: true, fontSize: 18, fontFace: "Times New Roman", color: "333333" }
        }));
        pSlide.addText(bulletPoints, {
          x: 0.5, y: 1.4, w: '90%', h: 4.8,
          valign: 'top', fontFace: "Times New Roman", fontSize: 18
        });
      });
      
      pptx.writeFile({ fileName: `${currentPlan.title || 'baigiang'}.pptx` });
      showToast('Đã tải xuống file trình chiếu PPTX thành công!');
    } catch (e) {
      console.error(e);
      showToast('Lỗi cấu trúc hoặc kết nối AI, vui lòng thử lại', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviseLesson = async () => {
    if (!revisionPrompt.trim()) return;
    if (!data.settings.geminiApiKey) {
      setIsSettingsOpen(true);
      showToast('Vui lòng nhập API Key!', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const prompt = `
        Đây là nội dung giáo án hiện tại bạn đã soạn:
        ---
        ${currentPlan.content}
        ---
        
        Người dùng (Giáo viên) có yêu cầu sửa đổi, bổ sung như sau:
        "${revisionPrompt}"
        
        Vui lòng viết lại toàn bộ giáo án để đáp ứng chính xác yêu cầu trên.
        TUÂN THỦ CÁC QUY TẮC BẮT BUỘC:
        1. Giữ nguyên định dạng Markdown chuyên nghiệp.
        2. CÔNG THỨC TOÁN HỌC: Đối với công thức Toán Học, KHÔNG được dùng LaTeX (như $x^2$ hay $$...$$). Bạn bắt buộc phải hiển thị công thức dạng text unicode phẳng (ví dụ x², âˆšx, phân số dạng a/b, biểu thức dạng equation thông thường dá»… đọc)
        
        Trình bày kết quả trực tiếp, không cần bắt đầu bằng câu giới thiệu.
      `;

      const result = await callGeminiAI(prompt, data.settings.geminiApiKey, MODELS.indexOf(data.settings.selectedModel));
      if (result) {
        setCurrentPlan(prev => ({ ...prev, content: result }));
        setRevisionPrompt('');
        showToast('Đã cập nhật giáo án theo yêu cầu!');
      }
    } catch (error) {
      showToast('Lỗi khi sửa đổi giáo án. Vui lòng thử lại.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addTemplate = () => {
    Swal.fire({
      title: 'Thêm mẫu giáo án mới',
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-medium mb-1">Tên mẫu giáo án</label>
            <input id="tpl-name" class="swal2-input w-full m-0" placeholder="Ví dụ: Mẫu giáo án 5E - Môn Toán">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Môn học</label>
            <select id="tpl-subject" class="swal2-input w-full m-0">
              ${data.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Tạo mẫu',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const name = (document.getElementById('tpl-name') as HTMLInputElement).value;
        const subjectId = (document.getElementById('tpl-subject') as HTMLSelectElement).value;
        if (!name) {
          Swal.showValidationMessage('Vui lòng nhập tên mẫu!');
          return false;
        }
        return { name, subjectId };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const newTemplate: LessonTemplate = {
          id: `tpl-${Date.now()}`,
          name: result.value.name,
          subjectId: result.value.subjectId,
          files: [],
          createdAt: new Date().toISOString()
        };
        setData(prev => ({
          ...prev,
          templates: [newTemplate, ...prev.templates]
        }));
        showToast('Đã tạo mẫu mới. Hãy tải lên các tệp giáo án mẫu và tiêu chí!');
      }
    });
  };

  const deleteTemplate = (id: string) => {
    Swal.fire({
      title: 'Xóa mẫu giáo án?',
      text: "Tất cả tệp đính kèm trong mẫu này cũng sẽ bị xóa!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Xóa ngay',
      cancelButtonText: 'Hủy'
    }).then((result) => {
      if (result.isConfirmed) {
        setData(prev => ({
          ...prev,
          templates: prev.templates.filter(t => t.id !== id)
        }));
        showToast('Đã xóa mẫu giáo án');
      }
    });
  };

  const deleteFile = (templateId: string, fileId: string) => {
    setData(prev => ({
      ...prev,
      templates: prev.templates.map(t => 
        t.id === templateId 
          ? { ...t, files: t.files.filter(f => f.id !== fileId) } 
          : t
      )
    }));
    showToast('Đã xóa tệp');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        multiple
        className="hidden"
      />
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="relative flex flex-col h-full bg-white border-r border-slate-200 shadow-sm z-30"
      >
        <div className="p-6 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-xl gradient-text whitespace-nowrap">SmartPlan AI</span>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'creator', label: 'Soạn giáo án', icon: Plus },
            { id: 'library', label: 'Thư viện', icon: FileText },
            { id: 'templates', label: 'Mẫu giáo án', icon: Layout },
            { id: 'chat', label: 'AI Tutor', icon: MessageSquare },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                activeTab === item.id 
                  ? "bg-blue-50 text-blue-600 font-medium" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-50 transition-all"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span>Cài đặt</span>}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="mt-2 w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-slate-50 transition-all"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            {isSidebarOpen && <span>Thu gọn</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-20">
          <h2 className="text-lg font-semibold text-slate-800">
            {activeTab === 'dashboard' && 'Bảng điều khiển'}
            {activeTab === 'creator' && 'Soạn giáo án mới'}
            {activeTab === 'library' && 'Thư viện giáo án'}
            {activeTab === 'templates' && 'Mẫu giáo án & Tiêu chí'}
            {activeTab === 'chat' && 'Trợ lý AI'}
          </h2>
          <div className="flex items-center gap-4">
            {!data.settings.geminiApiKey && (
              <span className="text-red-500 text-sm font-semibold animate-pulse hidden sm:block">Lấy API key để sử dụng app</span>
            )}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-colors"
            >
              <Key className="w-4 h-4" /> Settings
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
              <div className={cn("w-2 h-2 rounded-full", data.settings.geminiApiKey ? "bg-green-500" : "bg-red-500")} />
              {data.settings.geminiApiKey ? 'AI Ready' : 'Cần nhập API Key'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <FileText className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-medium text-slate-400">Tổng số</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{data.lessonPlans.length}</div>
                    <div className="text-sm text-slate-500 mt-1">Giáo án đã soạn</div>
                  </div>
                  <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-medium text-slate-400">Tuân thủ</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">98%</div>
                    <div className="text-sm text-slate-500 mt-1">Độ chính xác trung bình</div>
                  </div>
                  <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-green-50 rounded-xl text-green-600">
                        <Zap className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-medium text-slate-400">Tiết kiệm</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">~12h</div>
                    <div className="text-sm text-slate-500 mt-1">Thời gian chuẩn bị/tuần</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      Môn học của bạn
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {data.subjects.map(subject => {
                        const Icon = ICON_MAP[subject.icon] || BookOpen;
                        return (
                          <div key={subject.id} className="p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                <Icon className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800">{subject.name}</div>
                                <div className="text-xs text-slate-500">{subject.lessonCount} giáo án</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-500" />
                      Giáo án gần đây
                    </h3>
                    <div className="space-y-3">
                      {data.lessonPlans.slice(0, 4).map(plan => (
                        <div key={plan.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">{plan.title}</div>
                              <div className="text-xs text-slate-400">{dayjs(plan.createdAt).format('DD/MM/YYYY')}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300" />
                        </div>
                      ))}
                      {data.lessonPlans.length === 0 && (
                        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                          Chưa có giáo án nào. Hãy bắt đầu soạn thảo!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'creator' && (
              <motion.div 
                key="creator"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-5xl mx-auto space-y-6"
              >
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                  {/* Mode Toggle */}
                  <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
                    <button 
                      onClick={() => setGenerationMode('single')}
                      className={cn(
                        "px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2",
                        generationMode === 'single' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <FileText className="w-4 h-4" /> Soạn từng bài
                    </button>
                    <button 
                      onClick={() => setGenerationMode('bulk')}
                      className={cn(
                        "px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2",
                        generationMode === 'bulk' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <Layers className="w-4 h-4" /> Soạn hàng loạt
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {generationMode === 'single' && (
                      <div className="space-y-2 md:col-span-1">
                        <label className="text-sm font-semibold text-slate-700">Tiêu đề bài học</label>
                        <input 
                          type="text" 
                          value={currentPlan.title}
                          onChange={(e) => setCurrentPlan(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Ví dụ: Đạo hàm cấp 2..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Môn học</label>
                      <select 
                        value={currentPlan.subjectId}
                        onChange={(e) => setCurrentPlan(prev => ({ ...prev, subjectId: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        {data.subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Chọn mẫu giáo án</label>
                      <select 
                        value={currentPlan.templateId}
                        onChange={(e) => setCurrentPlan(prev => ({ ...prev, templateId: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="">-- Không sử dụng mẫu --</option>
                        {data.templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Mode Specific Inputs */}
                  {generationMode === 'single' ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Tài liệu tham khảo cho bài học (PDF/Word)</label>
                        <div className="flex flex-wrap gap-2">
                          {lessonDocs.map(doc => (
                            <div key={doc.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">
                              <FileText className="w-4 h-4" />
                              <span className="max-w-[150px] truncate">{doc.name}</span>
                              <button onClick={() => setLessonDocs(prev => prev.filter(d => d.id !== doc.id))} className="hover:text-red-500">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              setUploadingFiles({ category: 'lesson_doc' });
                              fileInputRef.current?.click();
                            }}
                            className="px-4 py-1.5 border border-dashed border-slate-300 text-slate-500 rounded-lg text-sm hover:border-blue-500 hover:text-blue-500 transition-all flex items-center gap-2"
                          >
                            <UploadCloud className="w-4 h-4" /> Tải tài liệu
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Yêu cầu cụ thể cho bài học này</label>
                        <textarea 
                          value={singleRequirement}
                          onChange={(e) => setSingleRequirement(e.target.value)}
                          placeholder="Ví dụ: Tập trung vào các ví dụ thực tế, thêm phần thảo luận nhóm..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Phân phối chương trình (Excel/Word/PDF)</label>
                        <div className="flex items-center gap-4">
                          {distributionFile ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl border border-green-100">
                              <FileSpreadsheet className="w-5 h-5" />
                              <span className="font-medium">{distributionFile.name}</span>
                              <button onClick={() => setDistributionFile(null)} className="hover:text-red-500 ml-2">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setUploadingFiles({ category: 'distribution' });
                                fileInputRef.current?.click();
                              }}
                              className="w-full py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all"
                            >
                              <UploadCloud className="w-8 h-8" />
                              <span className="font-medium">Tải lên tệp phân phối chương trình</span>
                              <span className="text-xs">Há»— trợ Excel, Word, PDF</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Yêu cầu soạn thảo hàng loạt</label>
                        <textarea 
                          value={bulkCommand}
                          onChange={(e) => setBulkCommand(e.target.value)}
                          placeholder="Ví dụ: Soạn cho tôi 5 bài từ bài số 10; Soạn tất cả các bài trong tuần thứ 5..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button 
                      onClick={handleCreateLesson}
                      disabled={isLoading}
                      className="flex-1 py-4 gradient-bg text-white rounded-2xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                      {isLoading ? 'Đang phân tích...' : generationMode === 'single' ? 'Khởi tạo giáo án thông minh' : 'Soạn thảo hàng loạt theo phân phối'}
                    </button>
                  </div>
                </div>

                {/* Single Result */}
                {generationMode === 'single' && currentPlan.content && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h3 className="text-xl font-bold text-slate-800">Kết quả giáo án</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={saveLessonPlan}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-100 transition-colors"
                        >
                          <Save className="w-4 h-4" /> Lưu thư viện
                        </button>
                        <button 
                          onClick={exportToPDF}
                          className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-medium flex items-center gap-2 hover:bg-slate-100 transition-colors"
                        >
                          <Download className="w-4 h-4" /> Xuất PDF
                        </button>
                        <button 
                          onClick={exportToWord}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-100 transition-colors"
                        >
                          <FileText className="w-4 h-4" /> Xuất Word
                        </button>
                        <button 
                          onClick={generatePPTX}
                          className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-medium flex items-center gap-2 hover:bg-orange-100 transition-colors"
                        >
                          <Layers className="w-4 h-4" /> Tạo Slide
                        </button>
                        <button 
                          onClick={exportToLaTeX}
                          disabled={isLoading}
                          className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-medium flex items-center gap-2 hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <FileSpreadsheet className="w-4 h-4" /> Xuất LaTeX
                        </button>
                      </div>
                    </div>
                    <div id="lesson-content" className="prose prose-slate max-w-none markdown-body">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                      >{currentPlan.content || ''}</ReactMarkdown>
                    </div>

                    {/* Feedback Form */}
                    <div className="pt-6 border-t border-slate-100 space-y-3">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-orange-500" />
                        Chưa hài lòng? Yêu cầu AI sửa đổi giáo án này
                      </label>
                      <div className="flex flex-col gap-3">
                        <textarea
                          value={revisionPrompt}
                          onChange={(e) => setRevisionPrompt(e.target.value)}
                          placeholder="Ví dụ: Rút ngắn phần khởi động lại thành 5 phút, thêm 1 trò chơi tương tác vào phần luyện tập, giải thích kỹ hơn phần công thức..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all min-h-[100px]"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handleReviseLesson}
                            disabled={isLoading || !revisionPrompt.trim()}
                            className="px-6 py-2.5 bg-orange-50 text-orange-600 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-100 transition-all disabled:opacity-50"
                          >
                            {isLoading ? (
                              <div className="w-5 h-5 border-2 border-orange-600/30 border-t-orange-600 rounded-full animate-spin" />
                            ) : (
                              <Sparkles className="w-5 h-5" />
                            )}
                            Sửa đổi theo yêu cầu
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Bulk Results */}
                {generationMode === 'bulk' && bulkResults.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-800">Danh sách giáo án đã soạn ({bulkResults.length})</h3>
                      <button 
                        onClick={saveBulkPlans}
                        className="px-6 py-3 gradient-bg text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200"
                      >
                        <Save className="w-5 h-5" /> Lưu tất cả vào thư viện
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                      {bulkResults.map((result, idx) => (
                        <motion.div 
                          key={result.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-4"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <h4 className="text-lg font-bold text-blue-600">{result.title}</h4>
                            <button 
                              onClick={() => {
                                const element = document.createElement('div');
                                element.innerHTML = result.content;
                                // Simple export for individual bulk items could be added here
                                showToast('Chức năng xuất PDF lẻ đang được cập nhật. Vui lòng lưu vào thư viện để xuất.');
                              }}
                              className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="prose prose-slate max-w-none markdown-body max-h-[300px] overflow-y-auto pr-4">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeRaw, rehypeKatex]}
                            >{result.content}</ReactMarkdown>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'library' && (
              <motion.div 
                key="library"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm giáo án..."
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => setActiveTab('creator')}
                    className="px-6 py-3 gradient-bg text-white rounded-2xl font-bold flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Soạn mới
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.lessonPlans.map(plan => (
                    <div key={plan.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                            <Eye className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => deletePlan(plan.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-800 line-clamp-1 mb-1">{plan.title}</h4>
                      <p className="text-xs text-slate-500 mb-4">Môn: {data.subjects.find(s => s.id === plan.subjectId)?.name}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                          {dayjs(plan.createdAt).format('DD MMM YYYY')}
                        </span>
                        <div className="flex items-center gap-1 text-green-500 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> HOÃ€N THÃ€NH
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {data.lessonPlans.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p>Thư viện trống. Hãy tạo giáo án đầu tiên!</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'templates' && (
              <motion.div 
                key="templates"
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="space-y-6 max-w-6xl mx-auto"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Mẫu giáo án & Tiêu chí</h2>
                    <p className="text-sm text-slate-500">Tải lên giáo án mẫu và các tệp tiêu chí (PDF/Word) để AI soạn thảo đúng chuẩn</p>
                  </div>
                  <button 
                    onClick={addTemplate}
                    className="gradient-bg text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all hover:opacity-90"
                  >
                    <Plus size={20} /> Thêm mẫu mới
                  </button>
                </div>


                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {data.templates.map(tpl => (
                    <div key={tpl.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Layout size={28} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">{tpl.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">
                                {data.subjects.find(s => s.id === tpl.subjectId)?.name}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                {dayjs(tpl.createdAt).format('DD/MM/YYYY')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteTemplate(tpl.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sample Lesson Plans */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <FileText size={14} className="text-blue-500" /> Giáo án mẫu
                            </h4>
                            <button 
                              onClick={() => {
                                setUploadingFiles({ category: 'sample', templateId: tpl.id });
                                fileInputRef.current?.click();
                              }}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Tải lên giáo án mẫu"
                            >
                              <Upload size={14} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {tpl.files.filter(f => f.category === 'sample').map(file => (
                              <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group/file">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileUp size={14} className="text-blue-400 shrink-0" />
                                  <span className="text-xs text-slate-600 truncate font-medium">{file.name}</span>
                                </div>
                                <button 
                                  onClick={() => deleteFile(tpl.id, file.id)}
                                  className="opacity-0 group-hover/file:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                            {tpl.files.filter(f => f.category === 'sample').length === 0 && (
                              <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-xl text-[10px] text-slate-400">
                                Chưa có giáo án mẫu
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Criteria Documents */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <FileCheck size={14} className="text-green-500" /> Tiêu chí & Quy định
                            </h4>
                            <button 
                              onClick={() => {
                                setUploadingFiles({ category: 'criteria', templateId: tpl.id });
                                fileInputRef.current?.click();
                              }}
                              className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                              title="Tải lên tiêu chí"
                            >
                              <Upload size={14} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {tpl.files.filter(f => f.category === 'criteria').map(file => (
                              <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group/file">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileCheck size={14} className="text-green-400 shrink-0" />
                                  <span className="text-xs text-slate-600 truncate font-medium">{file.name}</span>
                                </div>
                                <button 
                                  onClick={() => deleteFile(tpl.id, file.id)}
                                  className="opacity-0 group-hover/file:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                            {tpl.files.filter(f => f.category === 'criteria').length === 0 && (
                              <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-xl text-[10px] text-slate-400">
                                Chưa có tệp tiêu chí (Tối đa 10 tệp)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.templates.length === 0 && (
                    <div className="lg:col-span-2 p-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 text-slate-400">
                      <Layout className="w-16 h-16 mx-auto mb-4 opacity-10" />
                      <p className="text-lg font-medium">Chưa có mẫu giáo án nào</p>
                      <p className="text-sm">Hãy thêm mẫu đầu tiên và tải lên các tệp hướng dẫn để AI học tập</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
                    <MessageSquare className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">AI Tutor</div>
                    <div className="text-xs text-green-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Đang trực tuyến
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                      <MessageSquare className="w-16 h-16 opacity-10" />
                      <p className="text-center max-w-xs">Chào thầy/cô! Tôi có thể giúp gì trong việc tinh chỉnh giáo án hôm nay?</p>
                    </div>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[80%] p-4 rounded-2xl text-sm",
                        msg.role === 'user' 
                          ? "bg-blue-600 text-white rounded-tr-none" 
                          : "bg-slate-100 text-slate-800 rounded-tl-none"
                      )}>
                        {msg.role === 'ai' ? (
                          <div className="markdown-body">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeRaw, rehypeKatex]}
                            >{msg.text}</ReactMarkdown>
                          </div>
                        ) : msg.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100">
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                      placeholder="Nhập yêu cầu (ví dụ: 'Hãy thêm hoạt động trò chơi cho bài này'...)"
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button 
                      onClick={handleChat}
                      className="p-3 gradient-bg text-white rounded-xl shadow-md hover:opacity-90 transition-opacity"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" />
                  Cài đặt hệ thống
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Key className="w-4 h-4" /> Gemini API Key</div>
                    <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Lấy Key tại đây</a>
                  </label>
                  <input 
                    type="password" 
                    value={data.settings.geminiApiKey}
                    onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, geminiApiKey: e.target.value } }))}
                    placeholder="Nhập API Key của bạn..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400">API Key được lưu an toàn trong trình duyệt của bạn.</p>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">Mô hình AI</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Nhanh, hiệu suất cao (Default)' },
                      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', desc: 'Thông minh, suy luận rất tốt' },
                      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Phiên bản ổn định' }
                    ].map(m => (
                      <div 
                        key={m.id}
                        onClick={() => setData(prev => ({ ...prev, settings: { ...prev.settings, selectedModel: m.id } }))}
                        className={cn(
                          "p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between",
                          data.settings.selectedModel === m.id ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div>
                          <div className={cn("font-bold text-sm", data.settings.selectedModel === m.id ? "text-blue-700" : "text-slate-700")}>{m.name}</div>
                          <div className="text-xs text-slate-500">{m.desc}</div>
                        </div>
                        {data.settings.selectedModel === m.id && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-sm font-medium text-slate-700">Tự động lưu</span>
                  <div 
                    onClick={() => setData(prev => ({ ...prev, settings: { ...prev.settings, autoSave: !prev.settings.autoSave } }))}
                    className={cn(
                      "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors",
                      data.settings.autoSave ? "bg-blue-600" : "bg-slate-300"
                    )}
                  >
                    <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", data.settings.autoSave ? "translate-x-6" : "translate-x-0")} />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Đóng
                </button>
                <button 
                  onClick={() => {
                    setIsSettingsOpen(false);
                    showToast('Đã lưu cài đặt!');
                  }}
                  className="flex-1 py-3 gradient-bg text-white rounded-xl font-bold shadow-lg shadow-blue-200"
                >
                  Lưu thay đổi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LaTeX Modal */}
      <AnimatePresence>
        {isLatexModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsLatexModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Mã nguồn LaTeX</h3>
                  <p className="text-sm text-slate-500 mt-1">Có thể biên dịch trực tiếp trên Overleaf hoặc TeX Live</p>
                </div>
                <button onClick={() => setIsLatexModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <pre className="bg-slate-900 text-green-300 p-6 rounded-2xl text-sm font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                  {latexContent}
                </pre>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3 flex-wrap">
                <button 
                  onClick={downloadLaTeXFile}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-5 h-5" /> Tải file .tex
                </button>
                <button 
                  onClick={openInOverleaf}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors"
                >
                  <Layout className="w-5 h-5" /> Mở trên Overleaf
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(latexContent);
                    showToast('Đã sao chép mã LaTeX!');
                  }}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <FileCheck className="w-5 h-5" /> Sao chép
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
