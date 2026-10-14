import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import JSZip from 'jszip';import {beforeAll,expect,it} from 'vitest';
// CI runs tests before build; generate the ignored download bundle using the real packer.
beforeAll(()=>{execFileSync(process.execPath,['scripts/pack-ssm-bridge.mjs'],{stdio:'pipe'});});
it('download bundle matches every runtime source and excludes test files',async()=>{
 const zip=await JSZip.loadAsync(readFileSync('public/downloads/ssm-bridge.zip'));
 for(const name of ['manifest.json','background.js','app-relay.js','ssm-session.js','ssm-autofill.js','README.md']) expect(await zip.file(`ssm-bridge/${name}`)!.async('string')).toBe(readFileSync(`extension/ssm-bridge/${name}`,'utf8'));
 expect(Object.keys(zip.files).filter(name=>!zip.files[name].dir)).toHaveLength(6);
 expect(JSON.parse(await zip.file('ssm-bridge/manifest.json')!.async('string')).version).toBe('0.3.2');
});
