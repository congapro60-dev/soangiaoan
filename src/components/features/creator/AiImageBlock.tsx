/**
 * Block ```aiimg``` trên màn xem giáo án. Đã resolve (body là URL ảnh đã cache) → hiện ảnh.
 * Chưa resolve (đang sinh nội dung, hoặc lượt sinh ảnh chưa chạy) → khung chờ kèm mô tả tiếng Việt.
 */
export const AiImageBlock = ({ body }: { body: string }) => {
  const text = body.trim();
  if (/^https:\/\/\S+$/.test(text)) {
    return (
      <div className="my-4 flex justify-center">
        <img src={text} alt="Hình minh họa" className="max-h-80 max-w-full rounded-xl border border-slate-200" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="my-4 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-sm text-slate-600 italic">
      Ảnh minh họa sẽ được sinh: {text}
    </div>
  );
};
