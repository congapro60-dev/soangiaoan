import catalogue from '../../content/hki-2026-catalogue.json' with {type:'json'};
import hkiiCatalogue from '../../content/hkii-2026-catalogue.json' with {type:'json'};
const metadata=({data,...item})=>item;
export const listSemesterLessons=()=>[...catalogue.lessons,...hkiiCatalogue.lessons].map(metadata);
export const listSemesterExams=()=>[...catalogue.exams,...hkiiCatalogue.exams].map(metadata);
// ponytail: bundled HKI gzip avoids parsing 403 packages at startup; use private storage if more terms exceed Worker limits.
async function unpack(item){
  if(!item)return null;
  const bytes=Uint8Array.from(atob(item.data),character=>character.charCodeAt(0));
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
}
export const getSemesterLesson=id=>unpack([...catalogue.lessons,...hkiiCatalogue.lessons].find(item=>item.id===id));
export const getSemesterExam=id=>unpack([...catalogue.exams,...hkiiCatalogue.exams].find(item=>item.id===id));
