import { useState, useEffect } from 'react';
import pako from 'pako';
import { Loader2, Code2, Copy, Check } from 'lucide-react';

interface DiagramRendererProps {
  code: string;
  type: 'tikz' | 'svg' | 'mermaid' | 'plantuml' | 'geogebra';
}

const CUSTOM_COLOR_MAP: Record<string, string> = {
  indigo: '75,0,130', teal: '0,128,128', primary: '63,81,181',
  orange: '255,165,0', purple: '128,0,128', brown: '139,69,19',
  pink: '255,105,180', olive: '128,128,0', navy: '0,0,128',
  coral: '255,127,80', salmon: '250,128,114', gold: '255,215,0',
  darkred: '139,0,0', darkgreen: '0,100,0', darkblue: '0,0,139',
  skyblue: '135,206,235', limegreen: '50,205,50', crimson: '220,20,60',
};

function cleanTikzCode(raw: string): string {
  let tikz = raw;

  // Fix double-escaped backslashes (AI producing \\begin instead of \begin)
  if (/\\\\begin\{tikzpicture\}/.test(tikz) && !/(^|[^\\])\\begin\{tikzpicture\}/.test(tikz)) {
    tikz = tikz.replace(/\\\\/g, '\\');
  }

  // Fix literal \n \r (AI double-escaping newlines), preserving LaTeX commands like \node
  tikz = tikz.replace(/\\[rn](?![a-zA-Z])/g, '\n');

  // Wrap bare \begin{axis} in tikzpicture if missing
  if (/\\begin\{axis\}/.test(tikz) && !/\\begin\{tikzpicture\}/.test(tikz)) {
    tikz = `\\begin{tikzpicture}\n${tikz}\n\\end{tikzpicture}`;
  }

  // Replace custom/invented color names with \definecolor + standard alternatives
  const defineLines: string[] = [];
  for (const [name, rgb] of Object.entries(CUSTOM_COLOR_MAP)) {
    const re = new RegExp(`(?<=\\{|,|\\[|=)${name}(?=\\}|,|\\]|!|$)`, 'gi');
    if (re.test(tikz)) {
      defineLines.push(`\\definecolor{${name}}{RGB}{${rgb}}`);
    }
  }

  // Strip accents from Vietnamese text
  tikz = tikz.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

  if (!tikz.includes('\\documentclass')) {
    const defines = defineLines.length > 0 ? defineLines.join('\n') + '\n' : '';
    tikz = `\\documentclass[tikz,border=2mm]{standalone}\n\\usepackage[dvipsnames]{xcolor}\n${defines}\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}\n\\begin{document}\n${tikz}\n\\end{document}`;
  } else if (defineLines.length > 0) {
    // Inject definecolor lines after \usepackage{xcolor} or before \begin{document}
    const insertPoint = tikz.indexOf('\\begin{document}');
    if (insertPoint >= 0) {
      tikz = tikz.slice(0, insertPoint) + defineLines.join('\n') + '\n' + tikz.slice(insertPoint);
    }
  }

  return tikz;
}

function encodeForKroki(source: string): string {
  const data = new TextEncoder().encode(source);
  const compressed = pako.deflate(data, { level: 9 });
  let binaryString = '';
  for (let i = 0; i < compressed.length; i++) {
    binaryString += String.fromCharCode(compressed[i]);
  }
  return btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function fetchKroki(type: string, payload: string): Promise<string> {
  const url = `https://kroki.io/${type}/svg/${encodeForKroki(payload)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Kroki Error: ${response.status} - ${errText}`);
  }
  return response.text();
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
      if (type === 'svg') {
        if (code.trim().startsWith('<svg')) {
          setSvgContent(code);
        } else {
          setError('Mã SVG không hợp lệ');
        }
        return;
      }

      if (type === 'geogebra') return;

      setIsLoading(true);
      setError(null);

      try {
        if (type === 'tikz') {
          const cleaned = cleanTikzCode(code);
          try {
            const svg = await fetchKroki('tikz', cleaned);
            if (isMounted) setSvgContent(svg);
            return;
          } catch {
            // Retry: strip problematic packages and simplify
            const simplified = cleaned
              .replace(/\\usepackage\{tkz-euclide\}[^\n]*/g, '')
              .replace(/\\usepackage\{tkz[^}]*\}[^\n]*/g, '')
              .replace(/\\tkz[A-Za-z]+\{[^}]*\}(\{[^}]*\})*/g, '');
            try {
              const svg = await fetchKroki('tikz', simplified);
              if (isMounted) setSvgContent(svg);
              return;
            } catch (err2: any) {
              throw err2;
            }
          }
        }

        // mermaid / plantuml
        const svg = await fetchKroki(type, code);
        if (isMounted) setSvgContent(svg);
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

  if (type === 'geogebra') {
    const srcDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <script src="https://www.geogebra.org/apps/deployggb.js"></script>
        <style>
          body { margin: 0; padding: 0; overflow: hidden; display: flex; justify-content: center; align-items: center; background: white; }
          #ggb-element { width: 100vw; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="ggb-element"></div>
        <script>
          var params = {
            "appName": "geometry",
            "width": 800,
            "height": 500,
            "showToolBar": false,
            "showAlgebraInput": false,
            "showMenuBar": false,
            "enableRightClick": false,
            "showResetIcon": true,
            "language": "vi",
            "appletOnLoad": function(api) {
              var cmds = \`${code.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
              var cmdList = cmds.split('\\n');
              for (var i = 0; i < cmdList.length; i++) {
                if (cmdList[i].trim()) {
                  api.evalCommand(cmdList[i]);
                }
              }
            }
          };
          var applet = new GGBApplet(params, true);
          window.addEventListener("load", function() {
            applet.inject('ggb-element');
          });

          // Lắng nghe yêu cầu xuất ảnh từ trang mẹ
          window.addEventListener('message', function(event) {
            if (event.data === 'getPNG') {
              if (window.ggbApplet) {
                var base64 = window.ggbApplet.getPNGBase64(1, false, 300);
                event.source.postMessage({ type: 'geogebra_png', data: base64 }, event.origin);
              }
            }
          });
        </script>
      </body>
      </html>
    `;

    return (
      <div className="flex justify-center my-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm hover:shadow-md transition-shadow geogebra-container relative group">
        <iframe
          srcDoc={srcDoc}
          className="w-full aspect-video rounded-xl geogebra-iframe"
          sandbox="allow-scripts allow-forms allow-pointer-lock"
          title="GeoGebra Diagram"
          style={{ minHeight: '400px' }}
        />
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-white/90 backdrop-blur border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600 inline mr-1" /> : <Copy className="w-3.5 h-3.5 inline mr-1" />}
            {copied ? 'Đã chép mã' : 'Sao chép mã'}
          </button>
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
