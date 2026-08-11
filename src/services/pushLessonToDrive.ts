import type { LessonPlan, AppData } from '../types';
import {
  getDriveAccessToken,
  findWeekFolder,
  getOrCreateWeekFolder,
  findChildFile,
  listFolderFiles,
  trashFile,
  uploadBase64File,
  folderUrl,
  fileUrl,
  parseFolderId,
  type DriveFile,
} from '../lib/googleDrive';

export { DriveAuthError } from '../lib/googleDrive';

export class ConflictError extends Error {
  constructor(public filename: string) {
    super(`File "${filename}" đã tồn tại trên Drive`);
  }
}

export interface PushOptions {
  lessonType: 'TDS' | 'MOET';
  grade: number;
  week: number;
  formats: ('docx' | 'pdf')[];
  replaceExisting: boolean;
  /** Link hoặc ID thư mục đích. Bỏ trống thì lấy thư mục đã lưu trong Cài đặt. */
  folderInput?: string;
  /** Tự tạo/dùng thư mục con "Tuần XX" bên trong thư mục đích. */
  useWeekFolder: boolean;
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
  /** ID thư mục đích đã dùng — để lưu lại làm mặc định cho lần sau. */
  folderId: string;
}

export interface CheckResult {
  folderExists: boolean;
  folderUrl: string | null;
  files: { name: string; id: string; url: string }[];
  filenameExists?: boolean | null;
}

type Settings = AppData['settings'];

export type DriveFolderKey = 'tdsG10' | 'tdsG11' | 'tdsG12' | 'moetG10' | 'moetG11' | 'moetG12';

export const driveFolderKey = (lessonType: 'TDS' | 'MOET', grade: number): DriveFolderKey =>
  `${lessonType.toLowerCase()}G${grade}` as DriveFolderKey;

export const savedFolderId = (
  settings: Settings,
  lessonType: 'TDS' | 'MOET',
  grade: number,
): string => settings.driveFolders?.[driveFolderKey(lessonType, grade)]?.trim() ?? '';

/** Ưu tiên link người dùng vừa dán, sau đó mới tới thư mục đã lưu. */
const resolveFolderId = (
  options: Pick<PushOptions, 'lessonType' | 'grade' | 'folderInput'>,
  settings: Settings,
): string => {
  const raw = options.folderInput?.trim() || savedFolderId(settings, options.lessonType, options.grade);
  if (!raw) {
    throw new Error(
      `Chưa có thư mục Drive cho ${options.lessonType} lớp ${options.grade}. ` +
      'Dán link thư mục vào ô "Thư mục đích", hoặc khai báo sẵn ở Cài đặt → Google Drive.',
    );
  }
  return parseFolderId(raw);
};

/** Thư mục sẽ nhận file: thư mục đích, hoặc thư mục con "Tuần XX" bên trong nó. */
const resolveTargetFolder = async (
  rootId: string,
  week: number,
  useWeekFolder: boolean,
  token: string,
): Promise<DriveFile> => {
  if (!useWeekFolder) return { id: rootId, name: `Tuần ${week}` };
  return getOrCreateWeekFolder(rootId, week, token);
};

export async function checkLessonExists(
  options: Pick<PushOptions, 'lessonType' | 'grade' | 'week' | 'folderInput' | 'useWeekFolder'>,
  filename: string | undefined,
  settings: Settings,
): Promise<CheckResult> {
  const rootId = resolveFolderId(options, settings);
  const token = await getDriveAccessToken();

  const folder = options.useWeekFolder
    ? await findWeekFolder(rootId, options.week, token)
    : { id: rootId, name: '' };

  if (!folder) {
    return { folderExists: false, folderUrl: null, files: [], filenameExists: filename ? false : null };
  }

  const raw = await listFolderFiles(folder.id, token);
  const files = raw.map(f => ({ name: f.name, id: f.id, url: fileUrl(f) }));

  return {
    folderExists: true,
    folderUrl: folderUrl(folder),
    files,
    filenameExists: filename ? files.some(f => f.name === filename) : null,
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

export async function pushLessonToDrive(
  plan: Partial<LessonPlan>,
  options: PushOptions,
  settings: Settings,
  onProgress?: (step: string) => void,
): Promise<PushResult> {
  const rootId = resolveFolderId(options, settings);

  onProgress?.('Đang xin quyền truy cập Google Drive...');
  const token = await getDriveAccessToken();

  const targetFolder = await resolveTargetFolder(rootId, options.week, options.useWeekFolder, token);
  const result: PushResult = { folderId: rootId };

  for (const format of options.formats) {
    onProgress?.(`Đang export ${format.toUpperCase()}...`);
    const fileData = await exportLesson(plan, format, options.lessonType);

    const existing = await findChildFile(targetFolder.id, fileData.filename, token);
    if (existing) {
      if (!options.replaceExisting) throw new ConflictError(fileData.filename);
      await trashFile(existing.id, token);
    }

    onProgress?.(`Đang upload ${format.toUpperCase()} lên Drive...`);
    const uploaded = await uploadBase64File(fileData, targetFolder.id, token);

    const fileResult: PushFileResult = {
      driveUrl: fileUrl(uploaded),
      driveFileId: uploaded.id,
      filename: uploaded.name,
      folderUrl: folderUrl(targetFolder),
    };
    if (format === 'docx') result.docx = fileResult;
    else result.pdf = fileResult;
  }

  return result;
}
