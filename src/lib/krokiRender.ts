import pako from 'pako';

export type DiagramType = 'tikz' | 'mermaid' | 'svg' | 'geogebra';

export interface DiagramImage {
  data: Uint8Array;
  width: number;
  height: number;
}

export function classifyDiagram(text: string, lang?: string): { type: DiagramType; clean: string } | null {
  const trimmed = text.trim();
  const lowerLang = (lang || '').toLowerCase();

  // SVG
  if (trimmed.startsWith('<svg') || trimmed.startsWith('xml <svg') || trimmed.startsWith('html <svg')) {
    const cleanSvg = trimmed.replace(/^(xml|html)\s*/i, '').trim();
    return { type: 'svg', clean: cleanSvg };
  }

  // TikZ
  if (text.includes('\\begin{tikzpicture}') || trimmed.startsWith('latex \\begin') || trimmed.startsWith('tikz \\begin')) {
    const cleanTikz = trimmed.replace(/^(latex|tikz|tex)\s*/i, '').trim();
    return { type: 'tikz', clean: cleanTikz };
  }

  // Mermaid
  if (lowerLang === 'mermaid' || /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap)\b/.test(trimmed)) {
    return { type: 'mermaid', clean: trimmed };
  }

  // GeoGebra
  if (lowerLang === 'geogebra' || /^geogebra\b/i.test(trimmed)) {
    const cleanGeogebra = trimmed.replace(/^geogebra\s*/i, '').trim();
    return { type: 'geogebra', clean: cleanGeogebra };
  }

  return null;
}

/**
 * Bọc mã TikZ thành tài liệu LaTeX standalone rồi tạo URL Kroki trả SVG.
 * Trả '' nếu mã không hợp lệ (thiếu môi trường tikzpicture) để tránh ảnh vỡ (Kroki 400).
 * (Chuyển từ deweyAssets.ts sang đây — module thuần, pipeline sinh bài dùng được không kéo firebase.)
 */
export const buildTikzKrokiUrl = (tikzRaw: string): string => {
  let tikz = tikzRaw.trim();

  // Sửa ca double-escape: nếu có "\\begin{tikzpicture}" (hai gạch chéo) mà không có bản một gạch
  // → toàn bộ mã bị escape thừa một lớp (lỗi khi qua JSON) → gỡ một lớp.
  if (/\\\\begin\{tikzpicture\}/.test(tikz) && !/(^|[^\\])\\begin\{tikzpicture\}/.test(tikz)) {
    tikz = tikz.replace(/\\\\/g, '\\');
  }

  // Gỡ "\n"/"\r" LITERAL (AI hay double-escape ký tự xuống dòng) → newline thật.
  // Negative lookahead (?![a-zA-Z]) để KHÔNG đụng các lệnh LaTeX bắt đầu bằng \n (\node, \norm…).
  tikz = tikz.replace(/\\[rn](?![a-zA-Z])/g, '\n');

  // Bắt buộc có môi trường tikzpicture đầy đủ; thiếu thì bỏ (vd AI chỉ trả vài lệnh \draw rời → 400).
  if (!/\\begin\{tikzpicture\}/.test(tikz) || !/\\end\{tikzpicture\}/.test(tikz)) return '';

  let payload = tikz.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  if (!payload.includes('\\documentclass')) {
    payload = `\\documentclass[tikz,border=2mm]{standalone}\n\\usepackage[dvipsnames]{xcolor}\n\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}\n\\begin{document}\n${payload}\n\\end{document}`;
  }
  return `https://kroki.io/tikz/svg/${encodeKroki(payload)}`;
};

/**
 * Render thử TikZ qua Kroki, trả {ok, error} — error là THÔNG ĐIỆP LỖI cụ thể để feed lại
 * cho AI tự sửa mã (D6/F11 QA đợt 9: pipeline không được nuốt lỗi im lặng).
 * Lỗi mạng/CORS → coi như không kiểm được (ok=true) để không retry mù.
 */
export const checkTikzWithKroki = async (tikzCode: string): Promise<{ ok: boolean; error: string }> => {
  const url = buildTikzKrokiUrl(tikzCode);
  if (!url) return { ok: false, error: 'Thiếu môi trường \\begin{tikzpicture}...\\end{tikzpicture} hoàn chỉnh.' };
  try {
    const res = await fetch(url);
    const body = await res.text();
    if (!res.ok) return { ok: false, error: `Kroki ${res.status}: ${body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300)}` };
    if (!/<svg[\s>]/i.test(body)) return { ok: false, error: 'Kroki không trả về SVG.' };
    const errMatch = body.match(/(?:tikz Error|Package\s+\w+\s+Error|Undefined control sequence|Emergency stop|! LaTeX Error)[^<]{0,200}/i);
    if (errMatch) return { ok: false, error: errMatch[0] };
    return { ok: true, error: '' };
  } catch {
    return { ok: true, error: '' };
  }
};

