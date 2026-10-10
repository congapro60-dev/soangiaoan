import test from 'node:test';
import assert from 'node:assert/strict';

test('OCR coordinates scale to PDF points and normalize only structural anchors',async()=>{
  const { ocrLines }=await import('../lib/exam/ocr-lines.js');
  const lines=ocrLines({blocks:[{paragraphs:[{lines:[{text:'Cau 12: x² = 9',bbox:{x0:20,y0:100,x1:300,y1:120}},{text:'PHAN II. Đúng - Sai',bbox:{x0:20,y0:150,x1:300,y1:180}}]}]}]},2,2);
  assert.equal(lines[0].text,'Câu 12: x² = 9');assert.equal(lines[0].x,10);assert.equal(lines[0].top,50);assert.equal(lines[0].bottom,60);assert.equal(lines[0].page,2);
  assert.equal(lines[1].text,'PHẦN II. Đúng - Sai');
});

test('ambiguous I-only section numerals use verified vertical ink, never renumber other headings',async()=>{
  const { romanStrokes }=await import('../lib/exam/ocr-lines.js');
  const image={width:24,height:20,data:new Uint8ClampedArray(24*20*4).fill(255)};
  for(const x of [3,10,17])for(let y=1;y<19;y++)for(let dx=0;dx<2;dx++){const at=(y*24+x+dx)*4;image.data[at]=image.data[at+1]=image.data[at+2]=0;}
  assert.equal(romanStrokes(image),'III');
  for(let y=5;y<15;y++){const at=(y*24+(y+3))*4;image.data[at]=image.data[at+1]=image.data[at+2]=0;}
  assert.equal(romanStrokes(image),null);
});

class FakeWorker {
  static instances=[];
  constructor(url){this.url=url;this.jobs=[];this.dead=false;FakeWorker.instances.push(this);}
  postMessage(packet){this.jobs.push(packet);if(packet.action!=='recognize')queueMicrotask(()=>this.onmessage?.({data:{...packet,status:'resolve',data:{}}}));}
  terminate(){this.dead=true;}
}
test('pinned local OCR worker aborts initialization/recognition promptly and never calls progress later',async()=>{
  const { createOcr }=await import('../lib/exam/ocr-worker.js');let progress=0;const signal=new AbortController();
  const ocr=createOcr({WorkerCtor:FakeWorker,origin:'https://game.test',signal:signal.signal,onProgress:()=>progress++});
  const work=ocr.recognize(new Uint8Array([1,2,3]));await new Promise(setImmediate);
  const worker=FakeWorker.instances.at(-1);assert.match(worker.url,/^https:\/\/game.test\/vendor\/tesseract\/worker.min.js$/);
  assert.equal(worker.jobs[0].payload.options.corePath,'https://game.test/vendor/tesseract/tesseract-core-lstm.wasm.js');
  signal.abort();await assert.rejects(work,{name:'AbortError'});assert.equal(worker.dead,true);
  worker.onmessage?.({data:{status:'progress',data:{progress:1}}});assert.equal(progress,0);ocr.destroy();
});
