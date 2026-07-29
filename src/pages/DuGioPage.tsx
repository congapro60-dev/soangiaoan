/**
 * Trang biên bản dự giờ theo khung Danielson.
 *
 * Ai đăng nhập cũng tự lập được biên bản của mình; chỉ mình đọc. Muốn chia sẻ
 * thì bật "đưa lên thư viện" — giống hệt cách giáo án đang hoạt động.
 *
 * Gọi AI theo mô hình BYOK: dùng khóa của chính người dùng trong Cài đặt.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { isMissingApiKeyError } from '../lib/aiProviders';
import type { AppData } from '../types';

type Settings = AppData['settings'];
import { COMPONENTS, type MaThanhTo } from '../data/khungDanielson';
import { CANH_BAO_DIEM_LE, QUY_TAC_TINH_TIEN } from '../data/nguyenTacChamDiem';
import { BangChamDiem } from '../components/features/dugio/BangChamDiem';
import { BangQuanSat } from '../components/features/dugio/BangQuanSat';
import { docFileExcel, tenFileXuat, xuatTheoMau } from '../lib/dugio/excel';
import { phanTichBienBan, soanGopY, soanNhanXet, vanBanQuanSat } from '../lib/dugio/phanTich';
import { soVN, thieuMinhChungChamNguong, tinhDiem } from '../lib/dugio/tinhDiem';
import {
  danhSachCuaToi,
  danhSachThuVien,
  docBienBan,
  luuBienBan,
  xoaBienBan,
} from '../lib/dugio/luuTru';
import { bienBanRong, type BienBanDuGio } from '../lib/dugio/types';

const CACHE_KEY = 'smart_lesson_plan_data';

/** Đọc Settings từ cache dùng chung với app chính (mô hình BYOK). */
function docCaiDat(): Settings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw)?.settings as Settings) ?? null;
  } catch {
    return null;
  }
}

const O = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
const NUT = 'rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

