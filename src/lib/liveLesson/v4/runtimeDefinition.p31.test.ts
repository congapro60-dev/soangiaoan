import { describe, expect, it } from 'vitest';
import { getG10P31V4Contract } from '../../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4';
import { buildLiveLessonDefinitionFromV4 } from './runtimeDefinition';
import { lookupTvMedia } from './mediaManifest';
import { getLiveLessonDefinitionForRoute } from '../routeDefinition';
import { getAllBanToanV4Contracts } from './lessonAdapter';

// Regression cho P0: mỗi cue của bài P31 phải hiển thị đúng hoạt động của nó trên
// TV (không dùng lại một screenId cho nhiều hoạt động, không để title literal Sxx).
// Title là chữ chiếu cho học sinh đọc nên viết theo ngôn ngữ lớp học, không dùng
// tên kỹ thuật của bước ("post-check", "duyệt nhóm", "AI Error of the Week").
const EXPECTED: Array<{ cue: string; screen: string; label: string; title: string }> = [
  { cue: 'P00', screen: 'S0', label: 'MỞ ĐẦU', title: 'TÌNH HUỐNG MỞ ĐẦU' },
  { cue: 'P03', screen: 'S1', label: 'MỤC TIÊU CÁ NHÂN', title: 'CUỐI TIẾT EM MUỐN LÀM ĐƯỢC GÌ?' },
  { cue: 'P05', screen: 'S2', label: 'MỤC TIÊU CHUNG', title: 'MỤC TIÊU CHUNG CỦA LỚP' },
  { cue: 'P08', screen: 'S3', label: 'HÌNH THÀNH', title: 'ĐƯỜNG BIÊN VÀ MIỀN NGHIỆM' },
  { cue: 'P16', screen: 'S4', label: 'TƯ DUY PHẢN BIỆN', title: 'KIỂM CHỨNG LỜI GIẢI CỦA AI' },
  { cue: 'P19', screen: 'S5', label: 'HỢP TÁC', title: 'CHIA NHÓM LÀM VIỆC' },
  { cue: 'P20', screen: 'S6', label: 'HỢP TÁC', title: 'NHIỆM VỤ NHÓM' },
  { cue: 'P27', screen: 'S7', label: 'ĐÁNH GIÁ LẠI', title: 'TỰ KIỂM TRA CÁ NHÂN' },
  { cue: 'P30', screen: 'S8', label: 'PHÂN HÓA', title: 'BA CỬA VÀO, MỘT ĐÍCH ĐẾN' },
  { cue: 'P35', screen: 'S9', label: 'CHỐT TOÁN', title: 'CHỐT LẠI VÀ PHẢN VÍ DỤ' },
  { cue: 'P38', screen: 'S10', label: 'KẾT THÚC', title: 'EXIT TICKET' },
];

