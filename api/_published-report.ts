import { applyReportOverrides } from '../src/lib/classroom/reportOverrides.js';
import { mergeLiveInput } from '../src/lib/classroom/parentReportLive.js';
import { asProgram } from '../src/lib/classroom/reportStage.js';
import type { ReportPeriod } from '../src/lib/classroom/reportPeriod.js';
import { buildLiveReport, type LiveSource } from './_parent-live.js';

/** Both portals use the same published snapshot, live data, fallback and final teacher overrides. */
export const publishedReportInput = (data: FirebaseFirestore.DocumentData, live: LiveSource | null): unknown => {
  let input: unknown = null;
  try { input = JSON.parse(String(data.inputJson || 'null')); } catch { /* broken snapshot is omitted */ }
  if (input && live && data.live === true) {
    try {
      const period: ReportPeriod = { kind: data.kind, from: data.from, to: data.to, ...(typeof data.hk2From === 'string' ? { hk2From: data.hk2From } : {}) };
      input = mergeLiveInput(input as never, buildLiveReport(live, period, asProgram(data.program)).printInput);
    } catch (error) { console.error('[parent-portal] không dựng lại được báo cáo, dùng bản đã công bố:', error); }
  }
  if (input && typeof data.overridesJson === 'string') {
    try { input = applyReportOverrides(input as never, JSON.parse(data.overridesJson)); } catch { /* malformed override leaves published snapshot */ }
  }
  return input;
};
