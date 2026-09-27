import type { ClassDoc, ClassMemberDoc, ClassTeacherRole, ClassTeacherStatus } from '../src/lib/classroom/types.js';

export interface ClassAccessMember {
  uid: string;
  role: ClassTeacherRole;
  status: ClassTeacherStatus;
}

export interface ClassAccess {
  uid: string;
  ownerId: string;
  originalOwnerId: string;
  role: ClassTeacherRole;
  isOwner: boolean;
  isOriginalOwner: boolean;
  canOperate: true;
  canManageMembers: boolean;
}

const nonEmpty = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

/** Quyền thuần túy, dùng chung cho API và test để không lẫn legacy owner với member mới. */
export const deriveClassAccess = (
  classData: Partial<ClassDoc>,
  member: ClassAccessMember | undefined,
  uid: string,
): ClassAccess | null => {
  const normalizedUid = nonEmpty(uid);
  const ownerId = nonEmpty(classData.ownerId) || nonEmpty(classData.teacherId);
  const originalOwnerId = nonEmpty(classData.originalOwnerId) || nonEmpty(classData.teacherId) || ownerId;
  if (!normalizedUid || !ownerId) return null;

  const isOwner = normalizedUid === ownerId;
  const isOriginalOwner = normalizedUid === originalOwnerId;
  const isLegacyOwner = isOwner && (!member || member.status === 'active');
  const isActiveMember = Boolean(member && member.uid === normalizedUid && member.status === 'active');
  if (!isLegacyOwner && !isActiveMember) return null;

  const role: ClassTeacherRole = isOwner ? 'owner' : member?.role === 'owner' ? 'co_owner' : (member?.role || 'co_owner');
  return {
    uid: normalizedUid,
    ownerId,
    originalOwnerId,
    role,
    isOwner,
    isOriginalOwner,
    canOperate: true,
    canManageMembers: isOwner || isOriginalOwner,
  };
};

export const canRemoveClassMember = (access: ClassAccess, targetUid: string): boolean => {
  const target = nonEmpty(targetUid);
  return access.canManageMembers
    && target.length > 0
    && target !== access.ownerId
    && target !== access.originalOwnerId
    && target !== access.uid;
};

export const canLeaveClass = (access: ClassAccess, anotherOwnerRemains: boolean): boolean =>
  access.role === 'co_owner' && !access.isOwner && anotherOwnerRemains;

export const normalizeTeacherEmail = (value: unknown): string =>
  nonEmpty(value).normalize('NFKC').toLocaleLowerCase('en-US');

export const classMemberId = (classId: string, uid: string): string =>
  `${encodeURIComponent(classId)}__${encodeURIComponent(uid)}`;

export const memberFromData = (data: FirebaseFirestore.DocumentData | undefined): ClassAccessMember | undefined => {
  if (!data || typeof data.uid !== 'string' || typeof data.role !== 'string') return undefined;
  if (!['owner', 'co_owner'].includes(data.role) || !['active', 'removed'].includes(data.status)) return undefined;
  return { uid: data.uid, role: data.role as ClassTeacherRole, status: data.status as ClassTeacherStatus };
};

/** Đọc quyền từ server; Admin SDK gọi helper này trước mọi thao tác teacher. */
export const readClassAccess = async (
  db: FirebaseFirestore.Firestore,
  classId: string,
  uid: string,
): Promise<{ ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData; access: ClassAccess } | null> => {
  const ref = db.collection('classes').doc(classId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  const memberRef = db.collection('classMembers').doc(classMemberId(classId, uid));
  const memberSnapshot = await memberRef.get();
  const access = deriveClassAccess(data as Partial<ClassDoc>, memberFromData(memberSnapshot.exists ? memberSnapshot.data() : undefined), uid);
  return access ? { ref, data, access } : null;
};

/**
 * Cho phép giáo viên thao tác trên namespace legacy của lớp mà không đổi teacherId cũ.
 * Đây là cổng dùng chung cho cả classroom API và các luồng AI chấm bài.
 */
export const canTeacherAccessLegacyNamespace = async (
  db: FirebaseFirestore.Firestore,
  uid: string,
  classId: unknown,
  legacyTeacherId: unknown,
): Promise<boolean> => {
  const normalizedClassId = nonEmpty(classId);
  const legacyUid = nonEmpty(legacyTeacherId);
  if (!normalizedClassId) return legacyUid === nonEmpty(uid);
  const classAccess = await readClassAccess(db, normalizedClassId, uid);
  // Giữ hành vi tương thích cho bài legacy mồ côi không còn document lớp.
  return classAccess ? classAccess.data.teacherId === legacyUid : legacyUid === nonEmpty(uid);
};

export const memberDoc = (classId: string, uid: string, fields: Omit<ClassMemberDoc, 'id'>): ClassMemberDoc => ({
  id: classMemberId(classId, uid),
  ...fields,
});
