import { TOPICS, MATH_POINTS } from './campaign.js';
import { CATEGORIES } from './context-questions.js';

export const AI_BANK_LIMIT = 60;
export const AI_SAVE_LIMIT = 24;

const pretty = x => typeof x === 'number' ? String(Number(x.toPrecision(10))) : String(x);
const numeric = raw => /^-?\d+(\.\d+)?$/.test(String(raw).trim()) ? Number(String(raw).trim()) : null;

/** Resolve a topic by id or Vietnamese name (case-insensitive). Returns the TOPICS entry or null. */
export function resolveAITopic(raw) {
    if (typeof raw !== 'string') return null;
    const key = raw.trim().toLowerCase();
    return TOPICS.find(t => t.id.toLowerCase() === key || t.name.toLowerCase() === key) || null;
}

/** Validate one AI candidate against the room's matrix. Returns {question} or {error}. Short numeric-answer format only. */
export function normalizeAICandidate(raw, campaign) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return { error: 'Câu hỏi không đúng dạng.' };
    if (campaign && (campaign.rule && campaign.rule !== 'campaign'))
        return { error: 'Ngân hàng AI chỉ dùng cho chế độ chiến dịch.' };
    const topicEntry = resolveAITopic(raw.topic);
    if (!topicEntry)
        return { error: 'Chủ đề không nằm trong danh sách chủ đề Toán.' };
    if (campaign && Array.isArray(campaign.topics) && campaign.topics.length && !campaign.topics.includes(topicEntry.id))
        return { error: `Chủ đề ${topicEntry.name} không nằm trong ma trận đã chọn.` };
    const level = Number(raw.level);
    const min = campaign && Number.isInteger(campaign.minLevel) ? campaign.minLevel : 0;
    const max = campaign && Number.isInteger(campaign.maxLevel) ? campaign.maxLevel : 4;
    if (!Number.isInteger(level) || level < min || level > max)
        return { error: `Mức độ phải trong khoảng ${min}–${max} theo ma trận.` };
    const category = typeof raw.category === 'string' && CATEGORIES.some(c => c.id === raw.category) ? raw.category : 'practice';
    const format = 'short';
    const question = typeof raw.question === 'string' ? raw.question.trim() : '';
    if (question.length < 10 || question.length > 600)
        return { error: 'Đề câu hỏi dài 10–600 ký tự.' };
    const numericAnswer = numeric(raw.answer);
    const answer = numericAnswer !== null ? numericAnswer : (typeof raw.answer === 'string' && raw.answer.trim() && raw.answer.trim().length <= 40 ? raw.answer.trim() : null);
    if (answer === null)
        return { error: 'Đáp án phải là số hoặc chuỗi ngắn (tối đa 40 ký tự).' };
    let steps = Array.isArray(raw.steps) ? raw.steps.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim().slice(0, 300)) : [];
    if (steps.length > 6) steps = steps.slice(0, 6);
    return {
        question: {
            id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 40) : '',
            topic: topicEntry.id,
            topicName: topicEntry.name,
            level,
            category,
            format,
            question,
            answer,
            steps,
            source: 'ai'
        }
    };
}

/** Validate and merge an approved list into the bank. Returns {bank, saved, errors}. */
export function mergeAIBank(existing, approved, campaign, { replace = false } = {}) {
    const base = replace ? [] : (Array.isArray(existing) ? existing : []);
    const bank = [...base];
    const errors = [];
    const seen = new Set(bank.map(q => q.question));
    let saved = 0;
    for (const raw of (Array.isArray(approved) ? approved : [])) {
        if (bank.length >= AI_BANK_LIMIT) { errors.push('Ngân hàng đã đạt giới hạn 60 câu.'); break; }
        const res = normalizeAICandidate(raw, campaign);
        if (res.error) { errors.push(res.error); continue; }
        const q = res.question;
        if (seen.has(q.question)) continue;
        seen.add(q.question);
        q.id = q.id || 'ai' + (bank.length + 1) + '-' + Math.floor(Math.random() * 1e6).toString(36);
        bank.push(q);
        saved++;
    }
    return { bank, saved, errors };
}

/** Pick an approved AI question for a math slot. Prefers exact topic+level, then same topic. Returns a bonus-shaped question or null. */
export function pickAIQuestion(bank, plan, usedQuestions = []) {
    if (!Array.isArray(bank) || !bank.length || !plan || typeof plan !== 'object')
        return null;
    if (plan.format && plan.format !== 'short')
        return null;
    const used = new Set((Array.isArray(usedQuestions) ? usedQuestions : []).map(q => q?.id).filter(Boolean));
    const sameTopic = bank.filter(q => q.topic === plan.topic && !used.has(q.id));
    if (!sameTopic.length)
        return null;
    const exact = sameTopic.find(q => q.level === plan.level);
    const match = exact || sameTopic[0];
    return { ...match, id: match.id, points: MATH_POINTS[match.level ?? plan.level ?? 0], attempts: 0, done: false, format: 'short' };
}
