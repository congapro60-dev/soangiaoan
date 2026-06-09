import { useState, useEffect } from 'react';
import pako from 'pako';
import { Loader2, Code2, Copy, Check } from 'lucide-react';

interface DiagramRendererProps {
  code: string;
  type: 'tikz' | 'svg' | 'mermaid' | 'plantuml';
}

export const DiagramRenderer = ({ code, type }: DiagramRendererProps) => {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      // For raw SVG, just return it directly
      if (type === 'svg') {
        if (code.trim().startsWith('<svg')) {
          setSvgContent(code);
        } else {
          setError('Mã SVG không hợp lệ');
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let finalCode = code;
        if (type === 'tikz') {
          finalCode = finalCode.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
          if (!finalCode.includes('\\documentclass')) {
            finalCode = `\\documentclass[tikz,border=2mm]{standalone}\n\\usepackage[dvipsnames]{xcolor}\n\\definecolor{indigo}{RGB}{75,0,130}\n\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}\n\\begin{document}\n${finalCode}\n\\end{document}`;
          }
        }

        // Prepare payload for Kroki
        const data = new TextEncoder().encode(finalCode);
        const compressed = pako.deflate(data, { level: 9 });
        const result = String.fromCharCode.apply(null, Array.from(new Uint8Array(compressed)));
        const base64 = btoa(result)
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, ''); // URL-safe Base64

        const url = `https://kroki.io/${type}/svg/${base64}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Kroki Error: ${response.status} - ${errText}`);
        }

        const svgText = await response.text();
        if (isMounted) setSvgContent(svgText);
      } catch (err: any) {
        console.error('Lỗi khi render Diagram:', err);
        if (isMounted) setError(err.message || 'Không thể tải hình ảnh minh họa');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [code, type]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center my-6 p-8 border border-slate-200 rounded-2xl bg-slate-50 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <span className="text-sm font-medium">Đang render hình ảnh...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-6 p-5 border border-slate-200 border-dashed rounded-2xl bg-slate-50 text-slate-600 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <Code2 className="w-5 h-5 shrink-0 mt-0.5 text-slate-400" />
            <div>
              <h4 className="text-sm font-bold text-slate-700">🎨 Hình vẽ minh họa (Mã đồ họa)</h4>
              <p className="text-xs mt-1 text-slate-500">
                Hệ thống AI đã tạo mã nguồn đồ họa ({type.toUpperCase()}) nhưng có thể chứa cú pháp phức tạp không hiển thị trực tiếp được. Thầy/Cô có thể sao chép mã nguồn bên dưới để tinh chỉnh.
              </p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Đã chép' : 'Sao chép'}
          </button>
        </div>
        <details className="text-[11px] opacity-80 cursor-pointer group">
          <summary className="font-medium text-slate-500 hover:text-slate-700 transition-colors">Xem mã code gốc</summary>
          <pre className="mt-2 p-3 bg-white border border-slate-200 rounded-xl overflow-x-auto whitespace-pre-wrap font-mono text-[10px] text-slate-700 select-all">{code}</pre>
        </details>
      </div>
    );
  }

  if (svgContent) {
    return (
      <div 
        className="flex justify-center my-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow diagram-container"
        dangerouslySetInnerHTML={{ __html: svgContent }} 
      />
    );
  }

  return null;
};
