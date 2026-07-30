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
import { tieuChiConCua } from '../../../data/tieuChiCon';
import { laTieuChiPhanHoa, laTrongTam2627 } from '../../../data/phanHoa';
import { diemDeXuatTuTieuChiCon, thanhToTheoBo } from '../../../lib/dugio/tinhDiem';
import type { BienBanDuGio } from '../../../lib/dugio/types';

interface Props {
  bienBan: BienBanDuGio;
  onDoi: (thayDoi: Partial<BienBanDuGio>) => void;
  chiDoc?: boolean;
}

const nhanDiem = (d: number) => String(d).replace('.', ',');

/**
 * Khối "vì sao điểm này" — trả lời thẳng bốn câu người dự giờ phải nói với
 * giáo viên: đang làm được gì, còn thiếu gì, vì sao dừng ở mức này, làm gì để
 * lên mức trên. Trước đây giao diện chỉ đổ ra thang 4 mức rồi để người dùng
 * tự tổng hợp — đọc thì hiểu nhưng không nói lại được cho giáo viên nghe.
 */
function GiaiThichDiem({
  ma,
  diem,
  bangChung,
  lyDo,
  chamNguong,
  coTheLam,
}: {
  ma: MaThanhTo;
  diem: number;
  bangChung: string[];
  lyDo: string;
  chamNguong: string;
  coTheLam: string[];
}) {
  // Điểm lẻ 2,5 nghĩa là đã vững mức 2 và mới chạm mức 3 → đích vẫn là mức 3.
  const mucDangO = Math.floor(diem);
  const mucKeTiep = mucDangO < 4 ? mucDangO + 1 : null;
  const luongHoa = LUONG_HOA_PHAN_III[ma];
  const dichCuThe = mucKeTiep === 2 ? luongHoa?.muc2 : mucKeTiep === 3 ? luongHoa?.muc3 : mucKeTiep === 4 ? luongHoa?.muc4 : undefined;

  return (
    <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
      <p className="font-bold text-slate-800">
        Đang ở mức {mucDangO} · {TEN_MUC[mucDangO - 1]}
        {!Number.isInteger(diem) && (
          <span className="font-normal text-slate-600"> (đã chạm ngưỡng mức {mucDangO + 1})</span>
        )}
      </p>

      {bangChung.length > 0 && (
        <div>
          <p className="font-semibold text-emerald-700">Đã làm được</p>
          <ul className="mt-0.5 list-disc pl-5 text-slate-700">
            {bangChung.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {!Number.isInteger(diem) && chamNguong && (
        <p className="text-slate-700">
          <span className="font-semibold text-emerald-700">Điểm sáng vượt mức: </span>
          {chamNguong}
        </p>
      )}

      {lyDo && mucKeTiep && (
        <p className="text-slate-700">
          <span className="font-semibold text-amber-700">Vì sao chưa lên mức {mucKeTiep}: </span>
          {lyDo}
        </p>
      )}

      {mucKeTiep ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2.5">
          <p className="font-semibold text-indigo-800">
            Để đạt mức {mucKeTiep} · {TEN_MUC[mucKeTiep - 1]}
          </p>
          <p className="mt-0.5 text-slate-700">{RUBRIC[ma][mucKeTiep - 1]}</p>
          {dichCuThe && (
            <p className="mt-1.5 text-slate-700">
              <span className="font-semibold">Dấu hiệu đếm được: </span>
              {dichCuThe}
            </p>
          )}
        </div>
      ) : (
        <p className="font-semibold text-indigo-800">Đã ở mức cao nhất của khung.</p>
      )}

      {coTheLam.length > 0 && (
        <div>
          <p className="font-semibold text-slate-800">Làm ngay ở tiết sau</p>
          <ul className="mt-0.5 list-disc pl-5 text-slate-700">
            {coTheLam.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Chấm điểm ở TẦNG TIÊU CHÍ CON.
 *
 * Đây là tầng mà bản tự đánh giá và kế hoạch tự thúc đẩy của trường dùng. Điểm
 * thành tố phía trên được đề xuất bằng trung bình các mục ở đây, nhưng người dự
 * giờ vẫn sửa được — nhìn tổng thể có thể khác bình quân máy tính.
 */
function BangTieuChiCon({
  thanhTo,
  bienBan,
  onDoi,
  chiDoc,
}: {
  thanhTo: MaThanhTo;
  bienBan: BienBanDuGio;
  onDoi: (t: Partial<BienBanDuGio>) => void;
  chiDoc?: boolean;
}) {
  const [mo, setMo] = useState(false);
  const con = tieuChiConCua(thanhTo);
  const deXuat = diemDeXuatTuTieuChiCon(bienBan, thanhTo);
  const chotThanhTo = bienBan.diemChot[thanhTo];
  const lechDeXuat =
    deXuat.diem !== null && typeof chotThanhTo === 'number' && deXuat.diem !== chotThanhTo;

  const dat = (ma: string, diem: number | null) =>
    onDoi({ diemTieuChiCon: { ...bienBan.diemTieuChiCon, [ma]: diem } });
  const datChamNguong = (ma: string, v: string) =>
    onDoi({ chamNguongTieuChiCon: { ...bienBan.chamNguongTieuChiCon, [ma]: v } });

  const thieuCn = con.filter(
    t => laDiemChamNguong(bienBan.diemTieuChiCon[t.ma]) && !(bienBan.chamNguongTieuChiCon[t.ma] || '').trim(),
  );

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm">
      <button
        type="button"
        onClick={() => setMo(!mo)}
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
      >
        <span className="font-semibold text-slate-800">
          {mo ? '▾' : '▸'} Tiêu chí con · đã chấm {deXuat.soDaCham}/{deXuat.tong}
        </span>
        <span className="text-slate-600">
          {deXuat.diem !== null && (
            <>
              trung bình <b>{nhanDiem(deXuat.diem)}</b>
            </>
          )}
          {thieuCn.length > 0 && (
            <span className="ml-2 font-medium text-rose-600">
              {thieuCn.length} mục thiếu minh chứng chạm ngưỡng
            </span>
          )}
        </span>
      </button>

      {lechDeXuat && (
        <p className="mt-1.5 rounded-lg bg-amber-50 p-2 text-amber-900">
          Trung bình tiêu chí con là <b>{nhanDiem(deXuat.diem as number)}</b> nhưng bạn chốt thành tố{' '}
          <b>{nhanDiem(chotThanhTo as number)}</b>. Không sao — chỉ để bạn biết hai con số đang lệch.
        </p>
      )}

      {mo && (
        <div className="mt-3 space-y-2">
          {con.map(t => {
            const d = bienBan.diemTieuChiCon[t.ma];
            const chuaCham = d === undefined || d === null;
            const canCn = laDiemChamNguong(d);
            const cn = bienBan.chamNguongTieuChiCon[t.ma] || '';
            const bc = bienBan.bangChungTieuChiCon[t.ma] || [];
            const ld = bienBan.lyDoTieuChiCon[t.ma] || '';

            return (
              <div
                key={t.ma}
                className={`rounded-lg border p-2.5 ${
                  canCn && !cn.trim() ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-[13rem] flex-1 font-medium text-slate-800">
                    <span className="mr-1.5 font-mono text-xs text-slate-500">{t.ma}</span>
                    {t.ten}
                    {t.tuBoSung && (
                      <span
                        className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-800"
                        title="Trường chưa ban hành mô tả 4 mức cho mục này; đây là bản soạn bổ sung"
                      >
                        bản bổ sung
                      </span>
                    )}
                    {laTieuChiPhanHoa(t.ma) && (
                      <span
                        className={`ml-2 rounded px-1.5 py-0.5 text-xs font-normal ${
                          laTrongTam2627(t.ma)
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                        title={
                          laTrongTam2627(t.ma)
                            ? 'Dạy học phân hóa — trọng tâm quan sát năm 26-27'
                            : 'Liên quan dạy học phân hóa'
                        }
                      >
                        {laTrongTam2627(t.ma) ? 'phân hóa · trọng tâm' : 'phân hóa'}
                      </span>
                    )}
                  </p>

                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      disabled={chiDoc}
                      onClick={() => dat(t.ma, null)}
                      className={`rounded border px-2 py-0.5 text-xs font-medium ${
                        chuaCham
                          ? 'border-slate-400 bg-slate-200 text-slate-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-400'
                      }`}
                      title="Không quan sát được — bị loại khỏi trung bình, KHÔNG tính 0 điểm"
                    >
                      Không đánh giá
                    </button>
                    {MUC_DIEM.map(v => (
                      <button
                        key={v}
                        type="button"
                        disabled={chiDoc}
                        onClick={() => dat(t.ma, v)}
                        title={Number.isInteger(v) ? `${v} — ${TEN_MUC[v - 1]}` : `${nhanDiem(v)} — cần minh chứng chạm ngưỡng`}
                        className={`w-9 rounded border py-0.5 text-xs font-semibold ${
                          d === v
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : Number.isInteger(v)
                              ? 'border-slate-200 text-slate-700 hover:border-indigo-400'
                              : 'border-dashed border-slate-300 text-slate-500 hover:border-indigo-400'
                        }`}
                      >
                        {nhanDiem(v)}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="mt-1 text-slate-600">{t.dinhNghia}</p>

                {bc.length > 0 && (
                  <div className="mt-1.5">
                    <p className="font-medium text-emerald-800">Bằng chứng AI trích</p>
                    <ul className="list-disc pl-5 text-slate-700">
                      {bc.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {ld && <p className="mt-1 text-slate-600">Lí do AI chấm mức này: {ld}</p>}

                {canCn && (
                  <div className="mt-1.5">
                    <label className="mb-0.5 block text-xs font-semibold text-slate-700">
                      Hành động chạm ngưỡng{' '}
                      <span className="font-normal text-rose-600">· bắt buộc với điểm {nhanDiem(d as number)}</span>
                    </label>
                    <textarea
                      value={cn}
                      disabled={chiDoc}
                      rows={2}
                      placeholder={CHAM_NGUONG[d as 1.5 | 2.5 | 3.5].viDu}
                      onChange={e => datChamNguong(t.ma, e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white p-1.5 text-sm"
                    />
                  </div>
                )}

                <details className="mt-1.5">
                  <summary className="cursor-pointer text-xs text-slate-500">Xem thang 4 mức</summary>
                  <ol className="mt-1 space-y-0.5 text-slate-600">
                    {t.muc.map((x, i) => (
                      <li key={i} className={d === i + 1 ? 'font-medium text-indigo-700' : ''}>
                        <b>
                          {i + 1} {TEN_MUC[i]}:
                        </b>{' '}
                        {x}
                      </li>
                    ))}
                  </ol>
                </details>
              </div>
            );
          })}

          {!chiDoc && deXuat.diem !== null && (
            <button
              type="button"
              onClick={() =>
                onDoi({
                  diemChot: { ...bienBan.diemChot, [thanhTo]: deXuat.diem },
                  daSua: { ...bienBan.daSua, [thanhTo]: false },
                })
              }
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-300"
            >
              Đặt điểm thành tố = trung bình ({nhanDiem(deXuat.diem)})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

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
    // Không tự bung bảng tham khảo: ô minh chứng và khối "vì sao điểm này" đã
    // hiện sẵn, bung thêm chỉ làm lặp nội dung.
  };

  const datChamNguong = (ma: MaThanhTo, v: string) =>
    onDoi({ chamNguong: { ...bienBan.chamNguong, [ma]: v } });

  return (
    <div className="space-y-8">
      {cacPhan.map(phan => (
        <section key={phan}>
          <header className="mb-3 border-b border-slate-200 pb-2">
            <h3 className="text-lg font-bold text-slate-800">{TEN_PHAN[phan]}</h3>
            <p className="text-sm text-slate-500">{NGUON_PHAN[phan]}</p>
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
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-[16rem] flex-1">
                      <button
                        type="button"
                        onClick={() => setMoRong(mo ? null : c.ma)}
                        className="text-left font-semibold text-slate-800 hover:underline"
                      >
                        <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                          {c.ma}
                        </span>
                        {c.ten}
                      </button>

                      {kq && (
                        <p className="mt-1 text-xs text-slate-500">
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
                            ? 'border-slate-400 bg-slate-200 text-slate-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-400'
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
                                ? 'border-slate-200 text-slate-700 hover:border-indigo-400'
                                : 'border-dashed border-slate-300 text-slate-500 hover:border-indigo-400'
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
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Hành động chạm ngưỡng đã quan sát được{' '}
                        <span className="font-normal text-rose-600">· bắt buộc với điểm {nhanDiem(chot as number)}</span>
                      </label>
                      <p className="mb-1.5 text-xs text-slate-500">
                        {CHAM_NGUONG[chot as 1.5 | 2.5 | 3.5].dieuKien}{' '}
                        <b>{CHAM_NGUONG[chot as 1.5 | 2.5 | 3.5].congThem}</b>
                      </p>
                      <textarea
                        value={minhChung}
                        disabled={chiDoc}
                        onChange={e => datChamNguong(c.ma, e.target.value)}
                        rows={2}
                        placeholder={CHAM_NGUONG[chot as 1.5 | 2.5 | 3.5].viDu}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
                      />
                      {thieu && (
                        <p className="mt-1 text-xs font-medium text-rose-600">
                          Chưa ghi minh chứng — không chốt được biên bản. Không cho điểm lẻ theo cảm giác.
                        </p>
                      )}
                    </div>
                  )}

                  {tieuChiConCua(c.ma).length > 0 && (
                    <BangTieuChiCon
                      thanhTo={c.ma}
                      bienBan={bienBan}
                      onDoi={onDoi}
                      chiDoc={chiDoc}
                    />
                  )}

                  {typeof chot === 'number' && (
                    <GiaiThichDiem
                      ma={c.ma}
                      diem={chot}
                      bangChung={kq?.bangChung ?? []}
                      lyDo={kq?.lyDo ?? ''}
                      chamNguong={minhChung}
                      coTheLam={bienBan.gopY[c.ma]?.coTheLam ?? []}
                    />
                  )}

                  {mo && (
                    <div className="mt-4 space-y-3 border-t border-slate-200 pt-3 text-sm">
                      {kq && kq.bangChung.length > 0 && (
                        <div>
                          <p className="font-semibold text-slate-700">Bằng chứng trích từ biên bản</p>
                          <ul className="mt-1 list-disc pl-5 text-slate-600">
                            {kq.bangChung.map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                          {kq.lyDo && <p className="mt-1 text-slate-500">Lí do: {kq.lyDo}</p>}
                        </div>
                      )}

                      {kq && kq.cauHoi.length > 0 && (
                        <div>
                          <p className="font-semibold text-amber-700">Cần hỏi thêm giáo viên</p>
                          <ul className="mt-1 list-disc pl-5 text-slate-600">
                            {kq.cauHoi.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {LUONG_HOA_PHAN_III[c.ma] && (
                        <div className="rounded-lg bg-indigo-50 p-3">
                          <p className="font-semibold text-indigo-800">
                            Lượng hóa của tổ Toán · {LUONG_HOA_PHAN_III[c.ma]!.doLuong}
                          </p>
                          <ul className="mt-1 space-y-0.5 text-slate-700">
                            <li><b>Mức 2</b> nếu: {LUONG_HOA_PHAN_III[c.ma]!.muc2}</li>
                            <li><b>Mức 3</b> nếu: {LUONG_HOA_PHAN_III[c.ma]!.muc3}</li>
                            <li><b>Mức 4</b> nếu: {LUONG_HOA_PHAN_III[c.ma]!.muc4}</li>
                          </ul>
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-slate-700">Thang 4 mức của khung</p>
                        <ol className="mt-1 space-y-1 text-slate-600">
                          {RUBRIC[c.ma].map((t, i) => (
                            <li key={i} className={chot === i + 1 ? 'font-medium text-indigo-700' : ''}>
                              <b>{i + 1} {TEN_MUC[i]}:</b> {t}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {COT_LOI[c.ma].length > 0 && (
                        <div>
                          <p className="font-semibold text-slate-700">Thành tố cốt lõi</p>
                          <ul className="mt-1 list-disc pl-5 text-slate-600">
                            {COT_LOI[c.ma].map((t, i) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {SUY_NGAM[c.ma].length > 0 && (
                        <div>
                          <p className="font-semibold text-slate-700">Câu hỏi suy ngẫm</p>
                          <ul className="mt-1 list-disc pl-5 text-slate-600">
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
