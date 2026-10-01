import {mkdir,copyFile,cp,writeFile} from 'node:fs/promises';
import {CATEGORIES,FORMATS} from '../lib/context-questions.js';
import {THEMES,TOPICS,MATH_POINTS} from '../lib/campaign.js';
await writeFile('public/campaign-data.js','window.SignalCampaign='+JSON.stringify({themes:THEMES,topics:TOPICS,points:MATH_POINTS,categories:CATEGORIES,formats:FORMATS})+';\n');
await mkdir('public/katex',{recursive:true});
for(const name of ['katex.min.js','katex.min.css'])await copyFile('node_modules/katex/dist/'+name,'public/katex/'+name);
await cp('node_modules/katex/dist/fonts','public/katex/fonts',{recursive:true});
