import { useState, useEffect } from 'react';
import pako from 'pako';
import { Loader2, AlertCircle } from 'lucide-react';

interface DiagramRendererProps {
  code: string;
  type: 'tikz' | 'svg' | 'mermaid' | 'plantuml';
}

export const DiagramRenderer = ({ code, type }: DiagramRendererProps) => {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        if (type === 'tikz' && !finalCode.includes('\\documentclass')) {
          finalCode = `\\documentclass[tikz,border=2mm]{standalone}\n\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}\n\\begin{document}\n${finalCode}\n\\end{document}`;
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
      <div className="my-6 p-4 border border-red-200 rounded-2xl bg-red-50 text-red-600 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold">Lỗi hiển thị hình ảnh</h4>
          <p className="text-xs mt-1">{error}</p>
          <details className="mt-2 text-[10px] opacity-80 cursor-pointer">
            <summary>Xem mã code gốc</summary>
            <pre className="mt-2 p-2 bg-red-100/50 rounded-lg overflow-x-auto whitespace-pre-wrap">{code}</pre>
          </details>
        </div>
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
