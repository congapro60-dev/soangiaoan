/**
 * Bảng ghi chép quan sát — 5 cột đúng như mẫu biên bản của trường.
 * Xuất Excel ánh xạ thẳng các cột này sang sheet đầu của file mẫu.
 */
import type { BienBanDuGio, DongQuanSat } from '../../../lib/dugio/types';

interface Props {
  bienBan: BienBanDuGio;
  onDoi: (thayDoi: Partial<BienBanDuGio>) => void;
  chiDoc?: boolean;
}

const COT: { khoa: keyof DongQuanSat; nhan: string; rong: string }[] = [
  { khoa: 'thoiGian', nhan: 'Thời gian', rong: 'w-24' },
  { khoa: 'hoatDong', nhan: 'Hoạt động', rong: 'w-36' },
  { khoa: 'cuaGiaoVien', nhan: 'Hoạt động của giáo viên', rong: '' },
  { khoa: 'cuaHocSinh', nhan: 'Hoạt động của học sinh', rong: '' },
  { khoa: 'ghiChu', nhan: 'Ghi chú', rong: '' },
];

const dongMoi = (): DongQuanSat => ({
  thoiGian: '',
  hoatDong: '',
  cuaGiaoVien: '',
  cuaHocSinh: '',
  ghiChu: '',
});

export function BangQuanSat({ bienBan, onDoi, chiDoc }: Props) {
  const dong = bienBan.dongQuanSat;
  const dat = (ds: DongQuanSat[]) => onDoi({ dongQuanSat: ds });

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              {COT.map(c => (
                <th
                  key={c.khoa}
                  className={`${c.rong} border-b border-slate-200 p-2 text-left font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200`}
                >
                  {c.nhan}
                </th>
              ))}
              {!chiDoc && <th className="w-10 border-b border-slate-200 dark:border-slate-700" />}
            </tr>
          </thead>
          <tbody>
            {dong.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500 dark:text-slate-400">
                  Chưa có dòng nào. Bấm “Thêm dòng” để bắt đầu ghi, hoặc tải file Excel đã ghi sẵn lên.
                </td>
              </tr>
            )}
            {dong.map((d, i) => (
              <tr key={i} className="align-top even:bg-slate-50 dark:even:bg-slate-800/40">
                {COT.map(c => (
                  <td key={c.khoa} className="border-b border-slate-100 p-1 dark:border-slate-700/60">
                    <textarea
                      value={d[c.khoa]}
                      disabled={chiDoc}
                      rows={c.khoa === 'thoiGian' || c.khoa === 'hoatDong' ? 2 : 3}
                      onChange={e => {
                        const ds = [...dong];
                        ds[i] = { ...ds[i], [c.khoa]: e.target.value };
                        dat(ds);
                      }}
                      className="w-full resize-y rounded border border-transparent bg-transparent p-1.5 text-slate-800 focus:border-indigo-400 focus:bg-white dark:text-slate-100 dark:focus:bg-slate-900"
                    />
                  </td>
                ))}
                {!chiDoc && (
                  <td className="border-b border-slate-100 p-1 text-center dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => dat(dong.filter((_, k) => k !== i))}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      title="Xoá dòng"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!chiDoc && (
        <button
          type="button"
          onClick={() => dat([...dong, dongMoi()])}
          className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-300"
        >
          + Thêm dòng
        </button>
      )}
    </div>
  );
}
