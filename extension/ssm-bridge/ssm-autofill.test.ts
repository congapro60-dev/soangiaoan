import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
const setup = (inputs: FakeInput[]) => {
 let listener: (message:any,sender:any,respond:(r:any)=>void)=>void;
 class FakeDataTransfer { files:any[]=[];items={add:(file:any)=>this.files.push(file)}; }
 const context = { document: {querySelectorAll:()=>inputs,activeElement:inputs[0]}, chrome:{runtime:{id:'ext',onMessage:{addListener(fn:any){listener=fn}}}}, HTMLInputElement:FakeInput,HTMLTextAreaElement:FakeTextarea, Event:class{constructor(readonly type:string){}}, DataTransfer:FakeDataTransfer,File:class{constructor(readonly bytes:any,readonly name:string){}},Uint8Array,atob:(x:string)=>Buffer.from(x,'base64').toString('binary'),localStorage:{getItem:(key:string)=>key==='access_token'?'current-token':'tenant'},location:{href:'https://ssm.edufit.vn/grades'} };
 vm.runInNewContext(readFileSync('extension/ssm-bridge/ssm-autofill.js','utf8'),context);
 return {context,ask:(message:any)=>new Promise<any>(resolve=>listener({...message,sessionToken:'current-token',workspace:'tenant'},{id:'ext'},resolve))};
};
class FakeInput {accept='';type='text';disabled=false;readOnly=false;name='';id='';placeholder='';style:any={};files:any;events:string[]=[];assigned='';constructor(readonly code=''){} getAttribute(k:string){return k==='data-code'?this.code:null}closest(){return {textContent:this.code}} getClientRects(){return [1]}dispatchEvent(e:any){this.events.push(e.type)}scrollIntoView(){} }
Object.defineProperty(FakeInput.prototype,'value',{get(){return this.assigned},set(value){this.assigned=value}});
class FakeTextarea extends FakeInput {}
Object.defineProperty(FakeTextarea.prototype,'value',{get(){return this.assigned},set(value){this.assigned=value}});
describe('SSM fill-only exact targeting',()=>{
 it('refuses arbitrary file input and ambiguous xlsx controls',async()=>{
  const picture=new FakeInput();picture.type='file';picture.accept='.png';let state=setup([picture]);expect((await state.ask({kind:'ssm-attach-file',fileData:'AA==',fileName:'scores.xlsx'})).ok).toBe(false);expect(picture.events).toEqual([]);
  const a=new FakeInput(),b=new FakeInput();for(const field of[a,b]){field.type='file';field.accept='.xlsx'}state=setup([a,b]);expect((await state.ask({kind:'ssm-attach-file',fileData:'AA==',fileName:'scores.xlsx'})).ok).toBe(false);
 });
 it('attaches to one explicit xlsx control, never clicks or submits',async()=>{
  const input=new FakeInput();input.type='file';input.accept='.xlsx';const state=setup([input]);expect((await state.ask({kind:'ssm-attach-file',fileData:'AA==',fileName:'scores.xlsx'})).ok).toBe(true);expect(input.files[0].name).toBe('scores.xlsx');expect(input.events).toEqual(['change','input']);
 });
 it('matches exact student code, refuses ambiguous/nonempty/duplicate targets',async()=>{
  const input=new FakeInput('123');const state=setup([input]);expect((await state.ask({kind:'ssm-autofill',params:{fields:[{key:'12',value:'wrong'}]}})).ok).toBe(false);expect(input.assigned).toBe('');
  expect((await state.ask({kind:'ssm-autofill',params:{fields:[{key:'123',value:'one'},{key:'123',value:'two'}]}})).ok).toBe(false);expect(input.assigned).toBe('');
  input.assigned='GV already wrote';expect((await state.ask({kind:'ssm-autofill',params:{fields:[{key:'123',value:'new'}]}})).ok).toBe(false);expect(input.assigned).toBe('GV already wrote');
 });
 it('focused mode accepts one visible text field but rejects password, readonly or stale account',async()=>{
  const input=new FakeTextarea();let state=setup([input]);expect((await state.ask({kind:'ssm-autofill',params:{target:'focused',fields:[{key:'schedule',value:'Nội dung tuần đã soát'}]}})).ok).toBe(true);expect(input.assigned).toBe('Nội dung tuần đã soát');
  const secret=new FakeInput('123');secret.type='password';state=setup([secret]);expect((await state.ask({kind:'ssm-autofill',params:{fieldSelector:'input[type=password]',fields:[{key:'123',value:'changed'}]}})).ok).toBe(false);expect(secret.assigned).toBe('');
  state.context.localStorage.getItem=()=> 'changed-account';expect((await state.ask({kind:'ssm-attach-file',fileData:'AA==',fileName:'scores.xlsx'})).ok).toBe(false);
 });
});
