const liveStatuses = new Set(['requested', 'active']);
const helpPhases = new Set(['experience', 'guided', 'formation', 'practice']);
function history(state) { return state.tutors?.history || []; }
function busy(state, id) { return history(state).some(pair => liveStatuses.has(pair.status) && [pair.tutorId, pair.recipientId].includes(id)); }
function availableTasks(state, id) {
 const activity = state.package?.activities?.[state.timeline?.activityIndex];
 if (!activity) return [];
 const branch = state.branches?.[activity.id]?.[id] || 'core';
 return state.package.tasks.filter(task => activity.taskIds.includes(task.id) && task.participation === 'individual' && task.type !== 'reflection' && (!task.branch || task.branch === 'shared' || task.branch === branch));
}
function independentDone(state, id, taskId) {
 return !state.passports[id]?.supportHistory?.some(hint=>hint.taskId===taskId) && Object.values(state.submissions).some(sub => sub.learnerId === id && sub.taskId === taskId && sub.assessmentStatus === 'assessed' && sub.ok && !sub.assisted && !sub.source && !state.reveals[taskId]?.revealed);
}
function helpAvailable(state) {
 return state.mode === 'live' && state.status === 'active' && !state.timeline.locked && state.clock.arenaPausedAt == null && state.clock.classEventPausedAt == null && (state.clock.activityDeadline == null || state.clock.lastNow < state.clock.activityDeadline) && helpPhases.has(state.timeline.currentPhase);
}
function eligible(state, id) {
 const tasks = availableTasks(state, id);
 return helpAvailable(state) && tasks.length > 0 && tasks.every(task => independentDone(state, id, task.id)) && !busy(state, id);
}
function candidateTasks(state, id) { return availableTasks(state, id).filter(task => !independentDone(state, id, task.id)); }
function isCandidate(state, id) {
 return state.roster[id]?.present !== false && Boolean(state.roster[id]) && state.tutors?.needs?.[id] === state.timeline.currentActivityId && candidateTasks(state, id).length > 0 && !busy(state, id);
}
function revokeReward(state, pair, now) {
 pair.status='reward_revoked';pair.revokedAt=now;
 const ledger=state.rewardLedger[`${state.id}:${state.round}:tutor:${pair.activityId}:${pair.recipientId}`];
 if(ledger?.active){ledger.active=false;state.gameWallets.learners[pair.tutorId].bonus=Math.max(0,state.gameWallets.learners[pair.tutorId].bonus-1);}
 const badge=state.passports[pair.tutorId].tutorHistory?.find(item=>item.id===pair.id);if(badge)badge.revokedAt=now;
}

