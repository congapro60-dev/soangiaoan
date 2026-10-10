import { unzipSync } from 'fflate';
import { importDocx, parseDocxArchive, parseXml, calculateCrc32, DOCX_MAX_BYTES } from '../lesson/import/docx.js';
import { parseExamLines, examLine } from './parse.js';
import { LIMITS } from './validate.js';

const REL = new Set(['http://schemas.openxmlformats.org/officeDocument/2006/relationships','http://purl.oclc.org/ooxml/officeDocument/relationships']);
const PACKAGE = 'http://schemas.openxmlformats.org/package/2006/relationships';
const DRAW = new Set(['http://schemas.openxmlformats.org/drawingml/2006/main','http://purl.oclc.org/ooxml/drawingml/main']);
const maxImageBytes = Math.floor(LIMITS.imageBase64 / 4) * 3;
const invalid = () => { throw new Error('INVALID_BODY'); };
const nodes = function* (node) { if (!node || typeof node !== 'object') return; yield node; for (const child of node.children || []) yield* nodes(child); };
const attr = (node,name,ns='') => node.resolvedAttrs?.find(a=>a.localName===name && (typeof ns==='string'?a.nsUri===ns:ns.has(a.nsUri)))?.value;

/** Compatibility only: the lesson importer remains the sole OMML converter. */
export const examMathText = text => String(text).replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g, math => {
  const delimiter=math.startsWith('$$')?'$$':'$';
  const units=[];
  let content=math.slice(delimiter.length,-delimiter.length).replace(/[\u2000-\u200b\u00a0]/g,' ').replace(/∥/g,'\\parallel ').replace(/⊄/g,'\\not\\subset ').replace(/△/g,'\\triangle ');
  const textCommands=[...content.matchAll(/\\(?:text|operatorname)\{[^}]*\}/g)].map(m=>[m.index,m.index+m[0].length]);
  content=content.replace(/(?<![A-Za-z\\])(sin|cos|tan|cot|log|ln)(?=[\\({\s\d]|[A-Za-z](?:$|[^A-Za-z]))/g,(word,_name,offset)=>textCommands.some(([start,end])=>offset>=start&&offset<end)?word:'\\'+word+' ');
  content=content.replace(/\s*\\left\(triệu đồng\\right\)/g,()=>{units.push('(triệu đồng)');return '';}).replace(/năm/g,()=>{units.push('năm');return '';});
  // Vietnamese prose is displayed beside equations; it is not a mathematical symbol.
  return delimiter+content.replace(/\s*hoặc\s*/g,()=>delimiter+' hoặc '+delimiter)+delimiter+(units.length?' '+units.join(' '):'');
});

function mediaType(bytes) {
  if (bytes.length>=8 && [137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)) return 'image/png';
  if (bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
  if (bytes.length>=12 && String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP') return 'image/webp';
  return null;
}

// Check selected entries' central metadata before fflate allocates their output; verify CRC after inflate.
function selectedFiles(bytes) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength), decoder=new TextDecoder();
  let eocd=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--) if(view.getUint32(p,true)===0x06054b50){eocd=p;break;}
  if(eocd<0) invalid();
  const metadata=new Map(); let pos=view.getUint32(eocd+16,true),total=0;
  for(let i=0;i<view.getUint16(eocd+10,true);i++) {
    if(pos+46>bytes.length || view.getUint32(pos,true)!==0x02014b50) invalid();
    const length=view.getUint16(pos+28,true),extra=view.getUint16(pos+30,true),comment=view.getUint16(pos+32,true);
    if(pos+46+length+extra+comment>bytes.length) invalid();
    const name=decoder.decode(bytes.subarray(pos+46,pos+46+length));
    if(name==='word/_rels/document.xml.rels' || /^word\/media\/[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp)$/i.test(name)) {
      const size=view.getUint32(pos+24,true);
      if(metadata.has(name) || size>(name.endsWith('.rels')?256000:maxImageBytes) || (total+=size)>DOCX_MAX_BYTES || (view.getUint16(pos+8,true)&1)) invalid();
      metadata.set(name,{size,crc:view.getUint32(pos+16,true)});
    }
    pos+=46+length+extra+comment;
  }
  const files=unzipSync(bytes,{filter:file=>{
    const meta=metadata.get(file.name);
    if(!meta) return false;
    if(file.originalSize!==meta.size) invalid();
    return true;
  }});
  for(const [name,data] of Object.entries(files)) if(data.length!==metadata.get(name).size || calculateCrc32(data)!==metadata.get(name).crc) invalid();
  return files;
}

