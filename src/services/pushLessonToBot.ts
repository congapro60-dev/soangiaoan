import type { LessonPlan, AppData } from '../types';

export interface PushOptions {
  lessonType: 'TDS' | 'MOET';
  grade: number;
  week: number;
  formats: ('docx' | 'pdf')[];
  replaceExisting: boolean;
}

export interface PushFileResult {
  driveUrl: string;
  driveFileId: string;
  filename: string;
  folderUrl: string;
}

export interface PushResult {
  docx?: PushFileResult;
  pdf?: PushFileResult;
}

export interface CheckResult {
  folderExists: boolean;
  folderUrl: string | null;
  files: { name: string; id: string; url: string }[];
  filenameExists?: boolean | null;
}

type Settings = AppData['settings'];

function getBotConfig(settings: Settings): { url: string; token: string } {
  const url = settings.botApiUrl?.trim() ?? '';
  const token = settings.botApiToken?.trim() ?? '';
  if (!url) throw new Error('Chưa cấu hình Bot API URL. Vào Cài đặt → Bot API để nhập URL Railway.');
  if (!token) throw new Error('Chưa cấu hình Bot API Token. Vào Cài đặt → Bot API để nhập WEB_API_TOKEN.');
  return { url, token };
}

export async function checkLessonExists(
  options: Pick<PushOptions, 'lessonType' | 'grade' | 'week'>,
  filename: string | undefined,
  settings: Settings,
): Promise<CheckResult> {
  const { url, token } = getBotConfig(settings);
  const res = await fetch(`${url}/api/lessons/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Token': token },
    body: JSON.stringify({ lesson_type: options.lessonType, grade: options.grade, week: options.week, filename }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(String(err['detail'] ?? `Lỗi kiểm tra Drive: ${res.status}`));
  }
  const data = await res.json() as Record<string, unknown>;
  return {
    folderExists: Boolean(data['folder_exists']),
    folderUrl: (data['folder_url'] as string | null) ?? null,
    files: (data['files'] as { name: string; id: string; url: string }[]) ?? [],
    filenameExists: data['filename_exists'] as boolean | null | undefined,
  };
}

async function exportLesson(
  plan: Partial<LessonPlan>,
  format: 'docx' | 'pdf',
  lessonType: 'TDS' | 'MOET',
): Promise<{ base64: string; filename: string; mimeType: string }> {
  const res = await fetch('/api/export-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: plan.title,
      content: plan.content,
      grade: plan.grade ? Number(plan.grade) : undefined,
      week: plan.week ? Number(plan.week) : undefined,
      type: lessonType,
      format,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(String(err['error'] ?? `Export thất bại: ${res.status}`));
  }
  const data = await res.json() as Record<string, unknown>;
  const fileData = format === 'docx' ? data['word'] : data['pdf'];
  if (!fileData) throw new Error(`Không nhận được dữ liệu ${format.toUpperCase()} từ server`);
  return fileData as { base64: string; filename: string; mimeType: string };
}

async function uploadToBot(
  fileData: { base64: string; filename: string; mimeType: string },
  options: PushOptions,
  botUrl: string,
  botToken: string,
): Promise<{ drive_url: string; drive_file_id: string; filename: string; folder_url: string }> {
  const binaryStr = atob(fileData.base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const blob = new Blob([bytes], { type: fileData.mimeType });

  const form = new FormData();
  form.append('file', blob, fileData.filename);
  form.append('lesson_type', options.lessonType);
  form.append('grade', String(options.grade));
  form.append('week', String(options.week));
  form.append('replace_existing', String(options.replaceExisting));

  const res = await fetch(`${botUrl}/api/drive/upload`, {
    method: 'POST',
    headers: { 'X-API-Token': botToken },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(String(err['detail'] ?? `Upload Drive thất bại: ${res.status}`));
  }
  return res.json() as Promise<{ drive_url: string; drive_file_id: string; filename: string; folder_url: string }>;
}

export async function pushLessonToBot(
  plan: Partial<LessonPlan>,
  options: PushOptions,
  settings: Settings,
  onProgress?: (step: string) => void,
): Promise<PushResult> {
  const { url, token } = getBotConfig(settings);
  const result: PushResult = {};

  for (const format of options.formats) {
    onProgress?.(`Đang export ${format.toUpperCase()}...`);
    const fileData = await exportLesson(plan, format, options.lessonType);

    onProgress?.(`Đang upload ${format.toUpperCase()} lên Drive...`);
    const uploaded = await uploadToBot(fileData, options, url, token);

    const fileResult: PushFileResult = {
      driveUrl: uploaded.drive_url,
      driveFileId: uploaded.drive_file_id,
      filename: uploaded.filename,
      folderUrl: uploaded.folder_url,
    };
    if (format === 'docx') result.docx = fileResult;
    else result.pdf = fileResult;
  }

  return result;
}
