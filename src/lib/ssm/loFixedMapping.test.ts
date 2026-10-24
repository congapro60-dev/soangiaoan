import { describe, expect, it } from 'vitest';
import { asCompetencyGrade, competenciesByGrade } from '../classroom/competency/framework';
import { fixedLoMapping } from './loFixedMapping';

const idsOf = (grade: number) => competenciesByGrade(asCompetencyGrade(grade)).map((c) => c.id);

describe('fixedLoMapping', () => {
  it('khối 10: mỗi LO về đúng một năng lực riêng, không dồn cột', () => {
    const mapping = fixedLoMapping(
      ['LO_DIS_TO_34344', 'LO_DIS_TO_34345', 'LO_DIS_TO_34346', 'LO_DIS_TO_34352', 'LO_DIS_TO_34353', 'LO_DIS_TO_34354'],
      idsOf(10),
    );

    expect(mapping).toEqual({
      LO_DIS_TO_34344: ['g10-tap-hop-va-menh-de'],
      LO_DIS_TO_34345: ['g10-phep-toan-tren-tap-hop'],
      LO_DIS_TO_34346: ['g10-bpt-bac-nhat-hai-an'],
      LO_DIS_TO_34352: ['g10-gia-tri-luong-giac-0-180'],
      LO_DIS_TO_34353: ['g10-he-thuc-luong-tam-giac'],
      LO_DIS_TO_34354: ['g10-vecto-va-phep-toan'],
    });
  });

  it('khối 11: 34745 và 34746 cùng về năng lực lượng giác đã chốt', () => {
    const mapping = fixedLoMapping(['LO_DIS_TO_34745', 'LO_DIS_TO_34746', 'LO_DIS_TO_34756', 'LO_DIS_TO_34757'], idsOf(11));

    expect(mapping['LO_DIS_TO_34745']).toEqual(['g11-ham-va-pt-luong-giac']);
    expect(mapping['LO_DIS_TO_34746']).toEqual(['g11-ham-va-pt-luong-giac']);
    expect(mapping['LO_DIS_TO_34756']).toEqual(['g11-duong-thang-mat-phang-kg']);
    expect(mapping['LO_DIS_TO_34757']).toEqual(['g11-quan-he-song-song']);
  });

  it('khối 12: 5 LO khảo sát hàm số cùng về một năng lực, LO vectơ không gian để trống', () => {
    const mapping = fixedLoMapping(
      ['LO_DIS_TO_34383', 'LO_DIS_TO_34384', 'LO_DIS_TO_34385', 'LO_DIS_TO_34386', 'LO_DIS_TO_34387', 'LO_DIS_TO_34390'],
      idsOf(12),
    );

    expect(Object.keys(mapping)).toHaveLength(5);
    expect(new Set(Object.values(mapping).flat())).toEqual(new Set(['g12-khao-sat-ham-so']));
    expect(mapping['LO_DIS_TO_34390']).toBeUndefined();
  });

  it('không ghép chéo khối: LO lớp 10 với khung lớp 11 thì bị loại', () => {
    expect(fixedLoMapping(['LO_DIS_TO_34344'], idsOf(11))).toEqual({});
  });

  it('LO lạ (hoạt động trải nghiệm, chưa khai báo) thì bỏ trống', () => {
    expect(fixedLoMapping(['LO_DIS_TO_34764'], idsOf(11))).toEqual({});
  });
});
