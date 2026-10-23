import { useEffect, useId, useRef, useState } from 'react';
import { ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../../../lib/firebase';
import { createV832ReviewRequest, type V832ReviewCaptureInput } from '../../../services/v832RoomService';

type Capture = { input: V832ReviewCaptureInput; png: Blob; url: string; path: string };

export const ScreenReviewEntry = ({ roomId, revision, locale, runtimeV84, questionRunKey, questionRunRevision, questionPhase }: {
  roomId: string;
  revision: number;
  locale: 'vi' | 'en' | 'ja';
  runtimeV84: boolean;
  questionRunKey?: string | null;
  questionRunRevision?: number | null;
  questionPhase?: string | null;
}) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const currentStamp = useRef('');
  const stamp = `${roomId}:${revision}:${questionRunKey ?? ''}:${questionRunRevision ?? ''}:${questionPhase ?? ''}:${locale}`;
  currentStamp.current = stamp;
  const titleId = useId();
  const messageId = useId();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  useEffect(() => () => { if (capture) URL.revokeObjectURL(capture.url); }, [capture]);

  const open = async () => {
    const user = auth.currentUser;
    const stage = document.querySelector<HTMLElement>('.v832-stage--presenter');
    if (!user || user.isAnonymous || !stage || busy) return;
    const beforeStamp = currentStamp.current;
    const input: V832ReviewCaptureInput = {
      roomId, expectedRevision: revision, role: 'presenter', locale,
      ...(runtimeV84 ? { expectedQuestionRunKey: questionRunKey ?? null, expectedQuestionRunRevision: questionRunRevision ?? null,
        expectedQuestionPhase: questionPhase ?? null } : {}),
      viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
      route: window.location.pathname + window.location.search,
      visibleComponentIds: ['presenter-stage', ...(stage.querySelector('.v832-active-question') ? ['active-question'] : [])],
    };
    setBusy(true); setError(null); setReviewId(null); setMessage(''); setCapture(null);
    dialog.current?.showModal();
    try {
      await document.fonts.ready;
      const { default: html2canvas } = await import('html2canvas-pro');
      const canvas = await html2canvas(stage, {
        scale: Math.min(2, window.devicePixelRatio), backgroundColor: '#071624', useCORS: true,
        ignoreElements: element => element.classList.contains('v832-presenter-dock'),
      });
      if (currentStamp.current !== beforeStamp || input.viewport.width !== window.innerWidth
        || input.viewport.height !== window.innerHeight || input.viewport.devicePixelRatio !== window.devicePixelRatio) {
        throw new Error('Màn học đã đổi trong lúc chụp. Đóng hộp này và chụp lại.');
      }
      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob =>
        blob ? resolve(blob) : reject(new Error('Không tạo được ảnh màn hình.')), 'image/png'));
      if (png.size > 8 * 1024 * 1024) throw new Error('Ảnh màn hình vượt 8 MB. Hãy dùng vùng hiển thị nhỏ hơn.');
      setCapture({ input, png, url: URL.createObjectURL(png),
        path: `lessonGen/${user.uid}/${roomId}/review-${crypto.randomUUID()}.png` });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không chụp được màn học.'); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    if (!capture || !message.trim() || busy || reviewId) return;
    setBusy(true); setError(null);
    try {
      await uploadBytes(ref(storage, capture.path), capture.png, { contentType: 'image/png' });
      const result = await createV832ReviewRequest({ ...capture.input, teacherMessage: message.trim(),
        screenshotAssetId: capture.path, scope: 'screen', annotations: [],
        attachments: [{ id: 'capture', storagePath: capture.path, mimeType: 'image/png', source: 'automatic_screenshot' }],
      });
      setReviewId(result.reviewId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không ghi được yêu cầu.'); }
    finally { setBusy(false); }
  };

  const close = () => { if (!busy) { dialog.current?.close(); setCapture(null); trigger.current?.focus(); } };
  return <div className="v832-review-entry">
    <button ref={trigger} disabled={busy} onClick={() => void open()}>Sửa màn này</button>
    <dialog ref={dialog} role="dialog" className="v832-review-dialog" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); close(); }}>
      <header><h2 id={titleId}>Ghi yêu cầu sửa màn học</h2>
        <button className="v832-review-close" disabled={busy} onClick={close} aria-label="Đóng yêu cầu sửa">Đóng</button></header>
      <p>Ảnh chỉ chụp màn trình chiếu, không lấy bảng điểm danh hoặc bài làm riêng. Ảnh và yêu cầu được lưu riêng cho tài khoản giáo viên.</p>
      {busy && <p role="status">{capture ? 'Đang lưu ảnh và yêu cầu…' : 'Đang chụp màn hiện tại…'}</p>}
      {capture && <img src={capture.url} alt="Màn Presenter đã chụp để đối chiếu yêu cầu" />}
      {error && <p role="alert">{error}</p>}
      {reviewId ? <p role="status">Đã ghi yêu cầu. Nội dung bài học chưa thay đổi; yêu cầu đang chờ phân tích.</p> : <>
        <label htmlFor={messageId}>Thầy/cô muốn sửa điều gì?</label>
        <textarea id={messageId} rows={3} maxLength={4000} value={message} disabled={busy}
          onChange={event => setMessage(event.target.value)} />
        <button className="v832-review-submit" disabled={!capture || !message.trim() || busy} onClick={() => void submit()}>Ghi yêu cầu</button>
      </>}
    </dialog>
  </div>;
};
