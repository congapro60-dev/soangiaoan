import { describe, expect, it } from 'vitest';
import { getBanToanV4Contract } from './lessonAdapter';
import { buildLiveLessonDefinitionFromV4 } from './runtimeDefinition';
import { isWeek6SourceKey, WEEK6_SOURCE_KEYS } from './week6Catalog';

describe('Week 6 V7.2 source catalog', () => {
  it('contains exactly eight packages per grade', () => {
    expect(WEEK6_SOURCE_KEYS).toHaveLength(24);
    expect(WEEK6_SOURCE_KEYS.filter(key => key.startsWith('10-'))).toHaveLength(8);
    expect(WEEK6_SOURCE_KEYS.filter(key => key.startsWith('11-'))).toHaveLength(8);
    expect(WEEK6_SOURCE_KEYS.filter(key => key.startsWith('12-'))).toHaveLength(8);
  });

  it('maps every source key to a V7.2 14-activity contract with five practice questions', () => {
    for (const sourceKey of WEEK6_SOURCE_KEYS) {
      const contract = getBanToanV4Contract(sourceKey);
      expect(isWeek6SourceKey(contract.sourceKey ?? '')).toBe(true);
      expect(contract.version).toContain('v7.2');
      expect(contract.aiError.stepId).toBe('P15');
      expect(contract.timeline.map(block => block.id)).toEqual([
        'P00', 'P02', 'P04', 'P07', 'P09', 'P11', 'P13', 'P15', 'P18', 'P20', 'P22', 'P34', 'P36', 'P39',
      ]);
      expect(contract.publicTvScreens).toHaveLength(14);
      expect(contract.objectives.math.every(objective => objective.text.includes('Tôi có thể'))).toBe(true);
      const practiceIds = contract.checkpoints.filter(checkpoint => checkpoint.id.startsWith('cp-practice-')).map(checkpoint => checkpoint.id);
      expect(practiceIds).toEqual(['cp-practice-a', 'cp-practice-b', 'cp-practice-c', 'cp-practice-d', 'cp-practice-challenge']);
      expect(contract.timeline.find(block => block.id === 'P22')?.checkpointIds).toEqual(practiceIds);
      const runtime = buildLiveLessonDefinitionFromV4(contract);
      expect(runtime.cues.find(cue => cue.id === 'P22')?.responseStepIds).toEqual(practiceIds);
      expect(contract.choicePolicy?.enabled).toBe(true);
    }
  });
});
