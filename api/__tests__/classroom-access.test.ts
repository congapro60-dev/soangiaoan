import { describe, expect, it } from 'vitest';
import {
  canLeaveClass,
  canRemoveClassMember,
  deriveClassAccess,
  type ClassAccessMember,
} from '../_classroom-access';

describe('classroom teacher access model', () => {
  const baseClass = {
    teacherId: 'teacher-root',
    ownerId: 'teacher-root',
    originalOwnerId: 'teacher-root',
  };

  it('keeps a legacy class owner-compatible before membership migration', () => {
    const access = deriveClassAccess({ teacherId: 'teacher-root' }, undefined, 'teacher-root');

    expect(access).toEqual(expect.objectContaining({
      uid: 'teacher-root',
      role: 'owner',
      isOwner: true,
      isOriginalOwner: true,
      canManageMembers: true,
    }));
  });

  it('allows an active co-owner to operate the class but not manage membership', () => {
    const member: ClassAccessMember = { uid: 'teacher-2', role: 'co_owner', status: 'active' };
    const access = deriveClassAccess(baseClass, member, 'teacher-2');

    expect(access).toEqual(expect.objectContaining({
      role: 'co_owner',
      isOwner: false,
      isOriginalOwner: false,
      canOperate: true,
      canManageMembers: false,
    }));
  });

  it('retains membership-management authority for the original owner after transfer', () => {
    const member: ClassAccessMember = { uid: 'teacher-root', role: 'co_owner', status: 'active' };
    const access = deriveClassAccess({
      teacherId: 'teacher-root',
      ownerId: 'teacher-2',
      originalOwnerId: 'teacher-root',
    }, member, 'teacher-root');

    expect(access).toEqual(expect.objectContaining({
      isOwner: false,
      isOriginalOwner: true,
      canManageMembers: true,
    }));
  });

  it('rejects a non-member and protects the current owner from removal', () => {
    expect(deriveClassAccess(baseClass, undefined, 'outsider')).toBeNull();
    expect(canRemoveClassMember(deriveClassAccess(baseClass, undefined, 'teacher-root')!, 'teacher-root')).toBe(false);
    expect(canRemoveClassMember(deriveClassAccess(baseClass, undefined, 'teacher-root')!, 'teacher-2')).toBe(true);
  });

  it('không cho chủ mới xóa chủ gốc sau khi đã chuyển quyền', () => {
    const currentOwner = deriveClassAccess({
      ...baseClass,
      ownerId: 'teacher-2',
      originalOwnerId: 'teacher-root',
    }, { uid: 'teacher-2', role: 'owner', status: 'active' }, 'teacher-2')!;

    expect(canRemoveClassMember(currentOwner, 'teacher-root')).toBe(false);
    expect(canRemoveClassMember(currentOwner, 'teacher-3')).toBe(true);
  });

  it('only lets a co-owner leave when another current owner remains', () => {
    const coOwner = deriveClassAccess(baseClass, { uid: 'teacher-2', role: 'co_owner', status: 'active' }, 'teacher-2')!;
    const owner = deriveClassAccess(baseClass, undefined, 'teacher-root')!;

    expect(canLeaveClass(coOwner, true)).toBe(true);
    expect(canLeaveClass(owner, true)).toBe(false);
    expect(canLeaveClass(coOwner, false)).toBe(false);
  });
});
