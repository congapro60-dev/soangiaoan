import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import type { LiveResponseStep, LiveResponseType } from '../../lib/liveLesson/types';
import type { StudentLiveViewProps } from './StudentLiveView';

const state = vi.hoisted(() => ({
  slots: [] as unknown[], index: 0, canAnswer: true,
  drafts: new Map<string, any>(), enqueue: vi.fn(),
}));

// Exercise the actual component handlers without adding a DOM/test-renderer dependency.
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.slots)) state.slots[index] = index === 4
      ? { classId: 'class', className: 'Class', students: [] }
      : typeof initial === 'function' ? initial() : initial;
    return [state.slots[index], (next: any) => {
      state.slots[index] = typeof next === 'function' ? next(state.slots[index]) : next;
    }];
  },
  useEffect: () => {},
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (callback: unknown) => callback,
  useRef: (current: unknown) => ({ current }),
}));
vi.mock('../../lib/firebase', () => ({ auth: { currentUser: { uid: 'anon', isAnonymous: true } } }));
vi.mock('../../services/studentPortalApi', () => ({
  getStudentLoginSession: () => ({ anonymousUid: 'anon', classId: 'class', studentName: 'Student' }),
}));
vi.mock('../../services/liveLessonService', () => ({
  readStudentLanguagePreference: vi.fn(), saveStudentLanguagePreference: vi.fn(), submitLiveResponse: vi.fn(),
}));
vi.mock('../../lib/liveLesson/offlineQueue', () => ({
  enqueueLiveResponse: state.enqueue, getLiveResponseStepState: () => null,
  getQueuedLiveResponses: () => [], flushLiveResponseQueue: vi.fn(),
}));
vi.mock('./ThinkWindow', () => ({
  useThinkWindow: ({ locked }: { locked: boolean }) => ({
    canAnswer: state.canAnswer && !locked, remainingSeconds: 10,
  }),
  ThinkWindowBanner: () => null,
}));
vi.mock('./useStudentDraft', () => ({
  useStudentDraft: (_session: string, _uid: string, stepId: string) => {
    if (!state.drafts.has(stepId)) {
      const draft = {
        selectedValue: '', textValue: '', hasDraft: false, hasUnsentChanges: true,
        setSelectedValue: (value: string) => { draft.selectedValue = value; },
        setTextValue: (value: string) => { draft.textValue = value; },
        recordSubmission: vi.fn(),
        readForStep: (id: string) => state.drafts.get(id) ?? { selectedValue: '', textValue: '' },
      };
      state.drafts.set(stepId, draft);
    }
    return state.drafts.get(stepId);
  },
}));

import { StudentLiveView } from './StudentLiveView';
import { StudentPracticeSet } from './StudentPracticeSet';
import { getPilotLiveLessonDefinition } from '../../lib/liveLesson/definition';

type Element = ReactElement<any>;
function nodes(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as Element;
  return [element, ...nodes(element.props.children)];
}
function find(node: ReactNode, match: (element: Element) => boolean): Element {
  const element = nodes(node).find(match);
  expect(element, 'expected rendered control').toBeDefined();
  return element!;
}
const step = (id: string, responseTypes: LiveResponseType[]): LiveResponseStep => ({ id, label: id, responseTypes });
function props(steps = [step('question', ['choice'])]): StudentLiveViewProps {
  return {
    sessionId: 'session', expectedClassId: 'class', expectedJoinCode: 'join',
    publicState: { cueId: 'cue', tvScreenId: 'tv', status: 'running', showStats: false, updatedAt: 1 },
    definition: {
      id: 'test', title: 'Lesson', responseSteps: steps, allowedStepIds: steps.map(item => item.id),
      studentCues: [{ id: 'cue', responseStepId: steps[0].id, responseStepIds: steps.map(item => item.id), studentScreenId: 'student' }],
      studentScreens: [{ id: 'student', label: 'Question' }], tvScreens: [{ id: 'tv', title: 'Lesson' }],
    } as StudentLiveViewProps['definition'],
  };
}
function render(input: StudentLiveViewProps): Element {
  state.index = 0;
  return StudentLiveView(input);
}
function practice(input: StudentLiveViewProps): Element {
  const component = find(render(input), element => element.type === StudentPracticeSet);
  return StudentPracticeSet(component.props);
}
function cards(input: StudentLiveViewProps): Element[] {
  return nodes(practice(input)).filter(element => typeof element.type === 'function' && element.type.name === 'PracticeQuestionCard')
    .map(element => (element.type as Function)(element.props));
}
const sendButton = (tree: ReactNode) => find(tree, element => element.type === 'button' && /Gửi/.test(String(element.props.children)));

