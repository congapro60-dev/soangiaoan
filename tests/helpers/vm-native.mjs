import * as crypto from 'node:crypto';
import {SyntheticModule} from 'node:vm';
const cache=new WeakMap();
export function nativeVmModule(specifier,context){
 if(specifier!=='node:crypto')throw Error('UNSUPPORTED_NATIVE_MODULE '+specifier);
 if(!cache.has(context)){const keys=Object.keys(crypto);cache.set(context,new SyntheticModule(keys,function(){for(const key of keys)this.setExport(key,crypto[key]);},{context,identifier:specifier}));}
 return cache.get(context);
}
