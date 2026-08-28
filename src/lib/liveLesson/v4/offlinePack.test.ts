import { describe, expect, it } from 'vitest';
import { getG10P31V4Contract } from '../../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4';
import type { LiveLessonV4Contract } from './types';
import {
  buildOfflineChecklist,
  buildOfflinePackContents,
  validateGlossaryApproved,
  validateOfflinePackReadiness,
  validatePostChecks,
} from './offlinePack';

function cloneContract(): LiveLessonV4Contract {
  return JSON.parse(JSON.stringify(getG10P31V4Contract())) as LiveLessonV4Contract;
}

describe('validatePostChecks', () => {
  it('returns empty when every task variant has a valid post-check', () => {
    const contract = cloneContract();
    expect(validatePostChecks(contract)).toEqual([]);
  });

  it('detects missing post-check when variant references non-existent checkpoint', () => {
    const contract = cloneContract();
    contract.taskVariants[0].postCheckId = 'non-existent-postcheck';
    expect(validatePostChecks(contract)).toEqual(['M']);
  });

  it('detects missing post-check for all routes when checkpoint list is empty', () => {
    const contract = cloneContract();
    contract.checkpoints = contract.checkpoints.filter((c) => c.kind !== 'post_check');
    expect(validatePostChecks(contract)).toEqual(['M', 'S', 'C']);
  });
});

describe('validateGlossaryApproved', () => {
  it('returns empty when all glossary items are approved', () => {
    const contract = cloneContract();
    expect(validateGlossaryApproved(contract)).toEqual([]);
  });

  it('returns ids of unapproved glossary items', () => {
    const contract = cloneContract();
    contract.glossary[0].status = 'draft';
    contract.glossary[1].status = 'retired';
    const unapproved = validateGlossaryApproved(contract);
    expect(unapproved).toContain('term-inequality');
    expect(unapproved).toContain('term-boundary-line');
    expect(unapproved).toHaveLength(2);
  });
});

describe('validateOfflinePackReadiness', () => {
  it('returns ok for a complete contract', () => {
    const contract = cloneContract();
    const result = validateOfflinePackReadiness(contract);
    expect(result.ok).toBe(true);
    expect(result.missingPostChecks).toEqual([]);
    expect(result.unapprovedGlossaryItems).toEqual([]);
  });

  it('fails when a post-check is missing', () => {
    const contract = cloneContract();
    contract.taskVariants[1].postCheckId = 'gone';
    const result = validateOfflinePackReadiness(contract);
    expect(result.ok).toBe(false);
    expect(result.missingPostChecks).toContain('S');
  });

  it('fails when glossary has unapproved items', () => {
    const contract = cloneContract();
    contract.glossary[0].status = 'draft';
    const result = validateOfflinePackReadiness(contract);
    expect(result.ok).toBe(false);
    expect(result.unapprovedGlossaryItems).toContain('term-inequality');
  });

  it('fails when offline pack is missing required fields', () => {
    const contract = cloneContract();
    contract.offline.tvCuesIncluded = false;
    expect(validateOfflinePackReadiness(contract).ok).toBe(false);
  });

  it('fails when route cards are incomplete', () => {
    const contract = cloneContract();
    contract.offline.routeCards = ['M', 'S'];
    expect(validateOfflinePackReadiness(contract).ok).toBe(false);
  });
});

describe('buildOfflinePackContents', () => {
  it('builds full pack for a valid contract', () => {
    const contract = cloneContract();
    const contents = buildOfflinePackContents(contract);
    expect(contents).not.toBeNull();
    expect(contents!.tvCues.length).toBe(11);
    expect(contents!.approvedGlossary.length).toBe(4);
    expect(contents!.routeCards).toHaveLength(3);
    expect(contents!.routeCards.map((r) => r.route)).toEqual(['M', 'S', 'C']);
    expect(contents!.aiErrorAnswerKey.faultyStatement).toContain('160');
    expect(contents!.paperExitTicket.prompt).toBeTruthy();
    expect(contents!.boardPlan.objectives.length).toBeGreaterThan(0);
  });

  it('returns null when pack is not publishable', () => {
    const contract = cloneContract();
    contract.glossary[2].status = 'retired';
    expect(buildOfflinePackContents(contract)).toBeNull();
  });

  it('returns null when a post-check is missing', () => {
    const contract = cloneContract();
    contract.taskVariants[0].postCheckId = 'missing';
    expect(buildOfflinePackContents(contract)).toBeNull();
  });
});

describe('buildOfflineChecklist', () => {
  it('returns all-ready for a complete contract', () => {
    const contract = cloneContract();
    const checklist = buildOfflineChecklist(contract);
    expect(checklist.length).toBeGreaterThan(0);
    expect(checklist.every((item) => item.ready)).toBe(true);
  });

  it('marks post-check as not ready when missing', () => {
    const contract = cloneContract();
    contract.taskVariants[0].postCheckId = 'gone';
    const checklist = buildOfflineChecklist(contract);
    const postCheckM = checklist.find((item) => item.label.includes('tuyến M'));
    expect(postCheckM?.ready).toBe(false);
  });

  it('marks glossary as not ready when unapproved items exist', () => {
    const contract = cloneContract();
    contract.glossary[0].status = 'draft';
    const checklist = buildOfflineChecklist(contract);
    const glossaryItem = checklist.find((item) => item.label.includes('thuật ngữ'));
    expect(glossaryItem?.ready).toBe(false);
  });
});