export function importExamDocx(bytes) {
  if(!(bytes instanceof Uint8Array) || bytes.length>DOCX_MAX_BYTES) invalid();
  let archive,converted,files;
  try { archive=parseDocxArchive(bytes); files=selectedFiles(bytes); converted=importDocx({bytes,originalName:'de-kiem-tra.docx'}); } catch { invalid(); }
  if(!converted?.ok) invalid();
  const warnings=[],rows=[],segments=converted.segments;
  for(const segment of segments) for(const text of String(segment.text||'').split(/\r?\n/)) {
    const cleaned=examMathText(examLine(text));
    if(cleaned) rows.push({text:cleaned,segmentId:segment.id});
  }
  if(rows.length>4000) invalid();
  const parsed=parseExamLines(rows),images=[],relations=new Map();
  if(files['word/_rels/document.xml.rels']) {
    let root;
    try { root=parseXml(new TextDecoder().decode(files['word/_rels/document.xml.rels'])); } catch { invalid(); }
    for(const node of nodes(root)) if(node.nsUri===PACKAGE && node.localName==='Relationship') {
      const id=attr(node,'Id'),target=attr(node,'Target'),type=attr(node,'Type');
      const path=target?.startsWith('/word/media/')?target.slice(1):'word/'+target;
      if(!id || relations.has(id)) invalid();
      if(attr(node,'TargetMode')==='External' || ![...REL].some(ns=>type===ns+'/image') || !/^word\/media\/[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp)$/i.test(path||'')) { relations.set(id,null); continue; }
      relations.set(id,path);
    }
  }
  let document;
  try { document=parseXml(archive.documentXml); } catch { invalid(); }
  const blips=[...nodes(document)].filter(n=>(DRAW.has(n.nsUri)&&n.localName==='blip') || (n.nsUri==='urn:schemas-microsoft-com:vml'&&n.localName==='imagedata'));
  const ordered=[...converted.uncertainties].sort((a,b)=>(a.xmlLocation?.startOffset||0)-(b.xmlLocation?.startOffset||0));
  for(const uncertainty of ordered) {
    if(uncertainty.kind==='omml_math_preserved' || (uncertainty.kind==='unsupported_word_content' && /bookmark|proofErr|lastRenderedPageBreak|commentRange/.test(uncertainty.xmlLocation?.tag||''))) continue;
    if(uncertainty.kind!=='unsupported_drawing') {
      const description=uncertainty.kind==='invalid_math_syntax'?'Công thức cần kiểm tra cú pháp.':uncertainty.kind==='unsupported_math_object'?'Có cấu trúc công thức chưa hỗ trợ; đối chiếu bản Word.':'Có nội dung Word chưa hỗ trợ; giáo viên cần đối chiếu bản gốc.';
      warnings.push('Đoạn '+uncertainty.segmentId+': '+description);
      continue;
    }
    // An image-only paragraph belongs to the preceding question, not the next one.
    const index=segments.findIndex(s=>s.id===uncertainty.segmentId);
    let question;
    for(let i=index;i>=0&&!question;i--) {
      if(/^PHẦN\s+/iu.test(examLine(segments[i].text))) break;
      question=parsed.questions.find(q=>q.segmentIds?.includes(segments[i].id));
    }
    const candidates=blips.filter(n=>n.startOffset>=uncertainty.xmlLocation.startOffset && n.endOffset<=uncertainty.xmlLocation.endOffset);
    if(!question || candidates.length!==1) { warnings.push('Hình tại '+uncertainty.segmentId+': không xác định duy nhất câu hoặc ảnh; cần thêm bằng tay.'); continue; }
    const id=attr(candidates[0],candidates[0].localName==='blip'?'embed':'id',REL),path=relations.get(id),data=files[path],mime=data&&mediaType(data);
    if(!mime || !(mime==='image/png'?/\.png$/i:mime==='image/jpeg'?/\.jpe?g$/i:/\.webp$/i).test(path)) { warnings.push(question.label+': hình nhúng không an toàn hoặc không đọc được; chỉ nhận PNG/JPEG/WebP nội bộ.'); continue; }
    let binary=''; for(let p=0;p<data.length;p+=8192) binary+=String.fromCharCode(...data.subarray(p,p+8192));
    images.push({qid:question.id,mime,data:btoa(binary),segmentId:uncertainty.segmentId,order:images.filter(i=>i.qid===question.id).length});
  }
  for(const question of parsed.questions) delete question.segmentIds;
  return {lines:rows.map(r=>r.text),parsed,images,warnings:[...parsed.warnings,...warnings]};
}
