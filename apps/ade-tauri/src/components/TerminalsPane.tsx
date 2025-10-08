import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { TerminalSurface } from './TerminalSurface';

interface TerminalHandlers {
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}

interface TerminalsPaneProps {
  handlers: TerminalHandlers;
}

const TerminalsPane = ({ handlers }: TerminalsPaneProps) => {
  const [useWsl, setUseWsl] = useState(false);
  const meTerminal = useTerminal({
    id: 'me',
    mode: 'pty',
    useWsl,
    onError: handlers.onError,
    onInfo: handlers.onInfo,
  });
  const engineTerminal = useTerminal({
    id: 'engine',
    mode: 'engine',
    onError: handlers.onError,
    onInfo: handlers.onInfo,
  });

  const engineMeta = useMemo(
    () => [
      `source: heartbeat`,
      engineTerminal.status ? `status: ${engineTerminal.status}` : 'status: starting',
    ],
    [engineTerminal.status],
  );

  const meMeta = useMemo(
    () => {
      const base = [`shell: ${meTerminal.shellLabel ?? 'resolving'}`];
      if (meTerminal.lastExit) {
        base.push(`exit: ${meTerminal.lastExit}`);
      }
      return base;
    },
    [meTerminal.shellLabel, meTerminal.lastExit],
  );

  const toggleRef = useRef<HTMLInputElement | null>(null);
  const syncToggle = useCallback(() => {
    if (!toggleRef.current) {
      return;
    }
    toggleRef.current.indeterminate = meTerminal.isResolving;
  }, [meTerminal.isResolving]);

  useEffect(syncToggle, [syncToggle]);

  useEffect(() => {
    if (!meTerminal.isResolving) {
      return;
    }
    handlers.onInfo('Resolving shell executable…');
  }, [handlers, meTerminal.isResolving]);

  useEffect(() => {
    if (!meTerminal.error) {
      return;
    }
    handlers.onError(meTerminal.error);
  }, [handlers, meTerminal.error]);

  useEffect(() => {
    if (!engineTerminal.error) {
      return;
    }
    handlers.onError(engineTerminal.error);
  }, [handlers, engineTerminal.error]);

  return (
    <div className="terminals-pane">
      <section className="terminal-card" aria-label="Interactive terminal">
        <header className="terminal-card__header">
          <h2 className="terminal-card__title">Me</h2>
          <div className="terminal-card__actions">
            <button
              type="button"
              className="terminal-card__button"
              onClick={() => {
                void meTerminal.sendInterrupt();
              }}
              disabled={meTerminal.status !== 'ready'}
            >
              Send Ctrl+C
            </button>
            {meMeta.length > 0 && (
              <div className="terminal-meta" aria-live="polite">
                {meMeta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}
            {meTerminal.supportsWsl && (
              <label className="toggle">
                <input
                  ref={toggleRef}
                  type="checkbox"
                  checked={useWsl}
                  onChange={(event) => setUseWsl(event.target.checked)}
                  disabled={meTerminal.isResolving}
                />
                Use WSL bash
              </label>
            )}
          </div>
        </header>
        <div className="terminal-card__body">
          <TerminalSurface
            label="Interactive terminal"
            mount={meTerminal.mount}
            status={meTerminal.status}
          />
        </div>
      </section>
      <section className="terminal-card" aria-label="Engine terminal">
        <header className="terminal-card__header">
          <h2 className="terminal-card__title">Engine</h2>
          {engineMeta.length > 0 && (
            <div className="terminal-meta" aria-live="polite">
              {engineMeta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          )}
        </header>
        <div className="terminal-card__body">
          <TerminalSurface
            label="Engine terminal"
            mount={engineTerminal.mount}
            status={engineTerminal.status}
          />
        </div>
      </section>
    </div>
  );
};

export default TerminalsPane;
