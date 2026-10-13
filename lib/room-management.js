// A room control token keeps every statement in a D1 batch tied to the
// revision that the teacher confirmed, including concurrent student requests.
export const RESET_TEAMS_SQL = `UPDATE teams SET data = json_set(data,
  '$.version',1,'$.seed',abs(random() % 4294967296),'$.start',NULL,'$.end',NULL,
  '$.status','waiting','$.solved',json('[]'),'$.hints',json('[[],[],[],[],[]]'),
  '$.wrong',0,'$.penalty',0,'$.cooldown',0,'$.drafts',json('{}'),
  '$.events',json('[]'),'$.stage',0,'$.levels',json('[null,null,null,null,null]'),
  '$.score',0,'$.requestCache',json('{}'),'$.submissions',json('[]'),
  '$.recovery',NULL,'$.recoveryHistory',json('[]'),'$.eventHistory',json('[]'),'$.questionSeeds',json('{}'),
  '$.race',NULL,'$.effects',NULL,'$.round',(SELECT round FROM rooms WHERE id=?)),
  revision=revision+1 WHERE room_id=? AND removed_at IS NULL
  AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND control_key=? AND deleted_at IS NULL)`;

export function managementStatements(prepare,kind,{roomId,revision,requestId,teamId,now,authorization={sql:'1=1',args:[]}}) {
  if(kind==='reset-room')return [
    prepare("UPDATE rooms SET mode='race',race=NULL,started=NULL,round=round+1,revision=revision+1,control_key=? WHERE id=? AND revision=? AND deleted_at IS NULL",requestId,roomId,revision),
    prepare('DELETE FROM skill_actions WHERE room_id=? AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND control_key=? AND deleted_at IS NULL)',roomId,roomId,requestId),
    prepare(RESET_TEAMS_SQL,roomId,roomId,roomId,requestId)
  ];
  if(kind==='delete-room')return [prepare(`UPDATE rooms SET deleted_at=?,revision=revision+1,control_key=? WHERE id=? AND revision=? AND deleted_at IS NULL AND ${authorization.sql}`,now,requestId,roomId,revision,...authorization.args)];
  if(kind==='remove-team')return [
    prepare(`UPDATE rooms SET revision=revision+1,control_key=? WHERE id=? AND revision=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM teams WHERE id=? AND room_id=? AND removed_at IS NULL) AND ${authorization.sql}`,requestId,roomId,revision,teamId,roomId,...authorization.args),
    prepare('UPDATE teams SET removed_at=?,revision=revision+1 WHERE id=? AND room_id=? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND control_key=? AND deleted_at IS NULL)',now,teamId,roomId,roomId,requestId)
  ];
  throw Error('Unknown room operation');
}
