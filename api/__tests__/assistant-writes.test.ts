import { describe, expect, it } from 'vitest';
import { ASSISTANT_EXECUTABLE_TOOLS, executeAssistantTool } from '../_assistant-executors.js';

const actor = {
  firebaseUid: 'teacher-1', channel: 'telegram' as const, channelAccountId: 'bot-1',
  channelUserId: '123', channelChatId: '123', linkId: 'link-1', active: true as const,
};

describe('assistant confirmed write executor registry', () => {
  it('exposes only the bounded side-effect-free draft executor', async () => {
    expect([...ASSISTANT_EXECUTABLE_TOOLS]).toEqual(['draftLesson']);
    const result = await executeAssistantTool({ actor, confirmationId: 'confirmation-1', toolName: 'draftLesson', payload: { title: 'Phân số', subject: 'Toán', grade: '6' } });
    expect(result).toEqual({ kind: 'draftLesson', title: 'Phân số', subject: 'Toán', grade: '6', content: 'Bản nháp trống — giáo viên cần bổ sung nội dung trước khi lưu.', persisted: false });
  });

  it('fails closed for unsupported write tools', async () => {
    await expect(executeAssistantTool({ actor, confirmationId: 'confirmation-2', toolName: 'createAssignment', payload: { title: 'Bài' } })).rejects.toThrow('Unsupported assistant executor');
  });
});
