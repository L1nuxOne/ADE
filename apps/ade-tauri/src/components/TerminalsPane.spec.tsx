import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import TerminalsPane from './TerminalsPane';

vi.mock('../hooks/useTerminal', () => ({
  useTerminal: vi.fn(),
}));

import { useTerminal } from '../hooks/useTerminal';

const mockedUseTerminal = useTerminal as unknown as Mock;

describe('TerminalsPane', () => {
  beforeEach(() => {
    mockedUseTerminal.mockReset();
  });

  const baseHandlers = {
    onError: vi.fn(),
    onInfo: vi.fn(),
  };

  type TerminalSnapshot = {
    mount: (node: HTMLDivElement | null) => void;
    status: 'starting' | 'ready' | 'closed';
    error: string | null;
    lastExit: string | null;
    shellLabel: string | null;
    supportsWsl: boolean;
    isResolving: boolean;
    sendInterrupt: () => Promise<void>;
  };

  const snapshot = (overrides: Partial<TerminalSnapshot> = {}): TerminalSnapshot => ({
    mount: vi.fn(),
    status: 'ready',
    error: null,
    lastExit: null,
    shellLabel: 'bash',
    supportsWsl: false,
    isResolving: false,
    sendInterrupt: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  it('hides the WSL toggle when support flag is false', () => {
    mockedUseTerminal
      .mockReturnValueOnce(snapshot())
      .mockReturnValueOnce(snapshot({ shellLabel: 'engine', supportsWsl: false }));

    render(<TerminalsPane handlers={baseHandlers} />);

    expect(screen.queryByText(/Use WSL bash/i)).not.toBeInTheDocument();
  });

  it('shows the WSL toggle when support flag is true', () => {
    mockedUseTerminal
      .mockReturnValueOnce(snapshot({ supportsWsl: true, isResolving: true }))
      .mockReturnValueOnce(snapshot({ shellLabel: 'engine', supportsWsl: false }));

    render(<TerminalsPane handlers={baseHandlers} />);

    const toggle = screen.getByLabelText(/Use WSL bash/i) as HTMLInputElement;
    expect(toggle).toBeInTheDocument();
    expect(toggle.disabled).toBe(true);
  });

  it('sends an interrupt when the button is pressed', async () => {
    let latestMe: TerminalSnapshot | undefined;
    mockedUseTerminal.mockImplementation(({ id }: { id: string }) => {
      if (id === 'me') {
        latestMe = snapshot();
        return latestMe;
      }
      return snapshot({ shellLabel: 'engine', supportsWsl: false });
    });

    render(<TerminalsPane handlers={baseHandlers} />);

    const buttons = await screen.findAllByRole('button', { name: /Send Ctrl\+C/i });
    const target = buttons.at(-1) as HTMLButtonElement | undefined;
    expect(target).toBeDefined();
    target?.click();
    expect(latestMe?.sendInterrupt).toHaveBeenCalledTimes(1);
  });
});
