import {auditPayload, shouldAudit} from './access-control.js';

export function claimRoomStatements(prepare, {roomId, ownerAccountId, expectedAdminHash, rotatedAdminHash, actorAccountId, revision, auditId, now, payload = {}}) {
  const safePayload = JSON.stringify(auditPayload(payload));
  return [
    prepare('UPDATE rooms SET owner_account_id=?, admin_hash=?, revision=revision+1 WHERE id=? AND admin_hash=? AND owner_account_id IS NULL AND revision=? AND deleted_at IS NULL', ownerAccountId, rotatedAdminHash, roomId, expectedAdminHash, revision),
    prepare('INSERT INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM rooms WHERE id=? AND owner_account_id=? AND revision=?)', auditId, actorAccountId, roomId, 'claim-room', safePayload, now, roomId, ownerAccountId, revision + 1),
  ];
}

export function auditAfterMutation(prepare, result, {id, actorAccountId, roomId, action, payload = {}, now}) {
  if (!shouldAudit(result)) return null;
  return prepare('INSERT INTO admin_audit(id,actor_account_id,room_id,action,payload,created_at) VALUES (?,?,?,?,?,?)', id, actorAccountId, roomId, action, JSON.stringify(auditPayload(payload)), now);
}
