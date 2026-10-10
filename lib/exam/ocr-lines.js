function normalizeText(text) {
  return text
    .trim()
    .replace(/^(?:Cau|Càu|Câu)\s*(\d+)/iu, 'Câu $1')
    .replace(/^(?:PHAN|PHẦN)\s*([IVXLCDM]+)/iu, 'PHẦN $1')
    .replace(/^(?:Bai|Bài)\s*(\d+)/iu, 'Bài $1');
}

function parseTsv(tsv) {
  if (typeof tsv !== 'string') return [];
  const rows = tsv.trim().split('\n').map(r => r.split('\t'));
  if (rows.length < 2) return [];
  const h = rows[0].map(s => s.trim());
  const iLvl = h.indexOf('level'), iB = h.indexOf('block_num'), iP = h.indexOf('par_num'), iL = h.indexOf('line_num');
  const iX = h.indexOf('left'), iY = h.indexOf('top'), iW = h.indexOf('width'), iH = h.indexOf('height'), iT = h.indexOf('text');

  const groups = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r[iLvl] !== '5') continue;
    const txt = r[iT] ? r[iT].trim() : '';
    if (!txt) continue;
    const key = `${r[iB]}_${r[iP]}_${r[iL]}`;
    const x0 = parseFloat(r[iX]), y0 = parseFloat(r[iY]);
    const x1 = x0 + parseFloat(r[iW]), y1 = y0 + parseFloat(r[iH]);
    if (!groups.has(key)) {
      groups.set(key, { words: [txt], x0, y0, x1, y1 });
    } else {
      const g = groups.get(key);
      g.words.push(txt);
      g.x0 = Math.min(g.x0, x0);
      g.y0 = Math.min(g.y0, y0);
      g.x1 = Math.max(g.x1, x1);
      g.y1 = Math.max(g.y1, y1);
    }
  }
  return Array.from(groups.values()).map(g => ({
    text: g.words.join(' '),
    bbox: { x0: g.x0, y0: g.y0, x1: g.x1, y1: g.y1 }
  }));
}

// ponytail: repair only I-only Roman headers from vertical ink; other numerals stay teacher-reviewed.
export function romanStrokes({width,height,data}) {
  const from=Math.floor(height*0.25),to=Math.ceil(height*0.75),ink=[];
  for(let x=0;x<width;x++){let count=0;for(let y=from;y<to;y++){const at=(y*width+x)*4;if(data[at]<140&&data[at+1]<140&&data[at+2]<140)count++;}ink.push(count);}
  let runs=0,inside=false,stray=0;
  for(const count of ink){const stem=count>=(to-from)*0.7;if(stem&&!inside)runs++;inside=stem;if(!stem)stray+=count;}
  return runs>=1&&runs<=3&&stray<=Math.max(2,(to-from)*0.3)?'I'.repeat(runs):null;
}

/** @param {(bbox: {x0:number,y0:number,x1:number,y1:number}) => ImageData} [getPixels] */
export function ocrLines(data, scale = 1, page = 1, getPixels) {
  if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) {
    throw new TypeError('Invalid scale');
  }

  let raw = [];
  if (Array.isArray(data?.blocks)) {
    for (const b of data.blocks) {
      for (const p of b.paragraphs || []) {
        for (const l of p.lines || []) raw.push(l);
      }
    }
  }
  if (raw.length === 0 && data?.tsv) {
    raw = parseTsv(data.tsv);
  }

  const lines = [];
  for (const item of raw) {
    const b = item.bbox || {};
    const x0 = b.x0 ?? b.left;
    const y0 = b.y0 ?? b.top;
    const x1 = b.x1 ?? (b.right ?? (x0 !== undefined && b.width !== undefined ? x0 + b.width : undefined));
    const y1 = b.y1 ?? (b.bottom ?? (y0 !== undefined && b.height !== undefined ? y0 + b.height : undefined));

    if (
      typeof x0 !== 'number' || typeof y0 !== 'number' ||
      typeof x1 !== 'number' || typeof y1 !== 'number' ||
      !Number.isFinite(x0) || !Number.isFinite(y0) ||
      !Number.isFinite(x1) || !Number.isFinite(y1) ||
      x0 < 0 || y0 < 0 || x1 <= x0 || y1 <= y0
    ) {
      continue;
    }

    let text = normalizeText(item.text || '');
    if (getPixels && /^PHẦN\s+/iu.test(text) && item.words?.[1]?.bbox && /^[Il1L|.]+$/.test(item.words[1].text)) {
      const roman=romanStrokes(getPixels(item.words[1].bbox));
      if(roman)text=text.replace(/^(PHẦN\s+)\S+/iu,'$1'+roman+'.');
    }
    if (!text) continue;

    lines.push({
      text,
      x: x0 / scale,
      top: y0 / scale,
      bottom: y1 / scale,
      page
    });
  }

  return lines.sort((a, b) => a.top - b.top || a.x - b.x);
}