export function tutorCommand(state, event, actor, now) {
 const {type} = event, payload = event.payload || {}, pairs = history(state);
 if (type === 'TUTOR_NEED') {
  if (typeof payload.needed !== 'boolean') return 'INVALID_EVENT';
  if (!helpAvailable(state) || payload.needed && candidateTasks(state, actor.id).length === 0) return 'TUTOR_NOT_AVAILABLE';
  state.tutors ||= {needs:{},history:[]};
  if (payload.needed) state.tutors.needs[actor.id] = state.timeline.currentActivityId;
  else {
   delete state.tutors.needs[actor.id];
   for (const pair of pairs) if (pair.recipientId === actor.id && liveStatuses.has(pair.status)) { pair.status = 'cancelled'; pair.endedAt = now; }
  }
  return null;
 }
 if (type === 'TUTOR_REQUEST') {
  const recipientId = payload.recipientId;
  if (typeof recipientId !== 'string' || actor.id === recipientId || !eligible(state, actor.id) || !isCandidate(state, recipientId)) return 'TUTOR_NOT_AVAILABLE';
  // ponytail: preserve at most 900 audit records; move audit to durable storage before larger sessions.
  if (pairs.length >= 900 || pairs.filter(pair => pair.tutorId === actor.id && pair.activityId === state.timeline.currentActivityId).length >= 3 || pairs.some(pair => pair.tutorId === actor.id && pair.recipientId === recipientId && pair.activityId === state.timeline.currentActivityId)) return 'TUTOR_LIMIT';
  const tasks = candidateTasks(state, recipientId), ownObjectives = new Set(availableTasks(state, actor.id).flatMap(task => task.objectiveIds || []));
  const taskIds = tasks.filter(task => (task.objectiveIds || []).some(id => ownObjectives.has(id))).map(task => task.id);
  if (!taskIds.length) return 'TUTOR_NOT_AVAILABLE';
  state.tutors.history.push({id:`tutor-${state.round}-${state.revision+1}`,tutorId:actor.id,recipientId,activityId:state.timeline.currentActivityId,branch:state.branches[state.timeline.currentActivityId]?.[recipientId] || 'core',taskIds,status:'requested',requestedAt:now});
  return null;
 }
 const pair = pairs.find(pair => pair.id === payload.requestId);
 if (!pair || !liveStatuses.has(pair.status) && !(type === 'TUTOR_REVOKE' && ['awaiting_recheck','rewarded'].includes(pair.status))) return 'TUTOR_NOT_AVAILABLE';
 if (type === 'TUTOR_REVOKE') {
  if(pair.status==='rewarded')revokeReward(state,pair,now);else pair.status='revoked';
  pair.revokedBy=actor.id;pair.endedAt=now;return null;
 }
 if (pair.activityId !== state.timeline.currentActivityId || !helpAvailable(state)) return 'TUTOR_NOT_AVAILABLE';
 if (type === 'TUTOR_RESPOND') {
  if (actor.id !== pair.recipientId || pair.status !== 'requested') return 'TUTOR_NOT_AVAILABLE';
  if (typeof payload.accept !== 'boolean') return 'INVALID_EVENT';
  if (payload.accept && (!state.roster[pair.tutorId]?.present || !isCandidateIgnoringPair(state, pair.recipientId))) return 'TUTOR_NOT_AVAILABLE';
  pair.status = payload.accept ? 'active' : 'rejected';
  if (payload.accept) {
   pair.acceptedAt = now;
   const pending=Object.values(state.submissions).filter(sub=>sub.learnerId===pair.recipientId&&pair.taskIds.includes(sub.taskId)&&sub.assessmentStatus==='pending');
   for(const sub of pending){sub.assisted=true;const record=state.passports[pair.recipientId].submissions.find(item=>item.submissionId===sub.submissionId);if(record)record.assisted=true;}
  } else pair.endedAt = now;
  return null;
 }
 if (type === 'TUTOR_END') {
  if (![pair.tutorId,pair.recipientId].includes(actor.id)) return 'TUTOR_NOT_AVAILABLE';
  pair.status = pair.status === 'active' ? 'awaiting_recheck' : 'cancelled'; pair.endedAt = now; return null;
 }
 return 'INVALID_EVENT';
}
function isCandidateIgnoringPair(state, id) {
 return state.tutors.needs[id] === state.timeline.currentActivityId && candidateTasks(state,id).length > 0;
}
export function tutorAssisted(state, id, taskId) {
 return history(state).some(pair => pair.recipientId === id && pair.acceptedAt != null && pair.taskIds.includes(taskId));
}

