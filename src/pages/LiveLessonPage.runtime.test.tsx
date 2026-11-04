import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { getPilotLiveLessonDefinition } from '../lib/liveLesson/definition';
import type { LiveLessonSession, LivePublicState } from '../lib/liveLesson/types';

const state = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, search: '?mode=tv-control', close: vi.fn(),
}));
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [state.slots[index], (value: unknown) => {
      state.slots[index] = typeof value === 'function' ? value(state.slots[index]) : value;
    }];
  },
  useEffect: () => {},
  useMemo: (factory: () => unknown) => factory(),
}));
vi.mock('react-router-dom', () => ({ useParams: () => ({ sessionId: 'qa-session' }), useLocation: () => ({ search: state.search }) }));
vi.mock('../lib/firebase', () => ({ auth: { currentUser: { uid: 'owner', isAnonymous: false } } }));
vi.mock('../services/liveLessonService', () => ({
  closeLiveLessonSession: state.close, getLiveLessonSession: vi.fn(),
  subscribeToLivePublicState: vi.fn(), subscribeToTeacherSession: vi.fn(), updateLiveLessonState: vi.fn(),
}));

import { LiveLessonPage } from './LiveLessonPage';
import { TvPresenterControls, type TvPresenterControlsProps } from '../components/liveLesson/TvPresenterControls';
import { TvLiveView } from '../components/liveLesson/TvLiveView';
import { StudentLiveView } from '../components/liveLesson/StudentLiveView';

const definition = getPilotLiveLessonDefinition();
const session = (): LiveLessonSession => ({
  id: 'qa-session', schemaVersion: 1, lessonId: definition.lessonId, title: definition.title,
  classId: 'class', teacherUid: 'owner', allowedStepIds: definition.allowedStepIds,
  expiresAt: Date.now() + 3_600_000, status: 'running', currentCueId: definition.cues[0].id,
  currentTvScreenId: definition.cues[0].tvScreenId, publicStateEnabled: true,
  publicStatsEnabled: false, createdAt: 1, updatedAt: 1,
});
const publicState = (): LivePublicState => ({
  cueId: definition.cues[0].id, tvScreenId: definition.cues[0].tvScreenId,
  status: 'running', showStats: false, updatedAt: 1,
});
const render = () => { state.cursor = 0; return LiveLessonPage(); };
const elements = (node: ReactNode): ReactElement<{ children?: ReactNode }>[] => Array.isArray(node)
  ? node.flatMap(elements)
  : isValidElement<{ children?: ReactNode }>(node) ? [node, ...elements(node.props.children)] : [];
const controls = () => elements(render().props.presenterControls)
  .find(node => node.type === TvPresenterControls)!.props as unknown as TvPresenterControlsProps;

beforeEach(() => {
  state.search = '?mode=tv-control'; state.cursor = 0; state.close.mockReset();
  // State order in LiveLessonPage: auth, session, public snapshot/errors, definition, loading, presenter action.
  state.slots = [{ uid: 'owner', isAnonymous: false }, true, session(), publicState(), null, null, definition, false, null, false, null];
});
afterEach(() => vi.unstubAllGlobals());

describe('Presenter close service integration', () => {
  it('calls the existing close service, blocks while busy, then renders the closed snapshot', async () => {
    let finish!: (value: LiveLessonSession) => void;
    state.close.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    controls().onClose();
    expect(state.close).toHaveBeenCalledExactlyOnceWith('qa-session');
    expect(controls().busy).toBe(true);
    controls().onClose();
    expect(state.close).toHaveBeenCalledTimes(1);
    finish({ ...session(), status: 'closed', updatedAt: 2, publicStateEnabled: false });
    await vi.waitFor(() => expect(controls().session.status).toBe('closed'));
    expect(controls().busy).toBe(false);
    controls().onClose();
    expect(state.close).toHaveBeenCalledTimes(1);
  });

  it('keeps the running session on failure and allows retry', async () => {
    state.close.mockRejectedValueOnce(new Error('Không thể đóng phiên.'));
    controls().onClose();
    await vi.waitFor(() => expect(controls().error).toBe('Không thể đóng phiên.'));
    expect(controls().busy).toBe(false);
    expect(controls().session.status).toBe('running');
    state.close.mockResolvedValueOnce({ ...session(), status: 'closed', updatedAt: 2 });
    controls().onClose();
    await vi.waitFor(() => expect(controls().session.status).toBe('closed'));
    expect(state.close).toHaveBeenCalledTimes(2);
    expect(controls().error).toBeNull();
  });
});

describe('public listener failure at the runtime boundary', () => {
  it.each(['tv', 'student'])('replaces stale %s runtime with recovery UI, preserves known closure', mode => {
    state.search = `?mode=${mode}`;
    const view = mode === 'tv' ? TvLiveView : StudentLiveView;
    expect(render().type).toBe(view);
    state.slots[4] = 'Không thể cập nhật phiên; hãy tải lại.';
    const error = render();
    expect(error.type).not.toBe(view);
    expect(error.props.message).toBe('Không thể cập nhật phiên; hãy tải lại.');
    state.slots[3] = { ...publicState(), status: 'closed' };
    expect(render().type).toBe(view);
    expect(render().props.publicState.status).toBe('closed');
  });
});
