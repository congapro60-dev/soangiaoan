/**
 * Chống dò PIN cho bot Zalo — KHÔNG khóa tài khoản (chủ dự án chốt 24/10):
 * sai thì báo sai và cho nhập lại. Chỉ có trần trượt để chặn brute-force.
 *
 * Trần: 20 lần thử / 60 phút / người gửi. Quá trần thì im lặng từ chối thêm,
 * hết cửa sổ trượt là thử lại được. 4 số = 10.000 khả năng → 20 lần/giờ cần
 * ~21 ngày liên tục mới dò hết, trong khi người thật gõ sai vài lần không bị gì.
 */

export const BOT_PIN_WINDOW_MS = 60 * 60_000;
export const BOT_PIN_USER_LIMIT = 20;
export const BOT_PIN_CLASS_LIMIT = 100;
export const STRANGER_COOLDOWN_MS = 5 * 60_000;

type GuardDoc = { attempts?: number[]; lastStrangerReplyAt?: string };
const ref = (db: FirebaseFirestore.Firestore, id: string) => db.collection('botPinAttempts').doc(id);
const expiry = (now: Date) => new Date(now.getTime() + BOT_PIN_WINDOW_MS);

/** Chỉ giữ các lần thử còn nằm trong cửa sổ trượt. */
const recent = (data: GuardDoc | undefined, now: Date): number[] => {
  const since = now.getTime() - BOT_PIN_WINDOW_MS;
  const attempts = Array.isArray(data?.attempts) ? data.attempts : [];
  return attempts.filter(at => typeof at === 'number' && at > since);
};

/** Số phút còn phải chờ = thời điểm lần thử cũ nhất rời khỏi cửa sổ. */
const minutesToWait = (attempts: number[], now: Date): number => {
  if (!attempts.length) return 0;
  const oldest = Math.min(...attempts);
  return Math.max(1, Math.ceil((oldest + BOT_PIN_WINDOW_MS - now.getTime()) / 60_000));
};

export interface BotPinGuardResult { allowed: boolean; minutes: number }

const evaluate = (attempts: number[], limit: number, now: Date): BotPinGuardResult =>
  attempts.length < limit ? { allowed: true, minutes: 0 } : { allowed: false, minutes: minutesToWait(attempts, now) };

export const checkBotPinGuard = async (db: FirebaseFirestore.Firestore, botId: string, userId: string, now = new Date(), classId?: string): Promise<BotPinGuardResult> => {
  const snap = await ref(db, `${botId}_${userId}`).get();
  const userResult = evaluate(recent(snap.data() as GuardDoc | undefined, now), BOT_PIN_USER_LIMIT, now);
  if (!userResult.allowed) return userResult;
  if (classId) {
    const classSnap = await ref(db, `class_${classId}`).get();
    return evaluate(recent(classSnap.data() as GuardDoc | undefined, now), BOT_PIN_CLASS_LIMIT, now);
  }
  return { allowed: true, minutes: 0 };
};

/** Ghi 1 lần thử vào cửa sổ trượt (atomic) và cho biết còn được thử hay không. */
export const recordBotPinFailure = async (db: FirebaseFirestore.Firestore, botId: string, userId: string, classId: string | undefined, now = new Date()): Promise<BotPinGuardResult> =>
  db.runTransaction(async tx => {
    const userRef = ref(db, `${botId}_${userId}`);
    const userSnap = await tx.get(userRef);
    const userCurrent = recent(userSnap.data() as GuardDoc | undefined, now);
    const classRef = classId ? ref(db, `class_${classId}`) : undefined;
    const classSnap = classRef ? await tx.get(classRef) : undefined;
    const classCurrent = recent(classSnap?.data() as GuardDoc | undefined, now);

    const userBlocked = evaluate(userCurrent, BOT_PIN_USER_LIMIT, now);
    const classBlocked = evaluate(classCurrent, BOT_PIN_CLASS_LIMIT, now);
    if (!userBlocked.allowed || !classBlocked.allowed) return { allowed: false, minutes: Math.max(userBlocked.minutes, classBlocked.minutes) };

    // Lượt này ĐƯỢC phép (đã kiểm trước khi ghi) — trả allowed:true kể cả khi vừa chạm đúng trần.
    const userNext = [...userCurrent, now.getTime()];
    tx.set(userRef, { attempts: userNext, expiresAt: expiry(now), updatedAt: now.toISOString() }, { merge: true });
    if (classRef) tx.set(classRef, { attempts: [...classCurrent, now.getTime()], expiresAt: expiry(now), updatedAt: now.toISOString() }, { merge: true });
    return { allowed: true, minutes: 0 };
  });

/** Link thành công không phải lần sai — hoàn lại đúng 1 lượt vừa tiêu ở cả 2 cửa sổ. */
export const refundBotPinAttempt = async (db: FirebaseFirestore.Firestore, botId: string, userId: string, classId: string | undefined, now = new Date()): Promise<void> => {
  const pop = (value: unknown): number[] => { const list = recent({ attempts: value as number[] }, now); return list.length ? list.slice(0, -1) : list; };
  await db.runTransaction(async tx => {
    const userRef = ref(db, `${botId}_${userId}`);
    const classRef = classId ? ref(db, `class_${classId}`) : undefined;
    // Đọc HẾT trước khi ghi (Firestore cấm read-after-write).
    const userSnap = await tx.get(userRef);
    const classSnap = classRef ? await tx.get(classRef) : undefined;
    tx.set(userRef, { attempts: pop((userSnap.data() as GuardDoc | undefined)?.attempts), updatedAt: now.toISOString() }, { merge: true });
    if (classRef) tx.set(classRef, { attempts: pop((classSnap?.data() as GuardDoc | undefined)?.attempts), updatedAt: now.toISOString() }, { merge: true });
  });
};

/** Test helper: xoá counter nhưng giữ mốc cooldown hướng dẫn người lạ. */
export const resetBotPinGuard = async (db: FirebaseFirestore.Firestore, botId: string, userId: string, now = new Date()): Promise<void> => {
  const target = ref(db, `${botId}_${userId}`);
  await db.runTransaction(async tx => {
    const snap = await tx.get(target);
    const old = (snap.exists ? snap.data() : {}) as GuardDoc;
    tx.set(target, { attempts: [], expiresAt: expiry(now), updatedAt: now.toISOString(), ...(old.lastStrangerReplyAt ? { lastStrangerReplyAt: old.lastStrangerReplyAt } : {}) }, { merge: true });
  });
};

/** Gửi đúng 1 câu hướng dẫn mỗi 5 phút với người chưa liên kết; còn lại im lặng. */
export const canReplyToStranger = async (db: FirebaseFirestore.Firestore, botId: string, userId: string, now = new Date()): Promise<boolean> => {
  const target = ref(db, `${botId}_${userId}`);
  let allowed = false;
  await db.runTransaction(async tx => {
    const snap = await tx.get(target); const old = (snap.exists ? snap.data() : {}) as GuardDoc;
    const last = old.lastStrangerReplyAt ? new Date(old.lastStrangerReplyAt).getTime() : 0;
    allowed = now.getTime() - last >= STRANGER_COOLDOWN_MS;
    if (allowed) tx.set(target, { lastStrangerReplyAt: now.toISOString(), expiresAt: expiry(now) }, { merge: true });
  });
  return allowed;
};
