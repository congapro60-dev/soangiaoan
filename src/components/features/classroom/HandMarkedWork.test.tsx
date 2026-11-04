import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import type {SubmissionDoc} from '../../../lib/classroom/types';
import {readHandMarkedFile} from '../../../services/submissionActorsApi';
vi.mock('../../../services/submissionActorsApi',()=>({readHandMarkedFile:vi.fn(),saveHandMarkedWork:vi.fn(),setHandMarkedVisibility:vi.fn(),uploadActorEvidence:vi.fn()}));
import {HandMarkedWork, openHandMarkedWithGesture} from './HandMarkedWork';
const base:SubmissionDoc={id:'s',studentId:'kid',classId:'c',teacherId:'t',assignmentId:'a',fileUrls:[],note:'',status:'graded',createdAt:'',updatedAt:'',grade:{score:9,maxScore:10,teacherApproved:true,feedback:'',strengths:[],weaknesses:[],gradedAt:''}};
const evidence={id:'review-1',files:[{id:'f1',name:'ban-cham.pdf',mimeType:'application/pdf',size:40,kind:'pdf' as const}],note:'Cô đã chấm',submittedBy:{role:'teacher' as const,studentId:'kid',at:'now'},createdAt:'now'};
describe('bản chấm tay độc lập công bố điểm',()=>{
 it('opens from the click gesture, validates signed host and closes on failure',async()=>{
  let url='',closed=0;const tab={opener:{} as unknown,location:{set href(value:string){url=value}},close(){closed++}};
  await openHandMarkedWithGesture(tab,async()=>{expect(tab.opener).toBeNull();return{url:'https://storage.googleapis.com/bucket/file?signature=secret',expiresAt:Date.now()+60000};});expect(url).toContain('signature=secret');
  await expect(openHandMarkedWithGesture(tab,async()=>({url:'https://evil.test/x',expiresAt:Date.now()+60000}))).rejects.toThrow('không hợp lệ');expect(closed).toBe(1);
  await expect(openHandMarkedWithGesture(null,async()=>({url:'https://storage.googleapis.com/file',expiresAt:Date.now()+60000}))).rejects.toThrow('chặn cửa sổ');
 });
 it('HS/PH projection không vẽ URL hoặc nút xem khi chưa công bố',()=>{for(const role of ['student','parent'] as const){expect(renderToStaticMarkup(<HandMarkedWork submission={{...base,handMarkedEvidence:evidence}} credentials={role==='student'?{role}:{role,studentId:'kid',joinCode:'code',pin:'never-render'}}/>)).toBe('');}});
 it('GV tải bản mới và công bố bằng revision ID, không lệ thuộc grade AI',()=>{const html=renderToStaticMarkup(<HandMarkedWork submission={{...base,grade:undefined,handMarkedEvidence:evidence}} credentials={{role:'teacher',classId:'c',studentId:'kid'}}/>);expect(html).toContain('Tải bản chấm tay');expect(html).toContain('Cho HS/PH xem bản chấm tay');expect(html).not.toContain('private/path');});
 it('hard lock disables file evidence while keeping publication control available',()=>{const html=renderToStaticMarkup(<HandMarkedWork locked submission={{...base,handMarkedEvidence:evidence}} credentials={{role:'teacher',classId:'c',studentId:'kid'}}/>);expect(html).toContain('Đang ẩn với HS/PH');expect(html).toContain('Chọn ảnh hoặc PDF bản chấm tay');expect(html).toMatch(/<input[^>]*disabled=""[^>]*type="file"/);expect(html).toMatch(/<button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-bold"/);});
 it('student/parent chỉ thấy nút xem của bản công bố, không có upload',()=>{const published={...base,handMarkedEvidence:evidence,handMarkedPublished:true};for(const credentials of [{role:'student'} as const,{role:'parent',studentId:'kid',joinCode:'code',pin:'secret'} as const]){const html=renderToStaticMarkup(<HandMarkedWork submission={published} credentials={credentials}/>);expect(html).toContain('Bản chấm tay của giáo viên');expect(html).toContain('ban-cham.pdf');expect(html).not.toContain('Tải bản chấm tay');expect(html).not.toContain('secret');}});
 it('ảnh có nút xem tại card, PDF mở riêng, không tải URL hoặc ảnh trước thao tác',()=>{
  vi.mocked(readHandMarkedFile).mockClear();
  const withImage={...evidence,files:[{id:'img',name:'ten-anh-rat-dai-khong-co-dau-cach.jpg',mimeType:'image/jpeg',size:40,kind:'image' as const},...evidence.files]};
  const html=renderToStaticMarkup(<HandMarkedWork submission={{...base,handMarkedEvidence:withImage,handMarkedPublished:true}} credentials={{role:'student'}}/>);
  expect(html).toContain('Xem ảnh · ten-anh-rat-dai-khong-co-dau-cach.jpg');expect(html).toContain('Mở PDF · ban-cham.pdf');
  expect(html).toContain('min-w-0 max-w-full break-words');expect(html).not.toContain('<img');expect(readHandMarkedFile).not.toHaveBeenCalled();
 });
});
