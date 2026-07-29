/**
 * Đọc/ghi biên bản dự giờ trên Firestore.
 *
 * Mô hình sở hữu giống lessonPlans: mỗi người tự lập biên bản của mình, chỉ
 * mình đọc; bật isPublic thì đưa lên thư viện chung.
 *
 * LƯU Ý cho người sửa sau: firestore.rules KHÔNG cho `list` không lọc. Mọi
 * truy vấn phải kèm where('userId','==',uid) hoặc where('isPublic','==',true),
 * nếu không sẽ nhận permission-denied — đó là rules đúng, không phải lỗi.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, removeUndefinedFields } from '../firebase';
import type { BienBanDuGio } from './types';
import { bienBanRong } from './types';

const COLL = 'duGio';
const GIOI_HAN = 200;

/** Firestore không nhận undefined; các map con cũng phải sạch trước khi ghi. */
function chuanBiGhi(bb: BienBanDuGio) {
  const { id: _bo, ...phanConLai } = bb;
  return removeUndefinedFields({
    ...phanConLai,
    updatedAt: new Date().toISOString(),
    capNhatLuc: serverTimestamp(),
  });
}

function tuDoc(id: string, d: Record<string, unknown>): BienBanDuGio {
  const rong = bienBanRong(String(d.userId || ''));
  return {
    ...rong,
    ...(d as Partial<BienBanDuGio>),
    id,
    // Các map có thể vắng ở document cũ — luôn trả về object để UI khỏi guard.
    ketQua: (d.ketQua as BienBanDuGio['ketQua']) || {},
    diemChot: (d.diemChot as BienBanDuGio['diemChot']) || {},
    daSua: (d.daSua as BienBanDuGio['daSua']) || {},
    chamNguong: (d.chamNguong as BienBanDuGio['chamNguong']) || {},
    gopY: (d.gopY as BienBanDuGio['gopY']) || {},
    trongTam: (d.trongTam as BienBanDuGio['trongTam']) || {},
    dongQuanSat: (d.dongQuanSat as BienBanDuGio['dongQuanSat']) || [],
    nhanXet: (d.nhanXet as BienBanDuGio['nhanXet']) ?? null,
  };
}

export async function luuBienBan(bb: BienBanDuGio): Promise<string> {
  if (bb.id) {
    await setDoc(doc(db, COLL, bb.id), chuanBiGhi(bb), { merge: true });
    return bb.id;
  }
  const ref = await addDoc(collection(db, COLL), {
    ...chuanBiGhi(bb),
    createdAt: new Date().toISOString(),
    taoLuc: serverTimestamp(),
  });
  return ref.id;
}

export async function xoaBienBan(id: string): Promise<void> {
  await deleteDoc(doc(db, COLL, id));
}

export async function docBienBan(id: string): Promise<BienBanDuGio | null> {
  const snap = await getDoc(doc(db, COLL, id));
  return snap.exists() ? tuDoc(snap.id, snap.data()) : null;
}

/** Biên bản của chính mình, mới nhất trước. */
export async function danhSachCuaToi(uid: string): Promise<BienBanDuGio[]> {
  const q = query(
    collection(db, COLL),
    where('userId', '==', uid),
    orderBy('ngay', 'desc'),
    limit(GIOI_HAN),
  );
  return (await getDocs(q)).docs.map(d => tuDoc(d.id, d.data()));
}

/** Biên bản đã chia sẻ lên thư viện chung. */
export async function danhSachThuVien(): Promise<BienBanDuGio[]> {
  const q = query(
    collection(db, COLL),
    where('isPublic', '==', true),
    orderBy('ngay', 'desc'),
    limit(GIOI_HAN),
  );
  return (await getDocs(q)).docs.map(d => tuDoc(d.id, d.data()));
}
