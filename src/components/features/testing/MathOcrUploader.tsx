import { useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Sparkles, CheckCircle2 } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { examUtils } from '../../../utils/examUtils';
import { MD_EDITOR_A4_CSS } from '../../../utils/examPaperStyles';
import { DiagramRenderer } from '../creator/DiagramRenderer';

interface Props {
  onInsert: (latex: string) => void;
  onCancel: () => void;
  settings: any;
  showToast: (msg: string, type?: any) => void;
}

export const MathOcrUploader = ({ onInsert, onCancel, settings, showToast }: Props) => {
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const promises = files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises)
      .then(urls => setDataUrls(urls))
      .catch(err => showToast('Lỗi khi đọc file ảnh', 'error'));
  };

  const handleOcr = async () => {
    if (!dataUrls.length) return;
    setIsProcessing(true);
    try {
      const latex = await examUtils.ocrMathImage(dataUrls, settings, showToast);
      if (latex) {
        setResult(latex);
        showToast('Số hóa thành công!', 'success');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Số hóa Đề Toán (Vision OCR)</h2>
              <p className="text-sm text-slate-500">Chuyển đổi ảnh chụp thành văn bản LaTeX & hình vẽ TikZ</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50/50">
          
          {/* Left panel: Upload & Params */}
          <div className="w-full md:w-1/3 border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto bg-white">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Tải ảnh đề bài lên</label>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-purple-500 hover:bg-purple-50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">Chọn hoặc kéo thả ảnh vào đây</p>
                <p className="text-xs text-slate-400 mt-1">Hỗ trợ JPG, PNG, WEBP (có thể chọn nhiều ảnh)</p>
              </div>

              {dataUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {dataUrls.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                      <img src={url} alt={`upload-${idx}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setDataUrls(urls => urls.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-black text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleOcr}
              disabled={isProcessing || !dataUrls.length}
              className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isProcessing ? 'Đang số hóa...' : 'Bắt đầu Số hóa'}
            </button>
            
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-xs space-y-2">
              <p className="font-semibold">💡 Mẹo quét ảnh:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Cắt (crop) ảnh vừa đủ phần câu hỏi.</li>
                <li>Đảm bảo ảnh rõ nét, không bị lóa sáng hay bóng mờ.</li>
                <li>Hệ thống tự nhận diện hình học và chuyển sang mã <code>TikZ</code>.</li>
              </ul>
            </div>
          </div>

          {/* Right panel: Editor & Preview */}
          <div className="w-full md:w-2/3 flex flex-col h-full overflow-hidden bg-white relative">
            <style>{MD_EDITOR_A4_CSS}</style>
            {!result && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 flex-col gap-3 bg-slate-50/50 z-10">
                <ImageIcon className="w-12 h-12 opacity-20" />
                <p>Kết quả số hóa sẽ hiển thị tại đây</p>
              </div>
            )}
            
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 bg-white/80 backdrop-blur-sm z-20">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
                <p className="text-slate-600 font-medium animate-pulse">AI đang phân tích và trích xuất công thức LaTeX...</p>
              </div>
            )}

            <div className="flex-1 min-h-0 exam-board" data-color-mode="light">
              <MDEditor
                value={result}
                onChange={val => setResult(val ?? '')}
                preview="live"
                height="100%"
                previewOptions={{
                  remarkPlugins: [remarkGfm, remarkMath],
                  rehypePlugins: [rehypeRaw, rehypeKatex],
                  components: {
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const lang = match ? match[1] : '';
                      const codeContent = String(children).replace(/\n$/, '');
                      
                      if (!inline && lang === 'tikz') {
                        return (
                          <div className="my-4 border border-slate-200 rounded-xl overflow-hidden bg-white p-4 flex justify-center">
                            <DiagramRenderer
                              code={codeContent}
                              type="tikz"
                            />
                          </div>
                        );
                      }
                      
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }
                }}
                style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white shrink-0">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => onInsert(result)}
            disabled={!result || isProcessing}
            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            Chèn vào đề thi
          </button>
        </div>
      </div>
    </div>
  );
};
