import { describe, expect, it } from 'vitest';
import { extractGeometryReply } from '../_assistant-geometry.js';

/**
 * Tách khối ```geometry {...}``` khỏi câu trả lời AI.
 * NGUYÊN TẮC AN TOÀN: mọi nhánh lỗi đều trả spec=null nhưng vẫn GỠ khối khỏi text —
 * HS không bao giờ nhìn thấy JSON rác trong Zalo; luồng cũ (không hình) không vỡ.
 */
describe('extractGeometryReply — tách khối geometry khỏi câu trả lời AI', () => {
  it('G1: có khối hợp lệ → spec đúng, khối bị gỡ khỏi text, phần chữ giữ nguyên', () => {
    const raw = [
      'Thể tích khối chóp: V = (1/3)·S đáy·h.',
      '',
      '```geometry',
      '{"shape":"pyramid","base":"square","note":"ABCD vuông cạnh a, SA ⊥ (ABCD)"}',
      '```',
    ].join('\n');
    const out = extractGeometryReply(raw);
    expect(out.spec).not.toBeNull();
    expect(out.spec?.shape).toBe('pyramid');
    expect(out.spec?.note).toContain('SA ⊥ (ABCD)');
    expect(out.text).not.toContain('```geometry');
    expect(out.text).not.toContain('"shape"');
    expect(out.text).toContain('Thể tích khối chóp');
  });

  it('G2: KHÔNG có khối → text nguyên văn, spec null', () => {
    const raw = 'Điểm của em đang tiến bộ. Hãy tiếp tục nhé.';
    const out = extractGeometryReply(raw);
    expect(out.text).toBe(raw);
    expect(out.spec).toBeNull();
  });

  it('G3: JSON hỏng → spec null nhưng khối VẪN bị gỡ (HS không thấy rác)', () => {
    const raw = ['Giải thích.', '', '```geometry', '{không phải json', '```'].join('\n');
    const out = extractGeometryReply(raw);
    expect(out.spec).toBeNull();
    expect(out.text).not.toContain('```geometry');
    expect(out.text).toContain('Giải thích.');
  });

  it('G4: shape không nằm trong danh sách → spec null, khối bị gỡ', () => {
    const raw = ['Bài này.', '', '```geometry', '{"shape":"unicorn"}', '```'].join('\n');
    const out = extractGeometryReply(raw);
    expect(out.spec).toBeNull();
    expect(out.text).not.toContain('unicorn');
  });

  it('G5: base sai kiểu (chỉ pyramid mới có square|triangle) → spec null', () => {
    const raw = ['Hình chóp.', '', '```geometry', '{"shape":"pyramid","base":"lục giác"}', '```'].join('\n');
    const out = extractGeometryReply(raw);
    expect(out.spec).toBeNull();
  });

  it('G6: có 2 khối → lấy khối CUỐI, cả 2 đều bị gỡ', () => {
    const raw = [
      '```geometry',
      '{"shape":"box","note":"cũ"}',
      '```',
      'Lời giải giữa.',
      '```geometry',
      '{"shape":"cone","note":"mới"}',
      '```',
    ].join('\n');
    const out = extractGeometryReply(raw);
    expect(out.spec?.shape).toBe('cone');
    expect(out.text).not.toContain('```geometry');
    expect(out.text).toContain('Lời giải giữa.');
  });

  it('G7: note quá dài (>300 ký tự) → spec null (không tin mù AI)', () => {
    const raw = ['Hình.', '', '```geometry', `{"shape":"sphere","note":"${'x'.repeat(301)}"}`, '```'].join('\n');
    const out = extractGeometryReply(raw);
    expect(out.spec).toBeNull();
  });

  it('G8: spec hợp lệ cho đủ 9 shape — 6 hình khối + graph/table/bar', () => {
    for (const shape of ['pyramid', 'prism', 'box', 'cylinder', 'cone', 'sphere']) {
      const raw = ['Hình.', '', '```geometry', `{"shape":"${shape}"}`, '```'].join('\n');
      expect(extractGeometryReply(raw).spec?.shape).toBe(shape);
    }
    expect(extractGeometryReply(['G.', '', '```geometry', '{"shape":"graph","points":[[0,0],[1,2]]}', '```'].join('\n')).spec?.shape).toBe('graph');
    expect(extractGeometryReply(['B.', '', '```geometry', '{"shape":"table","head":["x"],"rows":[["1"]]}', '```'].join('\n')).spec?.shape).toBe('table');
    expect(extractGeometryReply(['C.', '', '```geometry', '{"shape":"bar","labels":["A","B"],"values":[1,2]}', '```'].join('\n')).spec?.shape).toBe('bar');
  });

  it('G9: graph sai dữ liệu → spec null (points < 2, toạ độ không phải số)', () => {
    const bad1 = ['G.', '', '```geometry', '{"shape":"graph","points":[[0,0]]}', '```'].join('\n');
    const bad2 = ['G.', '', '```geometry', '{"shape":"graph","points":[[0,0],["a",2]]}', '```'].join('\n');
    const bad3 = ['G.', '', '```geometry', '{"shape":"graph","points":[[0,0],[1,2]],"xrange":[5,-5]}', '```'].join('\n');
    for (const raw of [bad1, bad2, bad3]) {
      expect(extractGeometryReply(raw).spec).toBeNull();
    }
  });

  it('G10: table/bar sai dữ liệu → spec null (sai số cột, giá trị âm, quá dài)', () => {
    const bad1 = ['B.', '', '```geometry', '{"shape":"table","head":["x","y"],"rows":[["1"]]}', '```'].join('\n');
    const bad2 = ['C.', '', '```geometry', '{"shape":"bar","labels":["A","B"],"values":[-1,2]}', '```'].join('\n');
    const bad3 = ['C.', '', '```geometry', '{"shape":"bar","labels":["A","B"],"values":[1]}', '```'].join('\n');
    for (const raw of [bad1, bad2, bad3]) {
      expect(extractGeometryReply(raw).spec).toBeNull();
    }
  });
});
