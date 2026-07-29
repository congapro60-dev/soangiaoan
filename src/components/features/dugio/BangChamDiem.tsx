/**
 * Lưới chấm điểm theo khung Danielson.
 *
 * Điểm mấu chốt về mặt công bằng:
 *  - "Không đánh giá" là một lựa chọn thật, KHÁC hẳn 0 điểm. Thành tố không
 *    quan sát được sẽ bị loại khỏi trung bình chứ không kéo điểm xuống.
 *  - Chọn điểm lẻ 0,5 thì bắt buộc mở ô minh chứng chạm ngưỡng. Ô trống thì
 *    có cảnh báo đỏ và biên bản không chốt được.
 */
import { useState } from 'react';
import {
  COMPONENTS,
  COT_LOI,
  NGUON_PHAN,
  RUBRIC,
  SUY_NGAM,
  TEN_MUC,
  TEN_PHAN,
  type MaThanhTo,
  type SoPhan,
} from '../../../data/khungDanielson';
import {
  CHAM_NGUONG,
  LUONG_HOA_PHAN_III,
  MUC_DIEM,
  laDiemChamNguong,
} from '../../../data/nguyenTacChamDiem';
import { thanhToTheoBo } from '../../../lib/dugio/tinhDiem';
import type { BienBanDuGio } from '../../../lib/dugio/types';

interface Props {
  bienBan: BienBanDuGio;
  onDoi: (thayDoi: Partial<BienBanDuGio>) => void;
  chiDoc?: boolean;
}

const nhanDiem = (d: number) => String(d).replace('.', ',');

