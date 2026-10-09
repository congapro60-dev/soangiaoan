const SHA256 = /^[0-9a-f]{64}$/;

const textOf = extraction => (Array.isArray(extraction?.segments) ? extraction.segments : [])
  .map(segment => typeof segment?.text === 'string' ? segment.text : '')
  .join('\n')
  .normalize('NFC');

const has = (text, pattern) => pattern.test(text);

function detect(extraction) {
  // File names are untrusted labels. Only extracted source text drives signals.
  const text = textOf(extraction);
  const math = has(text, /toán|math|\bu[_\s]?n\b|công thức|phương trình|hình học/i);
  const grade11 = has(text, /(?:toán|math)\s*(?:lớp\s*)?11\b|\b11\s*[-–:]\s*(?:dãy|lượng giác|giới hạn)/i);
  const sequences = has(text, /dãy\s*số|cấp\s*số|số\s*hạng|hệ\s*thức\s*truy\s*hồi|\bu[_\s]?n\b/i);
  const group = has(text, /làm\s*việc\s*theo\s*nhóm|\bnhóm\s+\d+\s*phút|theo\s*cặp|đôi|hợp\s*tác|phân\s*vai/i);
  const signals = [];
  if (math) signals.push('MATH_SUBJECT');
  if (grade11) signals.push('GRADE_11');
  if (sequences) signals.push('SEQUENCES');
  if (group) signals.push('GROUP_LANGUAGE');
  return {
    subject: math ? 'math' : 'unknown',
    grade: grade11 ? 11 : null,
    topic: sequences ? 'sequences' : 'unknown',
    confidence: math && grade11 && sequences ? 0.95 : signals.length ? 0.55 : 0.2,
    signals
  };
}

function activities(participation) {
  const group = participation === 'group';
  return [
    { id: 'proposal-experience', phase: 'experience', minutes: 3, participation: 'whole_class', purpose: 'Kích hoạt bối cảnh và mục tiêu.' },
    { id: 'proposal-guided', phase: 'guided', minutes: 7, participation: 'individual', purpose: 'Kiểm tra nền tảng cá nhân.' },
    { id: 'proposal-practice', phase: 'practice', minutes: 18, participation: group ? 'group' : 'individual', purpose: group ? 'Giải nhiệm vụ chung, nhận vai và giải thích bằng chứng.' : 'Luyện tập theo tuyến cá nhân.' },
    { id: 'proposal-recheck', phase: 'recheck', minutes: 7, participation: 'individual', purpose: 'Kiểm tra độc lập sau hỗ trợ.' },
    { id: 'proposal-exit', phase: 'exit', minutes: 2, participation: 'individual', purpose: 'Exit ticket và tự đánh giá.' },
    { id: 'proposal-reserve', phase: 'reflection', minutes: 3, participation: 'individual', purpose: 'Dự phòng hoặc mở rộng; cắt trước phần bắt buộc.' }
  ];
}

export function buildLessonProposal({ extraction, sourceId, parserRevision, extractionHash } = {}) {
  if (!extraction || typeof extraction !== 'object' || !Array.isArray(extraction.segments)) throw new Error('EXTRACTION_REQUIRED');
  if (typeof sourceId !== 'string' || !sourceId.trim()) throw new Error('SOURCE_ID_REQUIRED');
  if (typeof parserRevision !== 'string' || !parserRevision.trim()) throw new Error('PARSER_REVISION_REQUIRED');
  if (typeof extractionHash !== 'string' || !SHA256.test(extractionHash)) throw new Error('EXTRACTION_HASH_REQUIRED');
  if (typeof extraction.sha256 !== 'string' || !SHA256.test(extraction.sha256)) throw new Error('SOURCE_HASH_REQUIRED');

  const detection = detect(extraction);
  const group = detection.signals.includes('GROUP_LANGUAGE');
  const sequenceMath = detection.subject === 'math' && detection.topic === 'sequences';
  const recommendation = sequenceMath && group
    ? {
      map: 'historical', rule: 'relay', participation: 'group',
      alternatives: [{ map: 'academy', rule: 'campaign', participation: 'individual', reasonCode: 'LOWER_COORDINATION_LOAD' }]
    }
    : { map: 'modern', rule: 'campaign', participation: 'individual', alternatives: [] };
  const uncertainties = [...new Set([
    ...(Array.isArray(extraction.uncertainties) ? extraction.uncertainties.map(item => item?.code || item?.kind || 'UNKNOWN_UNCERTAINTY').filter(Boolean) : []),
    ...(detection.subject === 'unknown' ? ['SUBJECT_UNCERTAIN'] : []),
    ...(detection.grade === null ? ['GRADE_UNCERTAIN'] : []),
    ...(detection.topic === 'unknown' ? ['TOPIC_UNCERTAIN'] : [])
  ])];
  return {
    schemaVersion: '1.0.0',
    status: 'needs_review',
    source: { id: sourceId, sha256: extraction.sha256, parserRevision, extractionHash },
    detection,
    recommendation,
    proposedActivities: activities(recommendation.participation),
    uncertainties,
    requiresTeacherReview: true,
    reviewReasons: ['SOURCE_CONTENT_WAS_NOT_INVENTED', 'ANSWERS_AND_LO_REQUIRE_TEACHER_CONFIRMATION', 'GAME_PLAN_REQUIRES_APPROVAL']
  };
}
