import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
const setup = (inputs: (FakeInput | FakeEditor)[]) => {
 let listener: (message:any,sender:any,respond:(r:any)=>void)=>void;
 class FakeDataTransfer { files:any[]=[];data:any={};items={add:(file:any)=>this.files.push(file)};setData=(key:string,value:string)=>{this.data[key]=value}; }
 const context = { document: {querySelectorAll:()=>inputs,activeElement:inputs[0],getSelection:()=>({anchorNode:inputs[0],focusNode:inputs[0]})}, setTimeout, chrome:{runtime:{id:'ext',onMessage:{addListener(fn:any){listener=fn}}}}, HTMLInputElement:FakeInput,HTMLTextAreaElement:FakeTextarea, ClipboardEvent:class{constructor(readonly type:string,readonly init:any){}}, Event:class{constructor(readonly type:string){}}, DataTransfer:FakeDataTransfer,File:class{constructor(readonly bytes:any,readonly name:string){}},Uint8Array,atob:(x:string)=>Buffer.from(x,'base64').toString('binary'),localStorage:{getItem:(key:string)=>key==='access_token'?'current-token':'tenant'},location:{href:'https://ssm.edufit.vn/grades'} };
 vm.runInNewContext(readFileSync('extension/ssm-bridge/ssm-autofill.js','utf8'),context);
 return {context,ask:(message:any)=>new Promise<any>(resolve=>listener({...message,sessionToken:'current-token',workspace:'tenant'},{id:'ext'},resolve))};
};
class FakeInput {accept='';type='text';disabled=false;readOnly=false;name='';id='';placeholder='';style:any={};files:any;events:string[]=[];assigned='';constructor(readonly code=''){} getAttribute(k:string){return k==='data-code'?this.code:null}closest(){return {textContent:this.code}} getClientRects(){return [1]}dispatchEvent(e:any){this.events.push(e.type)}scrollIntoView(){} }
Object.defineProperty(FakeInput.prototype,'value',{get(){return this.assigned},set(value){this.assigned=value}});
class FakeTextarea extends FakeInput {}
Object.defineProperty(FakeTextarea.prototype,'value',{get(){return this.assigned},set(value){this.assigned=value}});
class FakeEditor { textContent='';disabled=false;readOnly=false;style:any={};events:string[]=[];embedded=false;revertPaste=false;getAttribute(){return null} getClientRects(){return [1]}scrollIntoView(){}matches(selector:string){return selector.includes('.ck-editor__editable')}querySelector(){return this.embedded?{}:null}contains(node:any){return node===this}dispatchEvent(event:any){if(event.type==='paste'){if(this.revertPaste)return true;this.textContent=event.init.clipboardData.data['text/plain'];this.events.push('native-input');return false}return true} }
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
 it('focused CKEditor uses native text input and preserves existing teacher content',async()=>{
  const editor=new FakeEditor(); const state=setup([editor]);
  const ask=()=>state.ask({kind:'ssm-autofill',params:{target:'focused',fields:[{key:'schedule',value:'Nội dung đã soát\nTiết 1'}]}});
  expect((await ask()).ok).toBe(true);expect(editor.textContent).toBe('Nội dung đã soát\nTiết 1');expect(editor.events).toEqual(['native-input']);
  expect((await ask()).ok).toBe(true);expect(editor.events).toEqual(['native-input']);
  editor.textContent='Báo giảng của GV';expect((await ask()).ok).toBe(false);expect(editor.textContent).toBe('Báo giảng của GV');
  editor.textContent='';editor.readOnly=true;expect((await ask()).ok).toBe(false);
 });
 it('never writes an unfocused editor, embedded content or a reverted native insertion',async()=>{
  const editor=new FakeEditor();const state=setup([editor]);
  const ask=(target='focused')=>state.ask({kind:'ssm-autofill',params:{target,fields:[{key:'schedule',value:'QA'}]}});
  expect((await ask('exact')).ok).toBe(false);expect(editor.events).toEqual([]);
  editor.embedded=true;expect((await ask()).ok).toBe(false);editor.embedded=false;
  state.context.document.getSelection=()=>({anchorNode:{} as FakeEditor,focusNode:editor});expect((await ask()).ok).toBe(false);
  state.context.document.getSelection=()=>({anchorNode:editor,focusNode:editor});
  editor.revertPaste=true;expect((await ask()).ok).toBe(false);expect(editor.textContent).toBe('');
 });
});
