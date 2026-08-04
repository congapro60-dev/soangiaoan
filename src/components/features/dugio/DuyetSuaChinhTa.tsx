/**
 * TẦNG B — bảng duyệt đề xuất sửa chính tả biên bản.
 *
 * Mặc định KHÔNG chọn sẵn mục nào. Người dự giờ phải tự tick từng mục thì mới áp.
 * Tiếng Việt sai một dấu là đổi nghĩa ("chưa" ↔ "chứa"), mà đây là hồ sơ đánh giá một
 * giáo viên cụ thể — chọn sẵn hộ rồi để người dùng bấm "Áp dụng" cho nhanh chính là
 * cách biến "có duyệt" thành "tự áp" trên thực tế.
 */
import { useState } from 'react';
import type { DeXuatSua } from '../../../lib/dugio/deXuatSuaLoi';

interface Props {
  deXuat: DeXuatSua[];
  /** Số đề xuất AI đưa ra nhưng bị bộ lọc loại vì vượt phạm vi sửa chính tả. */
  soBiLoai: number;
  dangChay: boolean;
  onApDung: (chon: DeXuatSua[]) => void;
  onDong: () => void;
}

const TEN_COT: Record<string, string> = {
  hoatDong: 'Hoạt động',
  cuaGiaoVien: 'Hoạt động của giáo viên',
  cuaHocSinh: 'Hoạt động của học sinh',
  ghiChu: 'Ghi chú',
};

export function DuyetSuaChinhTa({ deXuat, soBiLoai, dangChay, onApDung, onDong }: Props) {
  const [chon, setChon] = useState<Set<number>>(new Set());

  const bat = (i: number) =>
    setChon(cu => {
      const moi = new Set(cu);
      if (moi.has(i)) moi.delete(i);
      else moi.add(i);
      return moi;
    });

  if (dangChay) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Đang soát chính tả…
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div>
        <h3 className="font-semibold text-slate-800">Đề xuất sửa chính tả · cần bạn duyệt</h3>
        <p className="mt-1 text-sm text-slate-600">
          Máy <strong>không tự sửa</strong>. Tiếng Việt sai một dấu là đổi nghĩa (“chưa” ↔ “chứa”),
          mà đây là hồ sơ đánh giá giáo viên — bạn tick mục nào thì chỉ mục đó được áp.
        </p>
        {soBiLoai > 0 && (
          <p className="mt-1 text-sm text-amber-800">
            Đã tự loại <strong>{soBiLoai}</strong> đề xuất vượt phạm vi sửa chính tả (viết lại câu,
            thêm/bớt chữ, hoặc trích đoạn không có thật trong biên bản).
          </p>
        )}
      </div>

      {deXuat.length === 0 ? (
        <p className="text-sm text-slate-600">Không tìm thấy lỗi chính tả nào cần sửa.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {deXuat.map((dx, i) => (
              <li key={i}>
                <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-300">
                  <input
                    type="checkbox"
                    checked={chon.has(i)}
                    onChange={() => bat(i)}
                    className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
                  />
                  <span className="min-w-0 text-sm">
                    <span className="text-slate-500">
                      Dòng {dx.dong + 1} · {TEN_COT[dx.cot] ?? dx.cot}
                    </span>
                    <span className="mt-1 block break-words">
                      <span className="rounded bg-rose-50 px-1 text-rose-700 line-through">
                        {dx.truoc}
                      </span>
                      <span className="mx-2 text-slate-400">→</span>
                      <span className="rounded bg-emerald-50 px-1 font-medium text-emerald-800">
                        {dx.sau}
                      </span>
                    </span>
                    {dx.lyDo && <span className="mt-1 block text-slate-500">{dx.lyDo}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={chon.size === 0}
              onClick={() => onApDung(deXuat.filter((_, i) => chon.has(i)))}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Áp dụng {chon.size} mục đã chọn
            </button>
            <button
              type="button"
              onClick={onDong}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white"
            >
              Bỏ qua tất cả
            </button>
          </div>
        </>
      )}
    </div>
  );
}