export function BangChamDiem({ bienBan, onDoi, chiDoc }: Props) {
  const [moRong, setMoRong] = useState<MaThanhTo | null>(null);
  const trongBo = new Set(thanhToTheoBo(bienBan.boTieuChi));
  const cacPhan = ([1, 2, 3, 4] as SoPhan[]).filter(p =>
    COMPONENTS.some(c => c.phan === p && trongBo.has(c.ma)),
  );

  const datDiem = (ma: MaThanhTo, diem: number | null) => {
    const goiY = bienBan.ketQua[ma]?.diem ?? null;
    onDoi({
      diemChot: { ...bienBan.diemChot, [ma]: diem },
      daSua: { ...bienBan.daSua, [ma]: diem !== goiY },
    });
    if (diem !== null && laDiemChamNguong(diem)) setMoRong(ma);
  };

  const datChamNguong = (ma: MaThanhTo, v: string) =>
    onDoi({ chamNguong: { ...bienBan.chamNguong, [ma]: v } });

  return (
    <div className="space-y-8">
      {cacPhan.map(phan => (
        <section key={phan}>
          <header className="mb-3 border-b border-slate-200 pb-2 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{TEN_PHAN[phan]}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{NGUON_PHAN[phan]}</p>
          </header>

          <div className="space-y-3">
            {COMPONENTS.filter(c => c.phan === phan && trongBo.has(c.ma)).map(c => {
              const kq = bienBan.ketQua[c.ma];
              const chot = bienBan.diemChot[c.ma];
              const chuaCham = chot === undefined || chot === null;
              const canMinhChung = laDiemChamNguong(chot);
              const minhChung = bienBan.chamNguong[c.ma] || '';
              const thieu = canMinhChung && !minhChung.trim();
              const mo = moRong === c.ma;

              return (
                <article
                  key={c.ma}
                  className={`rounded-xl border p-4 transition ${
                    thieu
                      ? 'border-rose-400 bg-rose-50 dark:border-rose-500/60 dark:bg-rose-950/30'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-[16rem] flex-1">
                      <button
                        type="button"
                        onClick={() => setMoRong(mo ? null : c.ma)}
                        className="text-left font-semibold text-slate-800 hover:underline dark:text-slate-100"
                      >
                        <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {c.ma}
                        </span>
                        {c.ten}
                      </button>

                      {kq && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          AI đề xuất: <b>{kq.diem === null ? 'không đủ căn cứ' : nhanDiem(kq.diem)}</b>
                          {' · tin cậy '}
                          {{ cao: 'cao', vua: 'vừa', thap: 'thấp' }[kq.tinCay]}
                          {bienBan.daSua[c.ma] && <span className="ml-2 text-amber-600">· bạn đã sửa</span>}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        disabled={chiDoc}
                        onClick={() => datDiem(c.ma, null)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          chuaCham
                            ? 'border-slate-400 bg-slate-200 text-slate-700 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-100'
                            : 'border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-600 dark:text-slate-400'
                        }`}
                        title="Thành tố không quan sát được — bị loại khỏi trung bình, KHÔNG tính là 0 điểm"
                      >
                        Không đánh giá
                      </button>

                      {MUC_DIEM.map(d => (
                        <button
                          key={d}
                          type="button"
                          disabled={chiDoc}
                          onClick={() => datDiem(c.ma, d)}
                          className={`w-11 rounded-lg border py-1 text-sm font-semibold transition ${
                            chot === d
                              ? 'border-indigo-500 bg-indigo-500 text-white'
                              : Number.isInteger(d)
                                ? 'border-slate-200 text-slate-700 hover:border-indigo-400 dark:border-slate-600 dark:text-slate-200'
                                : 'border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 dark:border-slate-600 dark:text-slate-400'
                          }`}
                          title={
                            Number.isInteger(d)
                              ? `${d} — ${TEN_MUC[d - 1]}`
                              : `${nhanDiem(d)} — cần minh chứng chạm ngưỡng`
                          }
                        >
                          {nhanDiem(d)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {canMinhChung && (
                    <div className="mt-3">
                      <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Hành động chạm ngưỡng đã quan sát được{' '}
                        <span className="font-normal text-rose-600">· bắt buộc với điểm {nhanDiem(chot as number)}</span>
                      </label>
                      <p className="mb-1.5 text-xs text-slate-500 dark:text-slate-400">
                        {CHAM_NGUONG[chot as 1.5 | 2.5 | 3.5].dieuKien}{' '}
                        <b>{CHAM_NGUONG[chot as 1.5 | 2.5 | 3.5].congThem}</b>
                      </p>
                      <textarea
                        value={minhChung}
                        disabled={chiDoc}
                        onChange={e => datChamNguong(c.ma, e.target.value)}
                        rows={2}
                        placeholder={CHAM_NGUONG[chot as 1.5 | 2.5 | 3.5].viDu}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                      />
                      {thieu && (
                        <p className="mt-1 text-xs font-medium text-rose-600">
                          Chưa ghi minh chứng — không chốt được biên bản. Không cho điểm lẻ theo cảm giác.
                        </p>
                      )}
                    </div>
                  )}

                  {mo && (
                    <div className="mt-4 space-y-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
                      {kq && kq.bangChung.length > 0 && (
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">Bằng chứng trích từ biên bản</p>
                          <ul className="mt-1 list-disc pl-5 text-slate-600 dark:text-slate-300">
                            {kq.bangChung.map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                          {kq.lyDo && <p className="mt-1 text-slate-500 dark:text-slate-400">Lí do: {kq.lyDo}</p>}
                        </div>
                      )}

                      {kq && kq.cauHoi.length > 0 && (
                        <div>
                          <p className="font-semibold text-amber-700 dark:text-amber-400">Cần hỏi thêm giáo viên</p>
                          <ul className="mt-1 list-disc pl-5 text-slate-600 dark:text-slate-300">
                            {kq.cauHoi.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {LUONG_HOA_PHAN_III[c.ma] && (
                        <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-950/40">
                          <p className="font-semibold text-indigo-800 dark:text-indigo-300">
                            Lượng hóa của tổ Toán · {LUONG_HOA_PHAN_III[c.ma]!.doLuong}
                          </p>
                          <ul className="mt-1 space-y-0.5 text-slate-700 dark:text-slate-300">
                            <li><b>Mức 2</b> nếu: {LUONG_HOA_PHAN_III[c.ma]!.muc2}</li>
                            <li><b>Mức 3</b> nếu: {LUONG_HOA_PHAN_III[c.ma]!.muc3}</li>
                            <li><b>Mức 4</b> nếu: {LUONG_HOA_PHAN_III[c.ma]!.muc4}</li>
                          </ul>
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-200">Thang 4 mức của khung</p>
                        <ol className="mt-1 space-y-1 text-slate-600 dark:text-slate-300">
                          {RUBRIC[c.ma].map((t, i) => (
                            <li key={i} className={chot === i + 1 ? 'font-medium text-indigo-700 dark:text-indigo-300' : ''}>
                              <b>{i + 1} {TEN_MUC[i]}:</b> {t}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {COT_LOI[c.ma].length > 0 && (
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">Thành tố cốt lõi</p>
                          <ul className="mt-1 list-disc pl-5 text-slate-600 dark:text-slate-300">
                            {COT_LOI[c.ma].map((t, i) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {SUY_NGAM[c.ma].length > 0 && (
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-200">Câu hỏi suy ngẫm</p>
                          <ul className="mt-1 list-disc pl-5 text-slate-600 dark:text-slate-300">
                            {SUY_NGAM[c.ma].map((t, i) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
