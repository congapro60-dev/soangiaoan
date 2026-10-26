import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';

vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => [initial, vi.fn()],
  useRef: (current: unknown) => ({ current }),
  useCallback: (callback: unknown) => callback,
  useEffect: () => {},
}));

import { TvPresenterControls, type TvPresenterControlsProps } from './TvPresenterControls';

type NodeProps = { children?: ReactNode; disabled?: boolean; role?: string; onClick?: () => void };
const elements = (node: ReactNode): ReactElement<NodeProps>[] => Array.isArray(node)
  ? node.flatMap(elements)
  : isValidElement<NodeProps>(node) ? [node, ...elements(node.props.children)] : [];
const text = (node: ReactNode): string => Array.isArray(node) ? node.map(text).join('')
  : isValidElement<NodeProps>(node) ? text(node.props.children) : typeof node === 'string' ? node : '';
const render = (props: TvPresenterControlsProps) => elements(TvPresenterControls(props));
const button = (nodes: ReactElement<NodeProps>[], label: string) => nodes.find(node => node.type === 'button' && text(node) === label)!;
const props = (): TvPresenterControlsProps => ({
  definition: { cues: [{ id: 'P40', tvScreenId: 'S9' }] } as TvPresenterControlsProps['definition'],
  session: { currentCueId: 'P40', status: 'running' },
  onNavigate: vi.fn(), onToggleStatus: vi.fn(), onClose: vi.fn(),
});

beforeEach(() => { vi.unstubAllGlobals(); });

describe('Presenter closure', () => {
  it('requires explicit confirmation, permits cancel, and closes once confirmed at the last cue', () => {
    const input = props();
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal('window', { confirm });
    const nodes = render(input);
    expect(button(nodes, 'Đóng phiên')).toBeDefined();
    expect(button(nodes, 'Sau →').props.disabled).toBe(true);
    button(nodes, 'Đóng phiên').props.onClick!();
    expect(input.onClose).not.toHaveBeenCalled();
    button(nodes, 'Đóng phiên').props.onClick!();
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(input.onClose).toHaveBeenCalledOnce();
  });

  it('disables closure while busy or already closed', () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('window', { confirm });
    for (const input of [{ ...props(), busy: true }, { ...props(), session: { currentCueId: 'P40', status: 'closed' as const } }]) {
      const close = button(render(input), 'Đóng phiên');
      expect(close.props.disabled).toBe(true);
      close.props.onClick!();
      expect(input.onClose).not.toHaveBeenCalled();
    }
    expect(confirm).not.toHaveBeenCalled();
  });
});