describe('P31 canonical cue → TV screen mapping', () => {
  const contract = getG10P31V4Contract();
  const def = buildLiveLessonDefinitionFromV4(contract);
  const screenById = new Map(def.tvScreens.map((s) => [s.id, s]));
  const cueById = new Map(def.cues.map((c) => [c.id, c]));

  it.each(EXPECTED)('cue $cue renders screen $screen with its real activity', ({ cue, screen, label, title }) => {
    const c = cueById.get(cue);
    expect(c, `cue ${cue} exists`).toBeTruthy();
    expect(c!.tvScreenId).toBe(screen);
    const s = screenById.get(screen);
    expect(s, `screen ${screen} exists`).toBeTruthy();
    expect(s!.label).toBe(label);
    expect(s!.title).toBe(title);
    expect(s!.action?.trim(), 'slide phải nói việc học sinh làm').toBeTruthy();
    expect(s!.title).not.toMatch(/^S\d+$/); // no literal "Sxx" title
  });

  it('keeps teacher board shorthand out of every projected TV screen', () => {
    for (const screen of def.tvScreens) {
      const projected = `${screen.title} ${screen.body ?? ''} ${screen.action ?? ''}`;
      expect(projected).not.toContain('LỖI CẦN SOI');
      expect(projected).not.toContain('KHUNG CÂU:');
      expect(projected).not.toContain('TỪ KHÓA:');
      expect(projected).not.toContain('Giữ mô hình');
    }
  });

  it('gives every cue a unique TV screen (no reused screenId across activities)', () => {
    const ids = contract.timeline.map((b) => b.tvScreenId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('places the whiteboard media on the P00 opening screen (S0) only', () => {
    expect(cueById.get('P00')!.tvScreenId).toBe('S0');
    expect(lookupTvMedia('10-5-31', 'S0')).not.toBeNull();
    for (const s of ['S1', 'S3', 'S4', 'S7', 'S10']) {
      expect(lookupTvMedia('10-5-31', s)).toBeNull();
    }
  });

  it('shows the public budget context on the opening screen (S0), no private data', () => {
    const body = screenById.get('S0')!.body;
    expect(body).toContain('150');
    expect(body).toContain('bánh');
    expect(body).toContain('nước');
    expect(body).not.toMatch(/teacher/i);
  });

  it('shows the AI faulty statement on the AI-error screen (S4)', () => {
    expect(screenById.get('S4')!.body).toContain('160');
    expect(screenById.get('S4')!.title).toBe('KIỂM CHỨNG LỜI GIẢI CỦA AI');
  });

  it('P27 presents an individual post-check with a response on a real student screen', () => {
    const p27 = def.cues.find((c) => c.id === 'P27');
    expect(p27?.responseStepId).toBe('cp-postcheck');
    const step = def.responseSteps.find((s) => s.id === 'cp-postcheck');
    expect(step).toBeTruthy();
    expect(step!.screenId).toBe('HS7');
    expect(step!.screenId).not.toBe('HS0');
  });

  it('shows the linear-inequality model on the formation screen (S3)', () => {
    expect(screenById.get('S3')!.body).toMatch(/≤|<=/);
  });

  it('never leaks teacherScript into the public TV screens', () => {
    const tvJson = JSON.stringify(def.tvScreens);
    for (const block of contract.timeline) {
      if (block.teacherScript.trim().length > 0) {
        expect(tvJson).not.toContain(block.teacherScript);
      }
    }
  });
});

describe('P31 canonical checkpoint → student screen mapping', () => {
  const def = buildLiveLessonDefinitionFromV4(getG10P31V4Contract());
  const screenByStep = new Map(def.responseSteps.map((s) => [s.id, s.screenId]));

  const EXPECTED_STUDENT: Record<string, string> = {
    'cp-student-goal': 'HS2',
    'cp-teacher-synthesis': 'HS2',
    'cp-model': 'HS3',
    'cp-ai-error': 'HS4',
    'cp-group-product': 'HS5',
    'cp-postcheck-m': 'HS7',
    'cp-postcheck-s': 'HS7',
    'cp-postcheck-c': 'HS7',
    'cp-route': 'HS6',
    'cp-exit-ticket': 'HS10',
  };

  it.each(Object.entries(EXPECTED_STUDENT))('checkpoint %s maps to student screen %s', (stepId, screenId) => {
    expect(screenByStep.get(stepId)).toBe(screenId);
  });

  it('no canonical checkpoint falls back to HS0 (Sẵn sàng) during real work', () => {
    for (const step of def.responseSteps) {
      expect(step.screenId, `${step.id} must not be HS0`).not.toBe('HS0');
    }
  });
});

describe('P31 launcher integration (real lesson identity)', () => {
  it('routes definitionKey 10-5-31 to the canonical hand-authored contract', () => {
    const def = getLiveLessonDefinitionForRoute('10-5-31');
    expect(def.id).toBe('g10_w5_p31_bpt_tiet1_v4');
    expect(def.lessonId).toBe('g10_w5_p31_bpt_tiet1');
    const p00 = def.cues.find((c) => c.id === 'P00');
    expect(p00?.tvScreenId).toBe('S0');
    expect(lookupTvMedia('10-5-31', p00!.tvScreenId)).not.toBeNull();
  });

  it('keeps other Ban Toán sources on the adapter template (unchanged)', () => {
    // A different, real source key must NOT resolve to the P31 canonical contract.
    const otherKey = getAllBanToanV4Contracts()
      .map((c) => c.sourceKey)
      .find((k) => k !== '10-5-31');
    expect(otherKey).toBeTruthy();
    const other = getLiveLessonDefinitionForRoute(otherKey!);
    expect(other.id).not.toBe('g10_w5_p31_bpt_tiet1_v4');
  });
});
