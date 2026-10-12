import {deflateSync,inflateSync} from 'node:zlib';
const keys=['tutors','classEvent','lessonMode'];
const limit=1024*1024;
const invalid=()=>{throw new Error('INVALID_LESSON_STORAGE');};
function validate(extras){
 if(!extras||typeof extras!=='object'||Array.isArray(extras)||Object.keys(extras).some(key=>!keys.includes(key)))invalid();
 for(const value of Object.values(extras))if(value!==null&&(typeof value!=='object'||Array.isArray(value)))invalid();
 const history=extras.tutors?.history;
 if(history!==undefined&&(!Array.isArray(history)||history.length>900||history.some(record=>!record||typeof record!=='object'||Array.isArray(record))))invalid();
}

// ponytail: compress only features absent in the released legacy Worker; keep its core fields readable for rollback.
export function packLessonState(state){
 if(state.lessonExtrasCompressed!==undefined)invalid();
 const extras=Object.fromEntries(keys.filter(key=>Object.hasOwn(state,key)).map(key=>[key,state[key]]));
 if(!Object.keys(extras).length)return state;
 validate(extras);const raw=JSON.stringify(extras);if(Buffer.byteLength(raw)>limit)invalid();
 const copy={...state,lessonExtrasCompressed:{version:1,data:deflateSync(raw).toString('base64')}};
 for(const key of keys)delete copy[key];return copy;
}

export function unpackLessonState(state){
 const packed=state.lessonExtrasCompressed;if(packed===undefined)return state;
 if(!packed||packed.version!==1||typeof packed.data!=='string'||packed.data.length>2*limit||keys.some(key=>Object.hasOwn(state,key)))invalid();
 let extras;
 try{
  const bytes=Buffer.from(packed.data,'base64');if(bytes.toString('base64')!==packed.data)invalid();
  extras=JSON.parse(inflateSync(bytes,{maxOutputLength:limit}).toString('utf8'));
 }catch{invalid();}
 validate(extras);const copy={...state,...extras};delete copy.lessonExtrasCompressed;return copy;
}
