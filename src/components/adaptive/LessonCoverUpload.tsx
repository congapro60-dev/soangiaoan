import { useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { ImagePlus, Loader2, UploadCloud } from 'lucide-react';
import { storage } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface LessonCoverUploadProps {
  lessonId: string;
  currentRealistic?: string;
  currentTextbook?: string;
  onSaved: (urls: { realistic?: string; textbook?: string }) => void;
}

type CoverKind = 'realistic' | 'textbook';

type UploadProgress = Record<CoverKind, number>;

type UploadingState = Record<CoverKind, boolean>;

const coverConfig: Record<CoverKind, { title: string; description: string; fileName: string; tone: string }> = {
  realistic: {
    title: 'Ảnh REALISTIC/Cinematic',
    description: 'Dùng cho minh hoạ cảm xúc, bối cảnh thật hoặc ảnh mở bài giàu hình ảnh.',
    fileName: 'cover-realistic.png',
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  textbook: {
    title: 'Ảnh TEXTBOOK Style',
    description: 'Dùng cho minh hoạ kiểu sách giáo khoa, sơ đồ hoặc hình học tập rõ ràng.',
    fileName: 'cover-textbook.png',
    tone: 'border-blue-200 bg-blue-50 text-blue-700',
  },
};

const normalizeFileName = (kind: CoverKind) => coverConfig[kind].fileName;

export const LessonCoverUpload = ({
  lessonId,
  currentRealistic,
  currentTextbook,
  onSaved,
}: LessonCoverUploadProps) => {
  const [realisticUrl, setRealisticUrl] = useState(currentRealistic || '');
  const [textbookUrl, setTextbookUrl] = useState(currentTextbook || '');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ realistic: 0, textbook: 0 });
  const [uploading, setUploading] = useState<UploadingState>({ realistic: false, textbook: false });
  const [error, setError] = useState<string | null>(null);
  const realisticInputRef = useRef<HTMLInputElement | null>(null);
  const textbookInputRef = useRef<HTMLInputElement | null>(null);

  const hasChanged = useMemo(
    () => realisticUrl !== (currentRealistic || '') || textbookUrl !== (currentTextbook || ''),
    [currentRealistic, currentTextbook, realisticUrl, textbookUrl],
  );

  const uploadCover = async (kind: CoverKind, file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Tệp được chọn không phải ảnh. Vui lòng chọn file hình ảnh.');
      return;
    }

    setError(null);
    setUploading(prev => ({ ...prev, [kind]: true }));
    setUploadProgress(prev => ({ ...prev, [kind]: 0 }));

    try {
      const storageRef = ref(storage, `lesson-illustrations/${lessonId}/${normalizeFileName(kind)}`);
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
        task.on(
          'state_changed',
          snapshot => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(prev => ({ ...prev, [kind]: pct }));
          },
          reject,
          resolve,
        );
      });
      const downloadUrl = await getDownloadURL(storageRef);

      if (kind === 'realistic') setRealisticUrl(downloadUrl);
      else setTextbookUrl(downloadUrl);

      setUploadProgress(prev => ({ ...prev, [kind]: 100 }));
    } catch (uploadError) {
      console.error('Không upload được ảnh đầu bài', uploadError);
      setError('Không upload được ảnh đầu bài. Vui lòng kiểm tra kết nối hoặc quyền Firebase Storage.');
      setUploadProgress(prev => ({ ...prev, [kind]: 0 }));
    } finally {
      setUploading(prev => ({ ...prev, [kind]: false }));
    }
  };

  const handleDrop = (kind: CoverKind, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void uploadCover(kind, event.dataTransfer.files[0]);
  };

  const renderUploadArea = (kind: CoverKind, url: string) => {
    const config = coverConfig[kind];
    const inputRef = kind === 'realistic' ? realisticInputRef : textbookInputRef;
    const isUploading = uploading[kind];
    const progress = uploadProgress[kind];

    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-black', config.tone)}>{config.title}</span>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{config.description}</p>
          </div>
          <ImagePlus className="h-5 w-5 text-slate-300" />
        </div>

        {url && (
          <div className="mb-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
            <img src={url} alt={config.title} className="h-36 w-full object-cover" />
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
          }}
          onDragOver={event => event.preventDefault()}
          onDrop={event => handleDrop(kind, event)}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center transition hover:border-blue-300 hover:bg-blue-50"
        >
          {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-blue-600" /> : <UploadCloud className="h-6 w-6 text-blue-600" />}
          <p className="mt-2 text-sm font-black text-slate-700">Click chọn ảnh hoặc kéo-thả vào đây</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">File sẽ lưu vào Firebase Storage dưới dạng PNG cố định theo lessonId.</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={event => void uploadCover(kind, event.target.files?.[0])}
        />

        {(isUploading || progress > 0) && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-right text-xs font-bold text-slate-400">{progress}%</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-800">Ảnh đầu bài học</h3>
          <p className="text-sm font-semibold text-slate-500">Upload hai phiên bản ảnh minh hoạ để dùng trong cổng học sinh.</p>
        </div>
        <button
          type="button"
          onClick={() => onSaved({ realistic: realisticUrl || undefined, textbook: textbookUrl || undefined })}
          disabled={!hasChanged || uploading.realistic || uploading.textbook}
          className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Lưu
        </button>
      </div>

      {error && <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {renderUploadArea('realistic', realisticUrl)}
        {renderUploadArea('textbook', textbookUrl)}
      </div>
    </section>
  );
};
