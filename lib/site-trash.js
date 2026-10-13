export function createSiteTrashService({db}) {
  const q = (sql, ...args) => db.prepare(sql).bind(...args);
  return {
    async list({ownerAccountId, offset = 0}) {
      if (!ownerAccountId) throw Error('AUTH_REQUIRED');
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw Error('INVALID_QUERY');
      const {results} = await q(`SELECT * FROM (
        SELECT t.kind,t.object_id AS id,t.deleted_at AS deletedAt,COALESCE(json_extract(t.data,'$.title'),t.kind) AS title FROM site_trash t WHERE t.owner_account_id=? AND json_extract(t.data,'$.parentId') IS NULL
        UNION ALL
        SELECT d.kind,d.object_id AS id,d.deleted_at AS deletedAt,
          CASE d.kind WHEN 'package' THEN p.package_id || ' · ' || p.version WHEN 'source' THEN s.original_name WHEN 'job' THEN j.model || ' · ' || j.id WHEN 'plan' THEN 'Kịch bản ' || sp.package_version ELSE d.kind END AS title
        FROM lesson_content_deletions d
        LEFT JOIN lesson_packages p ON d.kind='package' AND p.row_id=d.object_id AND p.owner_account_id=d.owner_account_id
        LEFT JOIN lesson_sources s ON d.kind='source' AND s.id=d.object_id AND s.owner_account_id=d.owner_account_id
        LEFT JOIN lesson_generation_jobs j ON d.kind='job' AND j.id=d.object_id AND j.owner_account_id=d.owner_account_id
        LEFT JOIN lesson_session_plans sp ON d.kind='plan' AND sp.row_id=d.object_id AND sp.owner_account_id=d.owner_account_id
        WHERE d.owner_account_id=?
      ) ORDER BY deletedAt DESC,kind,id LIMIT 51 OFFSET ?`,ownerAccountId,ownerAccountId,offset).all();
      return {items:results.slice(0,50),nextOffset:results.length > 50 ? offset + 50 : null};
    },
    async restoreTeam({ownerAccountId, id, isRoot = false}) {
      if (!ownerAccountId) throw Error('AUTH_REQUIRED');
      const item=await q("SELECT x.*,t.room_id,t.name_key,t.revision AS team_revision,r.revision AS room_revision,r.owner_account_id AS room_owner FROM site_trash x JOIN teams t ON t.id=x.object_id JOIN rooms r ON r.id=t.room_id WHERE x.kind='game-team' AND x.object_id=? AND x.owner_account_id=? AND t.removed_at=x.deleted_at AND r.deleted_at IS NULL",id,ownerAccountId).first();
      if(!item)throw Error('NOT_FOUND');
      const data=JSON.parse(item.data);if(data.roomRevision!==item.room_revision)throw Error('RESTORE_CONFLICT');
      const membership=await q("SELECT role FROM room_memberships WHERE room_id=? AND account_id=? AND role IN ('owner','cohost') AND revoked_at IS NULL",item.room_id,ownerAccountId).first();
      if(!isRoot&&item.room_owner!==ownerAccountId&&!membership)throw Error('FORBIDDEN');
      const nonce=crypto.randomUUID();
      const guard="EXISTS(SELECT 1 FROM site_trash x WHERE x.kind='game-team' AND x.object_id=? AND x.owner_account_id=? AND x.deleted_at=?) AND NOT EXISTS(SELECT 1 FROM teams other WHERE other.room_id=rooms.id AND other.name_key=? AND other.removed_at IS NULL) AND (?=1 OR ((owner_account_id=? OR EXISTS(SELECT 1 FROM room_memberships WHERE room_id=rooms.id AND account_id=? AND role IN ('owner','cohost') AND revoked_at IS NULL)) AND NOT EXISTS(SELECT 1 FROM system_hosts WHERE account_id=? AND revoked_at IS NOT NULL)))";
      const results=await db.batch([
        q(`UPDATE rooms SET race=?,revision=revision+1,control_key=? WHERE id=? AND deleted_at IS NULL AND revision=? AND EXISTS(SELECT 1 FROM teams WHERE id=? AND room_id=rooms.id AND removed_at=? AND revision=?) AND ${guard}`,data.race,nonce,item.room_id,item.room_revision,id,item.deleted_at,item.team_revision,id,ownerAccountId,item.deleted_at,item.name_key,isRoot?1:0,ownerAccountId,ownerAccountId,ownerAccountId),
        q('UPDATE teams SET removed_at=NULL,revision=revision+1 WHERE id=? AND removed_at=? AND revision=? AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND control_key=?)',id,item.deleted_at,item.team_revision,item.room_id,nonce),
        q("DELETE FROM site_trash WHERE kind='game-team' AND object_id=? AND owner_account_id=? AND deleted_at=? AND data=? AND EXISTS(SELECT 1 FROM teams t JOIN rooms r ON r.id=t.room_id WHERE t.id=? AND t.removed_at IS NULL AND r.control_key=?)",id,ownerAccountId,item.deleted_at,item.data,id,nonce)
      ]);
      if(results.some(result=>Number(result.meta?.changes)!==1))throw Error('RESTORE_CONFLICT');return {ok:true};
    },
    async restoreRoom({ownerAccountId, id, isRoot = false}) {
      if (!ownerAccountId) throw Error('AUTH_REQUIRED');
      const item = await q("SELECT t.*,r.revision,r.owner_account_id AS room_owner FROM site_trash t JOIN rooms r ON r.id=t.object_id WHERE t.kind='room' AND t.object_id=? AND t.owner_account_id=? AND r.deleted_at=t.deleted_at",id,ownerAccountId).first();
      if (!item) throw Error('NOT_FOUND');
      const membership=await q("SELECT role FROM room_memberships WHERE room_id=? AND account_id=? AND role='owner' AND revoked_at IS NULL",id,ownerAccountId).first();
      if (!isRoot && item.room_owner !== ownerAccountId && !membership) throw Error('FORBIDDEN');
      const data = JSON.parse(item.data);
      if (data.revision !== item.revision) throw Error('RESTORE_CONFLICT');
      const key = crypto.randomUUID();
      const restored = await db.batch([
        q("UPDATE rooms SET deleted_at=NULL,revision=revision+1,control_key=? WHERE id=? AND deleted_at=? AND revision=? AND EXISTS(SELECT 1 FROM site_trash WHERE kind='room' AND object_id=rooms.id AND owner_account_id=? AND deleted_at=?) AND (?=1 OR ((owner_account_id=? OR EXISTS(SELECT 1 FROM room_memberships WHERE room_id=rooms.id AND account_id=? AND role='owner' AND revoked_at IS NULL)) AND NOT EXISTS(SELECT 1 FROM system_hosts WHERE account_id=? AND revoked_at IS NOT NULL)))",key,id,item.deleted_at,item.revision,ownerAccountId,item.deleted_at,isRoot?1:0,ownerAccountId,ownerAccountId,ownerAccountId),
        q("DELETE FROM site_trash WHERE kind='room' AND object_id=? AND owner_account_id=? AND deleted_at=? AND data=? AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND deleted_at IS NULL AND control_key=?)",id,ownerAccountId,item.deleted_at,item.data,id,key)
      ]);
      if (restored.some(result => Number(result.meta?.changes) !== 1)) throw Error('RESTORE_CONFLICT');
      return {ok:true};
    }
  };
}
