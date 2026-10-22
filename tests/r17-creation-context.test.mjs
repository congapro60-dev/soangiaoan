import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesCreationSettings,parseExamCreation,parseLessonCreation} from '../lib/lesson/creation-context.js';

test('creation query accepts only one complete purpose-specific saved/import choice',()=>{
 const valid=new URLSearchParams('setup=new&purpose=practice&source=import&grade=12&minutes=80');
 assert.deepEqual(parseLessonCreation(valid),{purpose:'practice',source:'import',grade:12,minutes:80,packageId:null});
 assert.equal(parseLessonCreation(new URLSearchParams('setup=new&purpose=formation&source=library&grade=10&minutes=40&package=row-A_1'))?.packageId,'row-A_1');
 assert.deepEqual(parseLessonCreation(new URLSearchParams('setup=new&purpose=review&source=authored&grade=11&minutes=80&package=g11-ch2-review')),{purpose:'review',source:'authored',grade:11,minutes:80,packageId:'g11-ch2-review'});
 assert.deepEqual(parseLessonCreation(new URLSearchParams('setup=new&purpose=review&source=authored&grade=11&minutes=40&package=r26-authored&launch=quick')),{purpose:'review',source:'authored',grade:11,minutes:40,packageId:'r26-authored',launch:'quick'});
 assert.deepEqual(parseLessonCreation(new URLSearchParams('setup=new&purpose=formation&source=custom&subject=Sinh%20h%E1%BB%8Dc&grade=8&minutes=45&launch=quick')),{purpose:'formation',source:'custom',subject:'Sinh học',grade:8,minutes:45,packageId:null,launch:'quick'});
 for(const query of ['setup=new&purpose=exam&source=import&grade=11&minutes=40','setup=new&purpose=practice&source=import&grade=11&minutes=40&session=x','setup=new&purpose=practice&purpose=review&source=import&grade=11&minutes=40','setup=new&purpose=practice&source=import&grade=11&minutes=40&other=x','setup=new&purpose=review&source=library&grade=11&minutes=40&package=bad%2Fid','setup=new&purpose=review&source=authored&grade=11&minutes=80&package=../private','setup=new&purpose=review&source=import&grade=11&minutes=40&launch=quick','setup=new&purpose=review&source=authored&grade=11&minutes=40&package=r26-authored&launch=immediate','setup=new&purpose=formation&source=custom&grade=8&minutes=40','setup=new&purpose=formation&source=custom&subject=%20&grade=8&minutes=40','setup=new&purpose=formation&source=custom&subject=Biology&grade=13&minutes=40','setup=new&purpose=formation&source=custom&subject=Biology&grade=8&minutes=40&package=x'])assert.equal(parseLessonCreation(new URLSearchParams(query)),null);
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
