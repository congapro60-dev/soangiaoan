// Thêm auto signInAnonymously cho 2 hàm library (tránh đụng chuỗi dài qua shell)
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/services/studentPortalApi.ts';
let t = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const oldOpen = `export const openStudentAdaptiveLibraryLesson = async (lessonId: string): Promise<{ lesson: AdaptiveLesson }> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();`;
const newOpen = `export const openStudentAdaptiveLibraryLesson = async (lessonId: string): Promise<{ lesson: AdaptiveLesson }> => {
  // Thư viện công khai: HS chưa có phiên thì tự đăng nhập ẩn danh (chỉ đọc bài đã xuất bản).
  if (!auth.currentUser || !auth.currentUser.isAnonymous) await signInAnonymously(auth);
  const current = auth.currentUser!;
  const idToken = await current.getIdToken();`;

const oldSubmit = `export const submitStudentAdaptiveLibraryAssessment = async (lessonId: string, payload: { kind: string; answers: Record<string, string>; unitId?: string; durationSeconds: number }): Promise<{ kind: string; unitId?: string; scored: boolean; attempt: AssessmentAttempt; nextRoute?: string }> => {
  const current = auth.currentUser;
  if (!current || !current.isAnonymous) throw new Error('Cần phiên đăng nhập học sinh.');
  const idToken = await current.getIdToken();`;
const newSubmit = `export const submitStudentAdaptiveLibraryAssessment = async (lessonId: string, payload: { kind: string; answers: Record<string, string>; unitId?: string; durationSeconds: number }): Promise<{ kind: string; unitId?: string; scored: boolean; attempt: AssessmentAttempt; nextRoute?: string }> => {
  if (!auth.currentUser || !auth.currentUser.isAnonymous) await signInAnonymously(auth);
  const current = auth.currentUser!;
  const idToken = await current.getIdToken();`;

for (const [a, b, name] of [[oldOpen, newOpen, 'open'], [oldSubmit, newSubmit, 'submit']]) {
  if (!t.includes(a)) throw new Error(name + ' block not found');
  t = t.split(a).join(b);
}
writeFileSync(p, t, 'utf8');
console.log('patched:', t.includes('Thư viện công khai: HS chưa có phiên'));
