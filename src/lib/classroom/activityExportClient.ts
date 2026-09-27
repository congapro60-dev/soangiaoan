import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';
import type { Exam } from '../../types';
import {
  buildActivityExportPlan,
  buildExamExportMarkdown,
  finalizeActivityExportBundle,
  type ActivityExportAudience,
  type ActivityExportFormat,
  type ActivityExportOutputs,
} from './activityExport';

interface ExportResponseFile {
  filename?: unknown;
  mimeType?: unknown;
  base64?: unknown;
}

const safeText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
};

const requestExport = async (
  exam: Exam,
  audience: ActivityExportAudience,
  format: ActivityExportFormat,
): Promise<{ audience: ActivityExportAudience; format: ActivityExportFormat; blob: Blob }> => {
  const plan = buildActivityExportPlan(exam, 'both');
  const content = buildExamExportMarkdown(plan, audience);
  const response = await fetch('/api/export-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: exam.title, content, type: 'MOET', format }),
  });
  const data = await response.json().catch(() => null) as { error?: unknown; pdf?: ExportResponseFile; word?: ExportResponseFile } | null;
  if (!response.ok) throw new Error(safeText(data?.error) || `Máy chủ xuất ${format.toUpperCase()} trả lỗi ${response.status}.`);
  const file = format === 'pdf' ? data?.pdf : data?.word;
  const base64 = safeText(file?.base64);
  if (!base64) throw new Error(`Máy chủ không trả file ${format.toUpperCase()} cho bản ${audience === 'student' ? 'học sinh' : 'giáo viên'}.`);
  return {
    audience,
    format,
    blob: base64ToBlob(base64, safeText(file?.mimeType) || (format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  };
};

const uploadExport = async (
  exam: Exam,
  teacherUid: string,
  file: { audience: ActivityExportAudience; format: ActivityExportFormat; blob: Blob },
): Promise<string> => {
  const suffix = file.format === 'pdf' ? 'pdf' : 'docx';
  const audience = file.audience === 'student' ? 'student' : 'teacher-key';
  const safeExamId = exam.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeVersion = (exam.contentVersion || 'v1').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileRef = ref(storage, `assignments/${teacherUid}/activity-${safeExamId}-${safeVersion}-${audience}.${suffix}`);
  await uploadBytes(fileRef, file.blob, { contentType: file.blob.type });
  return getDownloadURL(fileRef);
};

/** Xuất 4 file từ cùng snapshot rồi tải lên Storage để cả GV/HS dùng lại được. */
export const generateAndUploadActivityExportBundle = async (
  exam: Exam,
  teacherUid: string,
): Promise<{ plan: ReturnType<typeof buildActivityExportPlan>; bundle: ReturnType<typeof finalizeActivityExportBundle> }> => {
  const plan = buildActivityExportPlan(exam, 'both');
  const files = await Promise.all([
    requestExport(exam, 'student', 'pdf'),
    requestExport(exam, 'student', 'docx'),
    requestExport(exam, 'teacher', 'pdf'),
    requestExport(exam, 'teacher', 'docx'),
  ]);
  const urls = await Promise.all(files.map(file => uploadExport(exam, teacherUid, file)));
  const outputs: ActivityExportOutputs = {};
  files.forEach((file, index) => {
    const url = urls[index];
    if (file.audience === 'student' && file.format === 'pdf') outputs.studentPdfUrl = url;
    if (file.audience === 'student' && file.format === 'docx') outputs.studentDocxUrl = url;
    if (file.audience === 'teacher' && file.format === 'pdf') outputs.teacherKeyPdfUrl = url;
    if (file.audience === 'teacher' && file.format === 'docx') outputs.teacherKeyDocxUrl = url;
  });
  const bundle = finalizeActivityExportBundle(plan, { ...outputs, generatedAt: new Date().toISOString() });
  if (bundle.status !== 'ready') throw new Error(bundle.errorMessage || 'Chưa tạo đủ file backup.');
  return { plan, bundle };
};