beforeEach(() => {
  state.slots = []; state.index = 0; state.canAnswer = true; state.drafts.clear();
  state.enqueue.mockReset();
  vi.stubGlobal('navigator', { onLine: false });
  vi.stubGlobal('localStorage', { getItem: () => null });
});
afterEach(() => vi.unstubAllGlobals());

describe('student explicit confirmation', () => {
  it.each([
    ['choice', 'A', 'A'], ['route', 'M', 'M'], ['boolean', 'true', true], ['boolean', 'false', false],
  ] as const)('%s selection %s waits for confirmation, then sends the correct type once', async (type, value, expected) => {
    const input = props([step('question', [type])]);
    const tree = render(input);
    const control = find(tree, element => typeof element.type === 'function' && element.type.name === 'ResponseControl');
    const options = (control.type as Function)(control.props);
    // Use the real selected option handler, including the false boolean branch.
    const buttons = nodes(options).filter(element => element.type === 'button');
    const chosen = buttons[type === 'boolean' && value === 'false' ? 1 : 0];
    chosen.props.onClick();
    expect(state.enqueue).not.toHaveBeenCalled();
    const send = sendButton(render(input));
    expect(send.props.disabled).toBe(false);
    await send.props.onClick();
    expect(state.enqueue).toHaveBeenCalledTimes(1);
    expect(state.enqueue).toHaveBeenCalledWith(expect.objectContaining({ stepId: 'question', responseType: type, value: expected }));
  });

  it.each(['text', 'exit_ticket'] as const)('%s retains an explicit text submit path', async type => {
    const input = props([step('question', [type])]);
    const tree = render(input);
    find(tree, element => element.type === 'textarea').props.onChange({ target: { value: 'My explanation' } });
    expect(state.enqueue).not.toHaveBeenCalled();
    await sendButton(render(input)).props.onClick();
    expect(state.enqueue).toHaveBeenCalledWith(expect.objectContaining({ responseType: type, value: 'My explanation' }));
  });

  it.each(['cp-ai-error', 'ai-error-w01'])('%s keeps category plus explanation behind one text confirmation', async id => {
    const question = { ...step(id, ['choice', 'text']), options: [{ value: 'Logical', label: 'Logical' }] };
    const input = props([question]);
    const tree = render(input);
    const control = find(tree, element => typeof element.type === 'function' && element.type.name === 'ResponseControl');
    find((control.type as Function)(control.props), element => element.type === 'button').props.onClick();
    find(tree, element => element.type === 'textarea').props.onChange({ target: { value: 'Missing reasoning' } });
    expect(state.enqueue).not.toHaveBeenCalled();
    expect(nodes(render(input)).filter(element => element.type === 'button' && /Gửi/.test(String(element.props.children)))).toHaveLength(1);
    await sendButton(render(input)).props.onClick();
    expect(state.enqueue).toHaveBeenCalledTimes(1);
    expect(state.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      responseType: 'text', value: JSON.stringify({ category: 'Logical', explanation: 'Missing reasoning' }),
    }));
  });

  it.each(['cp-ai-error', 'ai-error-w01'])('%s keeps free text confirmation without a selected category', async id => {
    const input = props([step(id, ['choice', 'text'])]);
    find(render(input), element => element.type === 'textarea').props.onChange({ target: { value: 'My correction' } });
    expect(state.enqueue).not.toHaveBeenCalled();
    await sendButton(render(input)).props.onClick();
    expect(state.enqueue).toHaveBeenCalledTimes(1);
    expect(state.enqueue).toHaveBeenCalledWith(expect.objectContaining({ stepId: id, responseType: 'text', value: 'My correction' }));
  });
});