export function encodeKroki(source: string): string {
  const data = new TextEncoder().encode(source);
  const compressed = pako.deflate(data, { level: 9 });
  
  // Convert Uint8Array to binary string
  let binaryString = '';
  for (let i = 0; i < compressed.length; i++) {
    binaryString += String.fromCharCode(compressed[i]);
  }
  
  // btoa for browser
  const b64 = btoa(binaryString);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function readPngSize(bytes: Uint8Array): { width: number; height: number } | null {
  // Read width/height from IHDR chunk in PNG
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  // IHDR chunk should follow immediately
  if (bytes.length < 24) return null;
  
  // Check PNG signature
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47 ||
      bytes[4] !== 0x0D || bytes[5] !== 0x0A || bytes[6] !== 0x1A || bytes[7] !== 0x0A) {
    return null;
  }

  // IHDR width is at 16 (4 bytes), height is at 20 (4 bytes)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false); // big-endian
  const height = view.getUint32(20, false); // big-endian

  return { width, height };
}

export async function renderDiagramToPng(
  type: 'tikz' | 'mermaid',
  clean: string
): Promise<DiagramImage | null> {
  try {
    let payload = clean;
    if (type === 'tikz') {
      // Normalize NFD, strip accents, replace đ/Đ
      payload = payload.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      payload = payload.replace(/đ/g, "d").replace(/Đ/g, "D");
      
      if (!payload.includes('\\documentclass')) {
        payload = `\\documentclass[tikz,border=2mm]{standalone}
\\usepackage[dvipsnames]{xcolor}
\\definecolor{indigo}{RGB}{75,0,130}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\begin{document}
${payload}
\\end{document}`;
      }
    }

    const encoded = encodeKroki(payload);
    const url = `https://kroki.io/${type}/png/${encoded}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const size = readPngSize(bytes);

    if (!size) return null;

    return {
      data: bytes,
      width: size.width,
      height: size.height
    };
  } catch (error) {
    console.error('Kroki render error:', error);
    return null;
  }
}

export async function rasterizeSvgToPng(svg: string): Promise<DiagramImage | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const encodedSvg = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Scale x2 for sharpness
          const scale = 2;
          // Determine dimensions
          let w = img.width || 800;
          let h = img.height || 600;
          
          canvas.width = w * scale;
          canvas.height = h * scale;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob(async (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }
            const buffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            resolve({
              data: bytes,
              width: canvas.width,
              height: canvas.height
            });
          }, 'image/png');
        } catch (err) {
          console.error('Canvas rasterize error:', err);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        resolve(null);
      };

      img.src = encodedSvg;
    } catch (err) {
      console.error('SVG encode error:', err);
      resolve(null);
    }
  });
}

export async function rasterizeGeogebraToPng(code: string): Promise<DiagramImage | null> {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '800px';
      iframe.style.height = '500px';
      iframe.style.top = '-9999px';
      iframe.sandbox.add('allow-scripts');
      iframe.sandbox.add('allow-pointer-lock');

      const srcDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <script src="https://www.geogebra.org/apps/deployggb.js"></script>
        <style>body { margin: 0; padding: 0; overflow: hidden; background: white; }</style>
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
            "appletOnLoad": function(api) {
              try {
                var cmds = \`${code.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
                var cmdList = cmds.split('\\n');
                for (var i = 0; i < cmdList.length; i++) {
                  if (cmdList[i].trim()) {
                    api.evalCommand(cmdList[i]);
                  }
                }
                setTimeout(function() {
                  var base64 = api.getPNGBase64(1, false, 300);
                  window.parent.postMessage({ type: 'geogebra_png_result', data: base64 }, '*');
                }, 1500); // 1.5s is usually enough for rendering
              } catch(e) {
                window.parent.postMessage({ type: 'geogebra_png_result', error: true }, '*');
              }
            }
          };
          var applet = new GGBApplet(params, true);
          window.addEventListener("load", function() {
            applet.inject('ggb-element');
          });
        </script>
      </body>
      </html>
      `;

      iframe.srcdoc = srcDoc;

      const timeoutId = setTimeout(() => {
        window.removeEventListener('message', listener);
        document.body.removeChild(iframe);
        resolve(null);
      }, 15000); // 15 seconds max

      const listener = (event: MessageEvent) => {
        if (event.data && event.data.type === 'geogebra_png_result') {
          clearTimeout(timeoutId);
          window.removeEventListener('message', listener);
          document.body.removeChild(iframe);

          if (event.data.error || !event.data.data) {
            resolve(null);
            return;
          }

          const base64Data = event.data.data;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          resolve({
            data: bytes,
            width: 800,
            height: 500
          });
        }
      };

      window.addEventListener('message', listener);
      document.body.appendChild(iframe);

    } catch (err) {
      console.error('GeoGebra rasterize error:', err);
      resolve(null);
    }
  });
}
