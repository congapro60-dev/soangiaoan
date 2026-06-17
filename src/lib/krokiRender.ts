import pako from 'pako';

export type DiagramType = 'tikz' | 'mermaid' | 'svg';

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

  return null;
}

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
