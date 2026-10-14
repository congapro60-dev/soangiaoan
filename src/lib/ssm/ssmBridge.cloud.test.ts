import {beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({user:{uid:'A',email:'teacher@test.dev',isAnonymous:false,getIdToken:async()=> 'token'} as any,save:vi.fn(),read:vi.fn(),remove:vi.fn()}));
vi.mock('../firebase',()=>({auth:{get currentUser(){return mock.user}},db:{}}));
vi.mock('firebase/firestore',()=>({doc:(_db:any,_col:string,id:string)=>({id}),getDoc:mock.read,setDoc:mock.save,deleteDoc:mock.remove}));
vi.mock('../adminLink',()=>({getLinkedGoogleEmail:()=>null}));
import {readSsmLink,saveSsmLink,saveSsmLinkCloud,readSsmLinkCloud} from './ssmBridge';
let cache:Map<string,string>;
beforeEach(()=>{mock.user={uid:'A',email:'teacher@test.dev',isAnonymous:false,getIdToken:async()=> 'token'};mock.save.mockReset().mockResolvedValue(undefined);mock.read.mockReset().mockResolvedValue({exists:()=>false});mock.remove.mockReset().mockResolvedValue(undefined);cache=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>cache.get(k)||null,setItem:(k:string,v:string)=>cache.set(k,v),removeItem:(k:string)=>cache.delete(k)});});
it('local class mapping is isolated by UID, cloud save failure does not claim persistence',async()=>{
 saveSsmLink('class',{id:1,name:'A',workspace:'branch'});mock.user.uid='B';expect(readSsmLink('class')).toBeNull();mock.user.uid='A';
 mock.save.mockRejectedValue(new Error('denied'));await expect(saveSsmLinkCloud('A','class',{id:2,name:'changed'})).rejects.toThrow('denied');expect(readSsmLink('class')?.id).toBe(1);
});
it('account change during cloud request never stores account A mapping under B',async()=>{
 let release:()=>void=()=>{};mock.save.mockImplementation(()=>new Promise<void>(resolve=>{release=resolve}));
 const pending=saveSsmLinkCloud('A','class',{id:1,name:'privateA'});mock.user.uid='B';release();await expect(pending).rejects.toThrow('thay đổi');expect(readSsmLink('class')).toBeNull();
});
it('cloud read rejects caller-selected UID and keeps workspace binding',async()=>{
 await expect(readSsmLinkCloud('B','class')).rejects.toThrow('thay đổi');expect(mock.read).not.toHaveBeenCalled();
 mock.read.mockResolvedValue({exists:()=>true,data:()=>({ssmClassId:1,ssmClassName:'SSM',workspace:'branch23'})});expect(await readSsmLinkCloud('A','class')).toMatchObject({id:1,workspace:'branch23'});
});
