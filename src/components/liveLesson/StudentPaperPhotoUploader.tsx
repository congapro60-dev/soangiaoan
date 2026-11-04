import { useRef, useState } from 'react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { nenAnhBaiLamToFile } from '../../utils/imageCompress';

/**
 * ASS-MDP-01 — chụp/chọn ảnh bài làm giấy trên điện thoại (P0 spec 6.1).
 *
 * Trên mobile: input accept="image/*" có thuộc tính capture cho phép mở thẳng camera;
 * ảnh được nén client-side (nenAnhBaiLamToFile) trước khi upload lên Storage path
 * `homework/{uid}/live-paper-*.jpg` (khớp storage.rules). URL ảnh nén được chèn vào
 * textarea dưới dạng `[Ảnh bài làm](url)` — không cần sửa schema Firestore responses.
 */
export function StudentPaperPhotoUploader({
  participantUid,
  onPhotoInserted,
  disabled,
}: {
  participantUid: string;
  onPhotoInserted: (markdownRef: string) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<'idle' | 'compressing' | 'uploading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setState('compressing');
    try {
      // 1. Nén ảnh client-side (giữ tỉ lệ, cạnh max 1536px, JPEG quality 0.82)
      const compressed = await nenAnhBaiLamToFile(file);
      setState('uploading');
      // 2. Upload Storage path đã có quyền theo storage.rules (homework/{uid}/*)
      const fileName = `live-paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const fileRef = ref(storage, `homework/${participantUid}/${fileName}`);
      await uploadBytes(fileRef, compressed, { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(fileRef);
      // 3. Chèn link ảnh vào câu trả lời
      onPhotoInserted(`\n[Ảnh bài làm]: ${downloadUrl}\n`);
      setState('done');
    } catch (error) {
      setState('error');
      setErrorMsg(error instanceof Error ? error.message : 'Chưa tải được ảnh.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="student-paper-photo" aria-label="Chụp ảnh bài làm giấy">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => void handlePickFile(e)}
        disabled={disabled || state === 'compressing' || state === 'uploading'}
      />
      <button
        type="button"
        disabled={disabled || state === 'compressing' || state === 'uploading'}
        onClick={() => fileInputRef.current?.click()}
        className="student-paper-photo-btn"
      >
        📷 {state === 'compressing' ? 'Đang nén ảnh…' : state === 'uploading' ? 'Đang tải lên…' : 'Chụp / chọn ảnh bài giấy'}
      </button>
      {state === 'done' && <span className="student-paper-photo-note">✓ Đã đính kèm ảnh vào bài</span>}
      {state === 'error' && errorMsg && <span className="student-paper-photo-note is-error" role="alert">{errorMsg}</span>}
    </div>
  );
}
