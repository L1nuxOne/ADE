import { useCallback, useMemo, useState } from 'react';
import TerminalsPane from './components/TerminalsPane';
import { ToastStack, Toast } from './components/ToastStack';

export interface ToastEntry {
  id: string;
  title: string;
  message: string;
}

const App = () => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const pushToast = useCallback((toast: Omit<ToastEntry, 'id'>) => {
    setToasts((current) => {
      const entry: ToastEntry = {
        ...toast,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      };
      return [...current.slice(-3), entry];
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const terminalHandlers = useMemo(
    () => ({
      onError: (message: string) =>
        pushToast({ title: 'Terminal error', message }),
      onInfo: (message: string) =>
        pushToast({ title: 'Terminal info', message }),
    }),
    [pushToast],
  );

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1 className="app-shell__title">ADE • Terminals</h1>
      </header>
      <main className="app-shell__content">
        <TerminalsPane handlers={terminalHandlers} />
      </main>
      <ToastStack>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </ToastStack>
    </div>
  );
};

export default App;
