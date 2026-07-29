/**
 * Bước 5 của chu trình dự giờ phát triển — giáo viên TỰ phân tích.
 *
 * Hai màn trong một file vì chúng là hai mặt của cùng một dữ liệu:
 *  - BangTuDanhGia: giáo viên tự chấm, không nhìn thấy điểm người dự giờ.
 *  - BangSoSanh: người dự giờ đối chiếu hai bảng sau khi giáo viên đã gửi.
 *
 * Giáo viên KHÔNG được thấy điểm của người dự trước khi tự chấm — thấy trước
 * thì họ chấm theo, và cả bước này mất ý nghĩa.
 */
import { COMPONENTS, TEN_MUC, TEN_PHAN, type MaThanhTo, type SoPhan } from '../../../data/khungDanielson';
import { MUC_DIEM } from '../../../data/nguyenTacChamDiem';
import { soSanhTuDanhGia, thanhToTheoBo, soVN } from '../../../lib/dugio/tinhDiem';
import type { BienBanDuGio } from '../../../lib/dugio/types';

const nhanDiem = (d: number) => String(d).replace('.', ',');

export function BangTuDanhGia({
  bienBan,
  onDoi,
  chiDoc,
}: {
  bienBan: BienBanDuGio;
  onDoi: (t: Partial<BienBanDuGio>) => void;
  chiDoc?: boolean;
}) {
  const trongBo = new Set(thanhToTheoBo(bienBan.boTieuChi));
  const td = bienBan.tuDanhGia;

  const dat = (ma: MaThanhTo, diem: number | null) =>
    onDoi({ tuDanhGia: { ...td, diem: { ...td.diem, [ma]: diem } } });
  const ghi = (ma: MaThanhTo, v: string) =>
    onDoi({ tuDanhGia: { ...td, ghiChu: { ...td.ghiChu, [ma]: v } } });

  const cacPhan = ([1, 2, 3, 4] as SoPhan[]).filter(p =>
    COMPONENTS.some(c => c.phan === p && trongBo.has(c.ma)),
  );

  return (
    <div className="space-y-6">
      {cacPhan.map(phan => (
        <section key={phan}>
          <h3 className="mb-2 border-b border-slate-200 pb-1 text-lg font-bold text-slate-800">
            {TEN_PHAN[phan]}
          </h3>
          <div className="space-y-2">
            {COMPONENTS.filter(c => c.phan === phan && trongBo.has(c.ma)).map(c => {
              const d = td.diem[c.ma];
              const chuaCham = d === undefined || d === null;
              return (
                <article key={c.ma} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-[14rem] flex-1 font-semibold text-slate-800">
                      <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                        {c.ma}
                      </span>
                      {c.ten}
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        disabled={chiDoc}
                        onClick={() => dat(c.ma, null)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                          chuaCham ? 'border-slate-400 bg-slate-200 text-slate-700' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        Chưa rõ
                      </button>
                      {MUC_DIEM.map(v => (
                        <button
                          key={v}
                          type="button"
                          disabled={chiDoc}
                          onClick={() => dat(c.ma, v)}
                          title={Number.isInteger(v) ? `${v} — ${TEN_MUC[v - 1]}` : nhanDiem(v)}
                          className={`w-11 rounded-lg border py-1 text-sm font-semibold ${
                            d === v
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-200 text-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          {nhanDiem(v)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={td.ghiChu[c.ma] || ''}
                    disabled={chiDoc}
                    rows={2}
                    onChange={e => ghi(c.ma, e.target.value)}
                    placeholder="Vì sao thầy/cô tự chấm mức này? Có điều gì trong tiết mà người dự giờ có thể chưa thấy?"
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
                  />
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function BangSoSanh({ bienBan }: { bienBan: BienBanDuGio }) {
  const { dong, lechLon, daTuDanhGia } = soSanhTuDanhGia(bienBan);

  if (!daTuDanhGia) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-600">
        {bienBan.gvEmail ? (
          <p>
            Đã mời <b>{bienBan.gvEmail}</b> — chờ thầy/cô gửi bản tự chấm.
          </p>
        ) : (
          <>
            <p className="font-medium text-slate-700">Bước này không bắt buộc.</p>
            <p className="mt-1">
              Biên bản, chấm điểm, góp ý và xuất file đều đã dùng được mà không cần bản tự đánh giá.
              Muốn có thêm góc nhìn của giáo viên thì điền email của thầy/cô ở mục 1 để mời.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lechLon.length > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-bold text-amber-900">
            {lechLon.length} thành tố hai bên chấm lệch từ 1 mức trở lên
          </p>
          <p className="mt-1 text-amber-800">
            Đây là chỗ đáng hỏi nhất — không phải để phân xử ai đúng, mà để hiểu vì sao nhìn khác nhau.
            Hỏi thử: “Thầy/cô tự chấm {nhanDiem(lechLon[0].giaoVien as number)} ở {lechLon[0].ma}, tôi ghi{' '}
            {nhanDiem(lechLon[0].nguoiDu as number)}. Thầy/cô dựa vào điều gì?”
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          Hai bảng điểm khớp nhau, không chỗ nào lệch quá 0,5. Giáo viên đã tự nhìn ra đúng những gì
          người dự giờ thấy.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 font-semibold text-slate-700">Thành tố</th>
              <th className="w-24 p-2 text-center font-semibold text-slate-700">Người dự</th>
              <th className="w-24 p-2 text-center font-semibold text-slate-700">Giáo viên</th>
              <th className="w-20 p-2 text-center font-semibold text-slate-700">Lệch</th>
              <th className="p-2 font-semibold text-slate-700">Giáo viên giải thích</th>
            </tr>
          </thead>
          <tbody>
            {dong.map(d => {
              const lech = d.chenh !== null && Math.abs(d.chenh) >= 1;
              return (
                <tr key={d.ma} className={`align-top ${lech ? 'bg-amber-50' : 'even:bg-slate-50'}`}>
                  <td className="border-t border-slate-100 p-2">
                    <span className="mr-1.5 font-mono text-xs text-slate-500">{d.ma}</span>
                    {d.ten}
                  </td>
                  <td className="border-t border-slate-100 p-2 text-center font-semibold">
                    {d.nguoiDu === null ? '—' : nhanDiem(d.nguoiDu)}
                  </td>
                  <td className="border-t border-slate-100 p-2 text-center font-semibold">
                    {d.giaoVien === null ? '—' : nhanDiem(d.giaoVien)}
                  </td>
                  <td
                    className={`border-t border-slate-100 p-2 text-center font-bold ${
                      lech ? 'text-amber-700' : 'text-slate-400'
                    }`}
                  >
                    {d.chenh === null ? '—' : d.chenh > 0 ? `+${soVN(d.chenh, 1)}` : soVN(d.chenh, 1)}
                  </td>
                  <td className="border-t border-slate-100 p-2 text-slate-700">{d.ghiChu || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Cột “Lệch” là điểm giáo viên tự chấm trừ điểm người dự giờ. Dương nghĩa là giáo viên tự đánh
        giá cao hơn.
      </p>
    </div>
  );
}
