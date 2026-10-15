import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesCreationSettings,parseExamCreation,parseLessonCreation} from '../lib/lesson/creation-context.js';

test('creation query accepts only one complete purpose-specific saved/import choice',()=>{
 const valid=new URLSearchParams('setup=new&purpose=practice&source=import&grade=12&minutes=80');
 assert.deepEqual(parseLessonCreation(valid),{purpose:'practice',source:'import',grade:12,minutes:80,packageId:null});
 assert.equal(parseLessonCreation(new URLSearchParams('setup=new&purpose=formation&source=library&grade=10&minutes=40&package=row-A_1'))?.packageId,'row-A_1');
 assert.deepEqual(parseLessonCreation(new URLSearchParams('setup=new&purpose=review&source=authored&grade=11&minutes=80&package=g11-ch2-review')),{purpose:'review',source:'authored',grade:11,minutes:80,packageId:'g11-ch2-review'});
 for(const query of ['setup=new&purpose=exam&source=import&grade=11&minutes=40','setup=new&purpose=practice&source=import&grade=11&minutes=40&session=x','setup=new&purpose=practice&purpose=review&source=import&grade=11&minutes=40','setup=new&purpose=practice&source=import&grade=11&minutes=40&other=x','setup=new&purpose=review&source=library&grade=11&minutes=40&package=bad%2Fid','setup=new&purpose=review&source=authored&grade=11&minutes=80&package=../private'])assert.equal(parseLessonCreation(new URLSearchParams(query)),null);
});

test('saved generation restore matches exact purpose, grade, duration, subject and scope',()=>{
 const selected={grade:12,subject:'math',slotMinutes:80,purpose:'review'};
 assert.equal(matchesCreationSettings({...selected},selected),true);
 for(const key of ['grade','slotMinutes','purpose','subject'])assert.equal(matchesCreationSettings({...selected,[key]:key==='grade'?11:key==='slotMinutes'?40:key==='purpose'?'practice':'literature'},selected),false);
 assert.equal(matchesCreationSettings({...selected,scope:{lessonId:'a',sectionIds:['s']}},{...selected,scope:{lessonId:'b',sectionIds:['s']}}),false);
 assert.equal(matchesCreationSettings(undefined,selected),false);
});
test('exam setup accepts selected duration only and never shadows an existing exam ID',()=>{
 assert.deepEqual(parseExamCreation(new URLSearchParams('setup=new&minutes=80')),{minutes:80});
 for(const query of ['setup=new&minutes=4','setup=new&minutes=241','setup=new&minutes=40&id=old','setup=new&minutes=40&grade=12','setup=new&setup=new&minutes=40'])assert.equal(parseExamCreation(new URLSearchParams(query)),null);
});
