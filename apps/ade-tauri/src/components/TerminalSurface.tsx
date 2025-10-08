import type { ReactNode } from 'react';
import type { TerminalStatus } from '../hooks/useTerminal';

interface TerminalSurfaceProps {
  mount: (node: HTMLDivElement | null) => void;
  status: TerminalStatus;
  label: string;
  overlay?: ReactNode;
}

const statusLabel = (status: TerminalStatus) => {
  switch (status) {
    case 'starting':
      return 'Starting…';
    case 'closed':
      return 'Session closed';
    default:
      return null;
  }
};

export const TerminalSurface = ({ mount, status, label, overlay }: TerminalSurfaceProps) => {
  const message = statusLabel(status);
  return (
    <div className="terminal-surface">
      <div className="terminal-surface__canvas" aria-label={label} ref={mount} />
      {message && (
        <div className="terminal-surface__overlay" role="status" aria-live="polite">
          {message}
        </div>
      )}
      {overlay}
    </div>
  );
};