describe('mixed selection and text confirmation', () => {
  const pilot = getPilotLiveLessonDefinition();
  const questions = [
    ...['model', 'quick-check', 'notice-wonder'].map(id => pilot.responseSteps.find(item => item.id === id)!),
    step('route-with-text', ['route', 'text']),
    step('boolean-with-text', ['boolean', 'text']),
  ];

  it.each(questions)('$id explicitly confirms selection with blank text, then independently confirms free text', async question => {
    const input = props([question]); // Deliberately no definitionKey: legacy pilot path.
    expect(input.definitionKey).toBeUndefined();
    const tree = render(input);
    const control = find(tree, element => typeof element.type === 'function' && element.type.name === 'ResponseControl');
    const choices = nodes((control.type as Function)(control.props)).filter(element => element.type === 'button');
    const type = question.responseTypes.includes('route') ? 'route' : question.responseTypes.includes('boolean') ? 'boolean' : 'choice';
    choices[type === 'boolean' ? 1 : 0].props.onClick();
    expect(state.enqueue).not.toHaveBeenCalled();
    const selectedValue = state.drafts.get(question.id).selectedValue;
    const selectedTree = render(input);
    const confirmChoice = find(selectedTree, element => element.type === 'button' && element.props.children === 'Gửi lựa chọn');
    const confirmText = find(selectedTree, element => element.type === 'button' && element.props.children === 'Gửi nội dung viết');
    expect(confirmChoice.props.disabled).toBe(false);
    expect(nodes(selectedTree).filter(element => element.type === 'button' && /Gửi/.test(String(element.props.children)))).toHaveLength(2);
    await confirmChoice.props.onClick();
    expect(state.enqueue).toHaveBeenCalledTimes(1);
    expect(state.enqueue).toHaveBeenLastCalledWith(expect.objectContaining({
      stepId: question.id, responseType: type, value: type === 'boolean' ? false : selectedValue,
    }));
    find(selectedTree, element => element.type === 'textarea').props.onChange({ target: { value: 'My written answer' } });
    expect(state.enqueue).toHaveBeenCalledTimes(1);
    // A text send must retain its type even when a selection is still present.
    await find(render(input), element => element.type === 'button' && element.props.children === confirmText.props.children).props.onClick();
    expect(state.enqueue).toHaveBeenCalledTimes(2);
    expect(state.enqueue).toHaveBeenLastCalledWith(expect.objectContaining({
      stepId: question.id, responseType: 'text', value: 'My written answer',
    }));
  });
});

describe('practice submission locks and draft acknowledgement', () => {
  const input = () => props([step('first', ['text']), step('second', ['text'])]);

  it.each(['waiting', 'showStats', 'closed', 'publicStateError'] as const)('locks practice UI and shared submit boundary when %s', async lock => {
    const request = input();
    if (lock === 'waiting') state.canAnswer = false;
    if (lock === 'showStats') request.publicState.showStats = true;
    if (lock === 'closed') request.publicState.status = 'closed';
    if (lock === 'publicStateError') request.publicStateError = 'Listener failed';
    const component = find(render(request), element => element.type === StudentPracticeSet);
    cards(request);
    state.drafts.get('first').setTextValue('Answer');
    const card = cards(request)[0];
    const send = sendButton(card);
    expect.soft(send.props.disabled).toBe(true);
    expect.soft(find(card, element => element.type === 'textarea').props.readOnly).toBe(true);
    // Invoke despite disabled UI to prove both handler and shared boundary reject.
    await send.props.onClick();
    const record = vi.fn();
    await component.props.onSubmit(request.definition.responseSteps[0], 'Answer', record);
    expect(state.enqueue).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
    expect(state.drafts.get('first').recordSubmission).not.toHaveBeenCalled();
  });

  it('sends distinct practice questions and records only accepted drafts', async () => {
    const request = input();
    cards(request);
    state.drafts.get('first').setTextValue('First answer');
    state.drafts.get('second').setTextValue('Second answer');
    for (const card of cards(request)) await sendButton(card).props.onClick();
    expect(state.enqueue.mock.calls.map(([payload]) => [payload.stepId, payload.value])).toEqual([
      ['first', 'First answer'], ['second', 'Second answer'],
    ]);
    for (const draft of ['first', 'second'].map(id => state.drafts.get(id))) expect(draft.recordSubmission).toHaveBeenCalledTimes(1);
  });

  it.each(['too long', 'not allowed', 'storage failure'])('does not mark a rejected draft submitted: %s', async failure => {
    const request = input();
    if (failure === 'not allowed') request.definition.allowedStepIds = ['second'];
    cards(request);
    state.drafts.get('first').setTextValue(failure === 'too long' ? 'x'.repeat(2001) : 'Answer');
    if (failure === 'storage failure') state.enqueue.mockImplementation(() => { throw new Error('Storage full'); });
    await sendButton(cards(request)[0]).props.onClick();
    expect(state.drafts.get('first').recordSubmission).not.toHaveBeenCalled();
  });
});