export function updateTutors(state, event, now, submissionId) {
 const pairs = history(state);
 for (const pair of pairs) {
  if (liveStatuses.has(pair.status) && pair.activityId === state.timeline.currentActivityId && pair.branch && pair.branch !== (state.branches[pair.activityId]?.[pair.recipientId] || 'core')) {
   pair.status=pair.status==='active'?'awaiting_recheck':'cancelled';pair.endedAt=now;
  }
  if (pair.status === 'rewarded') {
   const checked = state.submissions[pair.recheckSubmissionId];
   if (!checked?.ok || checked.assisted || state.reveals[checked.taskId]?.revealed || state.passports[checked.learnerId]?.supportHistory?.some(hint=>hint.taskId===checked.taskId)) {
    revokeReward(state,pair,now);
   }
  }
  if (liveStatuses.has(pair.status) && (pair.activityId !== state.timeline.currentActivityId || state.status === 'concluded' || !state.roster[pair.tutorId]?.present || !state.roster[pair.recipientId]?.present)) {
   pair.status = pair.status === 'active' && state.status !== 'concluded' && state.roster[pair.tutorId]?.present && state.roster[pair.recipientId]?.present ? 'awaiting_recheck' : 'expired'; pair.endedAt = now;
  }
  if (state.status === 'concluded' && pair.status === 'awaiting_recheck') { pair.status = 'expired'; pair.endedAt = now; }
 }
 if (!['SUBMIT','ASSESS'].includes(event.type)) return;
 const sub = state.submissions[submissionId], task = state.package.tasks.find(task => task.id === sub?.taskId);
 if (!sub || !task || sub.source || sub.assisted || !sub.ok || sub.assessmentStatus !== 'assessed' || state.reveals[sub.taskId]?.revealed || state.passports[sub.learnerId]?.supportHistory?.some(hint=>hint.taskId===sub.taskId) || task.participation !== 'individual') return;
 const rules = state.package.evidenceRules.filter(rule => rule.taskId === sub.taskId && rule.kind === 'individual_recheck' && rule.individual && rule.countsForMastery);
 if (!rules.length) return;
 for (const pair of pairs) {
  if (pair.status !== 'awaiting_recheck' || pair.recipientId !== sub.learnerId || pair.taskIds.includes(sub.taskId) || sub.at <= pair.acceptedAt) continue;
  const objectives = new Set(state.package.tasks.filter(task => pair.taskIds.includes(task.id)).flatMap(task => task.objectiveIds || []));
  if (!rules.some(rule => rule.objectiveIds.some(id => objectives.has(id)))) continue;
  const key = `${state.id}:${state.round}:tutor:${pair.activityId}:${pair.recipientId}`;
  if (state.rewardLedger[key]) continue;
  pair.status = 'rewarded'; pair.recheckSubmissionId = sub.submissionId; pair.rewardedAt = now;
  state.rewardLedger[key] = {amount:1,recipientType:'learner',recipientId:pair.tutorId,submissionId:sub.submissionId,active:true,kind:'tutor'};
  state.gameWallets.learners[pair.tutorId].bonus += 1;
  const passport = state.passports[pair.tutorId]; passport.tutorHistory ||= [];
  passport.tutorHistory.push({id:pair.id,recipientName:state.roster[pair.recipientId].name,activityId:pair.activityId,recheckSubmissionId:sub.submissionId,at:now});
  break;
 }
}

export function studentTutorView(state, id) {
 const pairs=history(state), own = pairs.filter(pair => [pair.tutorId,pair.recipientId].includes(id)), pair=own.find(pair => liveStatuses.has(pair.status)) || null;
 const hints=[];
 if (pair?.status === 'active' && pair.tutorId === id && pair.activityId === state.timeline.currentActivityId && helpAvailable(state)) {
  for (const task of availableTasks(state,pair.recipientId).filter(task=>pair.taskIds.includes(task.id))) for (const hint of state.package.hints || []) {
   if (hint.notAnswer === true && (hint.taskId === task.id || hint.targetTaskId === task.id || task.hintIds?.includes(hint.id))) hints.push({id:hint.id,taskId:task.id,prompt:task.prompt,text:hint.text || hint.prompt || ''});
  }
 }
 const project = pair => ({id:pair.id,activityId:pair.activityId,status:pair.status,role:pair.tutorId===id?'tutor':'recipient',peerName:state.roster[pair.tutorId===id?pair.recipientId:pair.tutorId]?.name || 'Bạn',requestedAt:pair.requestedAt,acceptedAt:pair.acceptedAt,endedAt:pair.endedAt,rewardedAt:pair.rewardedAt});
 return {available:helpAvailable(state),eligible:eligible(state,id),needed:Boolean(state.tutors?.needs?.[id]&&state.tutors.needs[id]===state.timeline?.currentActivityId),candidates:eligible(state,id)?Object.values(state.roster).filter(peer=>peer.id!==id&&isCandidate(state,peer.id)).map(peer=>({id:peer.id,name:peer.name})):[],pair:pair?project(pair):null,hints,history:own.map(project),stars:own.filter(pair=>pair.status==='rewarded'&&pair.tutorId===id).length};
}
