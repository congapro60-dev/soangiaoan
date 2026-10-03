import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {posix,win32} from 'node:path';
import {test} from 'node:test';
import {runInNewContext,SourceTextModule,SyntheticModule,createContext} from 'node:vm';

for(const file of ['race','community','room-management']){
  const source=await readFile(new URL(`./${file}.test.mjs`,import.meta.url),'utf8');
  const loader=source.match(/^async function moduleAt\(path\).*$/m)?.[0];
  for(const [platform,paths,root] of [['POSIX',posix,'/repo'],['Windows',win32,'C:\\repo']]){
    test(`${file} loader selects only canonical storage on ${platform}`,async()=>{
      assert.ok(loader,'Exercise the integration loader itself');
      const reads=[];
      const storage={stmt(){},db(){}};
      const resolve=(...parts)=>paths.resolve(root,...parts);
      const moduleAt=runInNewContext(`${loader}; moduleAt`,{
        cache:new Map(),resolve,storage,context:createContext({}),SourceTextModule,SyntheticModule,
        readFile:async(path)=>{reads.push(path);return 'export const value=1;';},
      });
      for(const path of [resolve('lib/storage.js'),resolve('lib')+'/../lib/storage.js']){
        const loaded=await moduleAt(path);
        assert.ok(loaded instanceof SyntheticModule);
        await loaded.link(()=>{});
        await loaded.evaluate();
        assert.equal(loaded.namespace.stmt,storage.stmt);
        assert.equal(loaded.namespace.db,storage.db);
        assert.equal(await moduleAt(path),loaded);
      }
      assert.deepEqual(reads,[]);
      for(const path of [resolve('lib/race.js'),resolve('other/lib/storage.js')]){
        assert.ok(await moduleAt(path) instanceof SourceTextModule);
      }
      assert.deepEqual(reads,[resolve('lib/race.js'),resolve('other/lib/storage.js')]);
    });
  }
}
