import { isSelfPaced } from './self-pace.js';

export function exitTaskIds(state, learnerId) {
  const tasks = new Map((state.package?.tasks || []).map(task => [task.id, task]));
  return new Set((state.package?.activities || []).filter(activity => activity.phase === 'exit').flatMap(activity => {
    const activityTasks = (activity.taskIds || []).map(id => tasks.get(id)).filter(Boolean);
    let branch = state.branches?.[activity.id]?.[learnerId] || 'core';
    if (isSelfPaced(state) && !activityTasks.some(task => !task.branch || task.branch === 'shared' || task.branch === branch)) {
      branch = ['core', 'support', 'extension'].find(candidate => activityTasks.some(task => task.branch === candidate));
    }
    return activityTasks.filter(task => task.type !== 'reflection' && (!task.branch || task.branch === 'shared' || task.branch === branch)).map(task => task.id);
  }));
}

export function learningEvidenceStats(state) {
  const present = Object.keys(state.roster || {}).filter(id => state.roster[id]?.present !== false);
  const required = new Map(present.map(id => [id, exitTaskIds(state, id)]));
  const relevant = Object.values(state.submissions || {}).filter(sub => required.get(sub.learnerId)?.has(sub.taskId) && sub.source !== 'practice');
  const latest = new Map();
  for (const sub of relevant) {
    const key=JSON.stringify([sub.learnerId,sub.taskId]),old=latest.get(key);
    if (!old || (sub.at || 0) >= (old.at || 0)) latest.set(key, sub);
  }
  const rows = [...latest.values()];
  const submitted=new Set(rows.map(sub=>sub.learnerId));
  let passed=0,notPassed=0,pendingTeacher=0,needsReview=0,incomplete=0,aiAssessed=0,teacherAssessed=0;
  for(const id of submitted){
    const own=rows.filter(sub=>sub.learnerId===id);
    if(own.some(sub=>sub.assessmentStatus==='pending'))pendingTeacher++;
    else if(own.some(sub=>sub.assessmentStatus==='needs_review'))needsReview++;
    else if(own.length<required.get(id).size)incomplete++;
    else if(own.every(sub=>(sub.assessmentStatus==='assessed'||sub.assessmentStatus==='ai_assessed')&&sub.ok===true))passed++;
    else notPassed++;
    aiAssessed+=own.filter(sub=>sub.assessmentStatus==='ai_assessed').length;
    teacherAssessed+=own.filter(sub=>sub.assessmentStatus==='assessed').length;
  }
  return {
    total: present.length,
    submitted: submitted.size,
    passed,
    notPassed,
    needsReview,
    pendingTeacher,
    incomplete,
    aiAssessed,
    teacherAssessed,
    notSubmitted: Math.max(0, present.length - submitted.size),
    rate: submitted.size ? Math.round(passed * 100 / submitted.size) : null
  };
}

export function learnerEvidenceResult(state, learnerId) {
  const required = exitTaskIds(state, learnerId);
  const relevant = Object.values(state.submissions || {}).filter(sub => sub.learnerId === learnerId && sub.source !== 'practice' &&
    required.has(sub.taskId));
  const latest = new Map();
  for (const sub of relevant) {
    const old = latest.get(sub.taskId);
    if (!old || (sub.at || 0) >= (old.at || 0)) latest.set(sub.taskId, sub);
  }
  const submissions = [...latest.values()];
  return {
    submitted: submissions.length,
    passed: submissions.filter(sub => (sub.assessmentStatus === 'assessed' || sub.assessmentStatus === 'ai_assessed') && sub.ok === true).length,
    notPassed: submissions.filter(sub => (sub.assessmentStatus === 'assessed' || sub.assessmentStatus === 'ai_assessed') && sub.ok !== true).length,
    needsReview: submissions.filter(sub => sub.assessmentStatus === 'needs_review').length,
    pending: submissions.filter(sub => sub.assessmentStatus === 'pending').length,
    items: submissions.map(sub => ({
      taskId: sub.taskId,
      status: sub.assessmentStatus,
      criteriaMet: sub.assessmentStatus === 'assessed' || sub.assessmentStatus === 'ai_assessed' ? sub.ok === true : null,
      feedback: state.openAssessments?.[sub.submissionId]?.feedback || null,
      submittedAt: sub.at
    }))
  };
}

