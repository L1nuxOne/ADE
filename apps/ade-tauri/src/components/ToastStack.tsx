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
        className="toast__dismiss"
        aria-label="Dismiss toast"
        onClick={() => onDismiss(toast.id)}
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
};
