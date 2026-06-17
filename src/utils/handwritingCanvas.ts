import katex from 'katex';
import { saveAs } from 'file-saver';

// We load the font directly via FontFace to ensure it's available for canvas
const loadHandwritingFont = async () => {
  try {
    const font = new FontFace('Caveat', 'url(https://fonts.gstatic.com/s/caveat/v18/Wnz6HAc5bAfYB2Q7Yj82ci2y.woff2)');
    await font.load();
    document.fonts.add(font);
    return true;
  } catch (error) {
    console.error('Failed to load handwriting font:', error);
    return false;
  }
};

const drawRuledBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, lineHeight: number) => {
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, width, height);
  
  // Draw left margin line
  ctx.beginPath();
  ctx.moveTo(120, 0);
  ctx.lineTo(120, height);
  ctx.strokeStyle = '#ff9999';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw horizontal rules
  ctx.strokeStyle = '#99ccff';
  ctx.lineWidth = 1;
  for (let y = 150; y < height; y += lineHeight) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
};

const renderMathToImage = (math: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    try {
      const html = katex.renderToString(math, {
        displayMode: false,
        throwOnError: false,
        output: 'mathml'
      });

      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.visibility = 'hidden';
      
      const width = wrapper.offsetWidth * 2 + 20; // estimate
      const height = wrapper.offsetHeight * 2 + 20;

      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 24px;">
            ${html}
          </div>
        </foreignObject>
      </svg>`;

      document.body.removeChild(wrapper);

      const img = new Image();
      const svg64 = btoa(unescape(encodeURIComponent(svgString)));
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = 'data:image/svg+xml;base64,' + svg64;

    } catch (e) {
      console.error(e);
      resolve(null);
    }
  });
};

export const exportHandwrittenSolution = async (content: string, showToast: (msg: string, type: 'error' | 'success' | 'info') => void) => {
  showToast('Đang tạo ảnh lời giải viết tay...', 'info');
  await loadHandwritingFont();

  const canvas = document.createElement('canvas');
  const width = 1240;
  const height = 1754;
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    showToast('Lỗi khởi tạo canvas', 'error');
    return;
  }

  const lineHeight = 40;
  drawRuledBackground(ctx, width, height, lineHeight);

  ctx.fillStyle = '#0f172a';
  ctx.font = '32px "Caveat", cursive';
  ctx.textBaseline = 'bottom';

  const marginX = 140;
  let cursorX = marginX;
  let cursorY = 150;

  const lines = content.split('\n');

  for (const line of lines) {
    // Simple parser for $...$
    const parts = line.split(/(\$[^$\n]+?\$)/g);
    for (const part of parts) {
      if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        const img = await renderMathToImage(math);
        if (img) {
          if (cursorX + img.width > width - 50) {
            cursorX = marginX;
            cursorY += lineHeight;
          }
          ctx.save();
          const angle = (Math.random() - 0.5) * 0.05; // ± ~1.5°
          const dy = (Math.random() - 0.5) * 4;
          ctx.translate(cursorX, cursorY - lineHeight + dy + 10);
          ctx.rotate(angle);
          ctx.drawImage(img, 0, 0);
          ctx.restore();
          cursorX += img.width + 10;
        }
      } else {
        const words = part.split(' ');
        for (const word of words) {
          const metrics = ctx.measureText(word + ' ');
          if (cursorX + metrics.width > width - 50) {
            cursorX = marginX;
            cursorY += lineHeight;
          }
          
          ctx.save();
          const angle = (Math.random() - 0.5) * 0.05;
          const dy = (Math.random() - 0.5) * 4;
          ctx.translate(cursorX, cursorY + dy);
          ctx.rotate(angle);
          ctx.fillText(word + ' ', 0, 0);
          ctx.restore();
          
          cursorX += metrics.width;
        }
      }
    }
    cursorX = marginX;
    cursorY += lineHeight;
  }

  canvas.toBlob((blob) => {
    if (blob) {
      saveAs(blob, 'loi-giai-viet-tay.png');
      showToast('Đã tải xuống ảnh lời giải!', 'success');
    } else {
      showToast('Lỗi xuất ảnh!', 'error');
    }
  }, 'image/png');
};