export function DuGioPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [dangTaiAuth, setDangTaiAuth] = useState(true);
  const [bienBan, setBienBan] = useState<BienBanDuGio | null>(null);
  const [cuaToi, setCuaToi] = useState<BienBanDuGio[]>([]);
  const [thuVien, setThuVien] = useState<BienBanDuGio[]>([]);
  const [tab, setTab] = useState<'toi' | 'thuvien'>('toi');
  const [dangChay, setDangChay] = useState<string | null>(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [hong, setHong] = useState<MaThanhTo[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setDangTaiAuth(false); }), []);

  const taiDanhSach = useCallback(async (uid: string) => {
    try {
      const [a, b] = await Promise.all([danhSachCuaToi(uid), danhSachThuVien()]);
      setCuaToi(a);
      setThuVien(b);
    } catch (e) {
      setLoi('Không tải được danh sách: ' + (e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (id) {
      docBienBan(id)
        .then(bb => (bb ? setBienBan(bb) : setLoi('Không tìm thấy biên bản, hoặc bạn không có quyền đọc.')))
        .catch(e => setLoi('Không mở được biên bản: ' + (e as Error).message));
    } else {
      setBienBan(null);
      void taiDanhSach(user.uid);
    }
  }, [user, id, taiDanhSach]);

  const doi = useCallback(
    (thayDoi: Partial<BienBanDuGio>) => setBienBan(bb => (bb ? { ...bb, ...thayDoi } : bb)),
    [],
  );

  const chiDoc = !!bienBan && !!user && bienBan.userId !== user.uid;
  const diem = useMemo(() => (bienBan ? tinhDiem(bienBan) : null), [bienBan]);
  const thieu = useMemo(() => (bienBan ? thieuMinhChungChamNguong(bienBan) : []), [bienBan]);

  const canGopY = useMemo(
    () =>
      bienBan
        ? COMPONENTS.filter(c => typeof bienBan.diemChot[c.ma] === 'number' && (bienBan.diemChot[c.ma] as number) < 3).map(c => c.ma)
        : [],
    [bienBan],
  );

  /* ─────────── hành động ─────────── */

  const chay = async (moTa: string, viec: () => Promise<void>) => {
    setLoi('');
    setThongBao('');
    setDangChay(moTa);
    try {
      await viec();
    } catch (e) {
      setLoi(
        isMissingApiKeyError(e)
          ? (e as Error).message
          : 'Không thực hiện được: ' + (e as Error).message,
      );
    } finally {
      setDangChay(null);
    }
  };

  const caiDat = () => {
    const s = docCaiDat();
    if (!s) throw new Error('Chưa có cài đặt AI. Mở ứng dụng chính, vào Cài đặt và nhập khóa API của bạn.');
    return s;
  };

  const phanTich = () =>
    chay('Đang phân tích…', async () => {
      if (!bienBan) return;
      if (vanBanQuanSat(bienBan).trim().length < 60) {
        throw new Error('Biên bản còn quá ngắn để gán bằng chứng. Cần ít nhất vài dòng ghi chép quan sát.');
      }
      const { ketQua, hong: h } = await phanTichBienBan(bienBan, caiDat(), {
        onTienDo: setDangChay,
        onLo: phan =>
          setBienBan(bb => {
            if (!bb) return bb;
            const chot = { ...bb.diemChot };
            const cn = { ...bb.chamNguong };
            (Object.keys(phan) as MaThanhTo[]).forEach(ma => {
              chot[ma] = phan[ma]!.diem;
              if (phan[ma]!.chamNguong) cn[ma] = phan[ma]!.chamNguong;
            });
            return { ...bb, ketQua: { ...bb.ketQua, ...phan }, diemChot: chot, chamNguong: cn };
          }),
      });
      setHong(h);
      if (h.length) setThongBao(`Chưa chấm được: ${h.join(', ')}. Bấm phân tích lại để thử riêng các mục này.`);
      else if (Object.keys(ketQua).length) setThongBao('Đã phân tích xong. Điểm dưới đây là ĐỀ XUẤT — bạn là người chốt.');
    });

  const gopY = () =>
    chay('Đang soạn góp ý…', async () => {
      if (!bienBan) return;
      if (!canGopY.length) throw new Error('Không có thành tố nào dưới 3 điểm. Chưa cần góp ý cải thiện.');
      const g = await soanGopY(bienBan, canGopY, caiDat(), setDangChay);
      doi({ gopY: { ...bienBan.gopY, ...g } });
      setThongBao('Đã soạn góp ý. Chọn 1–2 mục làm trọng tâm cho buổi trao đổi.');
    });

  const nhanXet = () =>
    chay('Đang soạn nhận xét…', async () => {
      if (!bienBan) return;
      doi({ nhanXet: await soanNhanXet(bienBan, caiDat(), setDangChay) });
    });

  const luu = () =>
    chay('Đang lưu…', async () => {
      if (!bienBan || !user) return;
      if (thieu.length) {
        throw new Error(
          `Còn ${thieu.length} thành tố chấm điểm lẻ mà chưa ghi minh chứng chạm ngưỡng: ${thieu.map(t => t.ma).join(', ')}.`,
        );
      }
      const idMoi = await luuBienBan({ ...bienBan, userId: user.uid });
      setBienBan({ ...bienBan, id: idMoi, userId: user.uid });
      setThongBao('Đã lưu.');
      if (!id) navigate(`/du-gio/${idMoi}`, { replace: true });
    });

  const xuatExcel = () =>
    chay('Đang tạo file Excel…', async () => {
      if (!bienBan) return;
      const blob = await xuatTheoMau(bienBan);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = tenFileXuat(bienBan);
      a.click();
      URL.revokeObjectURL(a.href);
    });

  const napFile = (f: File) =>
    chay('Đang đọc file…', async () => {
      if (!user) return;
      const doc = docFileExcel(await f.arrayBuffer(), user.uid);
      setBienBan(bb => (bb ? { ...bb, ...doc, id: bb.id, userId: user.uid } : doc));
      setThongBao('Đã nạp nội dung từ file. Kiểm tra lại rồi bấm “Phân tích bằng AI”.');
    });

  /* ─────────── màn hình ─────────── */

  if (dangTaiAuth) return <Khung><p className="text-slate-500">Đang kiểm tra đăng nhập…</p></Khung>;

  if (!user) {
    return (
      <Khung>
        <h1 className="mb-2 text-2xl font-bold">Biên bản dự giờ</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Bạn cần đăng nhập bằng Google để lập biên bản. Biên bản của bạn chỉ mình bạn đọc, trừ khi bạn tự đưa lên thư viện.
        </p>
        <a href="/" className={`${NUT} mt-4 inline-block bg-indigo-600 text-white hover:bg-indigo-700`}>
          Về trang chính để đăng nhập
        </a>
      </Khung>
    );
  }

  if (!bienBan) {
    const ds = tab === 'toi' ? cuaToi : thuVien;
    return (
      <Khung>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Biên bản dự giờ</h1>
          <button
            onClick={() => setBienBan(bienBanRong(user.uid))}
            className={`${NUT} bg-indigo-600 text-white hover:bg-indigo-700`}
          >
            + Lập biên bản mới
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          {(['toi', 'thuvien'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`${NUT} ${tab === t ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {t === 'toi' ? `Của tôi (${cuaToi.length})` : `Thư viện chung (${thuVien.length})`}
            </button>
          ))}
        </div>

        {loi && <Hop mau="rose">{loi}</Hop>}

        {ds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-600">
            {tab === 'toi' ? 'Bạn chưa có biên bản nào.' : 'Chưa có biên bản nào được chia sẻ.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {ds.map(bb => (
              <li
                key={bb.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <button onClick={() => navigate(`/du-gio/${bb.id}`)} className="min-w-[14rem] flex-1 text-left">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {bb.gvHoTen || 'Chưa ghi tên giáo viên'} · {bb.bai || 'chưa ghi tên bài'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {bb.ngay} · lớp {bb.lop || '—'}
                    {bb.isPublic && <span className="ml-2 text-emerald-600">· đã chia sẻ</span>}
                  </p>
                </button>
                {tab === 'toi' && (
                  <button
                    onClick={async () => {
                      if (!confirm('Xoá biên bản này? Không khôi phục được.')) return;
                      await xoaBienBan(bb.id);
                      void taiDanhSach(user.uid);
                    }}
                    className={`${NUT} bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300`}
                  >
                    Xoá
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Khung>
    );
  }

  const meta: { khoa: keyof BienBanDuGio; nhan: string; kieu?: string }[] = [
    { khoa: 'gvHoTen', nhan: 'Giáo viên được dự giờ' },
    { khoa: 'lop', nhan: 'Lớp' },
    { khoa: 'tuan', nhan: 'Tuần' },
    { khoa: 'bai', nhan: 'Tên bài dạy' },
    { khoa: 'ngay', nhan: 'Ngày dự giờ', kieu: 'date' },
    { khoa: 'nguoiDu', nhan: 'Người dự giờ' },
    { khoa: 'namHocKy', nhan: 'Năm học & kỳ học' },
  ];

  return (
    <Khung>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate('/du-gio')} className="text-sm text-slate-500 hover:underline">
          ← Danh sách biên bản
        </button>
        {chiDoc && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            Biên bản của người khác · chỉ đọc
          </span>
        )}
      </div>

      {dangChay && <Hop mau="indigo">{dangChay}</Hop>}
      {loi && <Hop mau="rose">{loi}</Hop>}
      {thongBao && !loi && <Hop mau="emerald">{thongBao}</Hop>}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold">1 · Thông tin tiết dạy</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {meta.map(m => (
            <label key={m.khoa} className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">{m.nhan}</span>
              <input
                type={m.kieu || 'text'}
                value={String(bienBan[m.khoa] ?? '')}
                disabled={chiDoc}
                onChange={e => doi({ [m.khoa]: e.target.value } as Partial<BienBanDuGio>)}
                className={O}
              />
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">Bộ tiêu chí</span>
            <select
              value={bienBan.boTieuChi}
              disabled={chiDoc}
              onChange={e => doi({ boTieuChi: e.target.value as BienBanDuGio['boTieuChi'] })}
              className={O}
            >
              <option value="dugio">Dự giờ tiết dạy — 15 cấu phần (như mẫu trường)</option>
              <option value="daydu">Đầy đủ — 22 thành tố của khung</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={bienBan.isPublic}
              disabled={chiDoc}
              onChange={e => doi({ isPublic: e.target.checked })}
            />
            Đưa lên thư viện chung
          </label>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">2 · Ghi chép quan sát</h2>
          {!chiDoc && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                hidden
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) void napFile(f);
                  e.target.value = '';
                }}
              />
              <button onClick={() => fileRef.current?.click()} className={`${NUT} bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200`}>
                Tải file Excel đã ghi lên
              </button>
            </>
          )}
        </div>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Dùng HS1, HS2 thay cho tên thật của học sinh.
        </p>
        <BangQuanSat bienBan={bienBan} onDoi={doi} chiDoc={chiDoc} />

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {([
            ['bienBan', 'Ghi chép thêm (tự do)', 'Những gì không xếp vừa vào bảng trên.'],
            ['giaoAn', 'Giáo án / kế hoạch bài dạy', 'Dán vào đây thì mới chấm được Phần I.'],
            ['hoSo', 'Tự phản tư & hồ sơ', 'Dán vào đây thì mới chấm được Phần IV.'],
          ] as const).map(([khoa, nhan, goiY]) => (
            <label key={khoa} className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">{nhan}</span>
              <textarea
                value={bienBan[khoa]}
                disabled={chiDoc}
                rows={5}
                placeholder={goiY}
                onChange={e => doi({ [khoa]: e.target.value } as Partial<BienBanDuGio>)}
                className={O}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">3 · Chấm điểm</h2>
          {!chiDoc && (
            <div className="flex flex-wrap gap-2">
              <button onClick={phanTich} disabled={!!dangChay} className={`${NUT} bg-indigo-600 text-white hover:bg-indigo-700`}>
                Phân tích bằng AI
              </button>
              {hong.length > 0 && (
                <button
                  onClick={() => chay('Đang chấm lại…', async () => {
                    const { hong: h } = await phanTichBienBan(bienBan, caiDat(), {
                      chiCac: hong,
                      onTienDo: setDangChay,
                      onLo: phan => setBienBan(bb => (bb ? { ...bb, ketQua: { ...bb.ketQua, ...phan } } : bb)),
                    });
                    setHong(h);
                  })}
                  disabled={!!dangChay}
                  className={`${NUT} bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300`}
                >
                  Chấm lại {hong.length} mục hỏng
                </button>
              )}
            </div>
          )}
        </div>

        <Hop mau="slate">{CANH_BAO_DIEM_LE}</Hop>

        {diem && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Trung bình (thang 4)', soVN(diem.trungBinh)],
              ['Quy đổi thang 10', soVN(diem.thang10, 1)],
              ['Xếp loại', diem.xepLoai ?? '—'],
              ['Đã chấm', `${diem.soDaCham} / ${diem.tongThanhTo}`],
            ].map(([nhan, gt]) => (
              <div key={nhan} className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">{nhan}</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{gt}</p>
              </div>
            ))}
          </div>
        )}

        {thieu.length > 0 && (
          <Hop mau="rose">
            Còn {thieu.length} thành tố chấm điểm lẻ mà chưa ghi minh chứng chạm ngưỡng:{' '}
            {thieu.map(t => `${t.ma} (${soVN(t.diem, 1)})`).join(', ')}. Chưa lưu được.
          </Hop>
        )}

        <BangChamDiem bienBan={bienBan} onDoi={doi} chiDoc={chiDoc} />
      </section>

      {!chiDoc && (
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">4 · Chuẩn bị buổi trao đổi</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={gopY} disabled={!!dangChay || !canGopY.length} className={`${NUT} bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200`}>
                Soạn góp ý ({canGopY.length} mục dưới 3)
              </button>
              <button onClick={nhanXet} disabled={!!dangChay} className={`${NUT} bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200`}>
                Soạn nhận xét
              </button>
            </div>
          </div>

          <Hop mau="slate">{QUY_TAC_TINH_TIEN}</Hop>

          {canGopY.filter(ma => bienBan.gopY[ma]).length > 0 && (
            <div className="mb-4 space-y-2">
              {canGopY.filter(ma => bienBan.gopY[ma]).map(ma => {
                const g = bienBan.gopY[ma]!;
                const c = COMPONENTS.find(x => x.ma === ma)!;
                return (
                  <div key={ma} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={!!bienBan.trongTam[ma]}
                        onChange={e => doi({ trongTam: { ...bienBan.trongTam, [ma]: e.target.checked } })}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{ma} — {c.ten}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{g.hanChe}</p>
                        {g.cauHoiPhanTu && <p className="mt-1 text-sm italic text-indigo-700 dark:text-indigo-300">“{g.cauHoiPhanTu}”</p>}
                        {g.coTheLam.length > 0 && (
                          <ul className="mt-1 list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
                            {g.coTheLam.map((v, i) => <li key={i}>{v}</li>)}
                          </ul>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          )}

          {bienBan.nhanXet && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
              {bienBan.nhanXet.diemManh.length > 0 && (
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Điểm mạnh</p>
                  {bienBan.nhanXet.diemManh.map((d, i) => (
                    <p key={i} className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      <b>{d.tieuDe}</b> — “{d.bangChung}”. {d.yNghia}
                    </p>
                  ))}
                </div>
              )}
              {bienBan.nhanXet.trongTam && (
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">Trọng tâm cải thiện</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <b>{bienBan.nhanXet.trongTam.tieuDe}</b> — “{bienBan.nhanXet.trongTam.bangChung}”
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
                    {bienBan.nhanXet.trongTam.hanhDong.map((v, i) => <li key={i}>{v}</li>)}
                  </ul>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Dấu hiệu thành công: {bienBan.nhanXet.trongTam.doThanhCong}
                  </p>
                </div>
              )}
              {bienBan.nhanXet.cauHoiHuanLuyen.length > 0 && (
                <div>
                  <p className="font-semibold text-indigo-700 dark:text-indigo-300">Câu hỏi huấn luyện</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
                    {bienBan.nhanXet.cauHoiHuanLuyen.map((v, i) => <li key={i}>{v}</li>)}
                  </ul>
                </div>
              )}
              {bienBan.nhanXet.canLamRo.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">Cần làm rõ với giáo viên</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
                    {bienBan.nhanXet.canLamRo.map((v, i) => <li key={i}>{v}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-slate-200 bg-white/90 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        {!chiDoc && (
          <button onClick={luu} disabled={!!dangChay} className={`${NUT} bg-indigo-600 text-white hover:bg-indigo-700`}>
            Lưu biên bản
          </button>
        )}
        <button onClick={xuatExcel} disabled={!!dangChay} className={`${NUT} bg-emerald-600 text-white hover:bg-emerald-700`}>
          Xuất Excel theo mẫu trường
        </button>
      </div>
    </Khung>
  );
}

function Khung({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">{children}</div>
    </div>
  );
}

const MAU = {
  rose: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/50 dark:bg-rose-950/40 dark:text-rose-200',
  emerald: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-950/40 dark:text-emerald-200',
  indigo: 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-500/50 dark:bg-indigo-950/40 dark:text-indigo-200',
  slate: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function Hop({ mau, children }: { mau: keyof typeof MAU; children: React.ReactNode }) {
  return <div className={`mb-4 rounded-xl border p-3 text-sm ${MAU[mau]}`}>{children}</div>;
}

export default DuGioPage;
