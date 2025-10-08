import { PropsWithChildren } from 'react';
import type { ToastEntry } from '../App';

interface ToastProps {
  toast: ToastEntry;
  onDismiss: (id: string) => void;
}

export const ToastStack = ({ children }: PropsWithChildren) => {
  if (!children) {
    return null;
  }
  return <div className="toast-stack">{children}</div>;
};

export const Toast = ({ toast, onDismiss }: ToastProps) => {
  return (
    <div className="toast" role="status">
      <div className="toast__header">
        <h2 className="toast__title">{toast.title}</h2>
      </div>
      <p className="toast__message">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        style={{
          position: 'absolute',
          top: '0.35rem',
          right: '0.5rem',
          background: 'transparent',
          color: 'var(--text-muted)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
        }}
      >
        ✕
      </button>
    </div>
  );
};
