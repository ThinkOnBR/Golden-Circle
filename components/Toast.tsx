import React, { createContext, useContext, useState, useCallback } from 'react';
import { Icons } from './Icons';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto min-w-[300px] max-w-md p-4 rounded-lg shadow-2xl border-l-4 flex items-start gap-3 transform transition-all duration-300 animate-fade-in-left
              ${toast.type === 'success' ? 'bg-zinc-900 text-white border-gold-500' : ''}
              ${toast.type === 'error' ? 'bg-red-900/90 text-white border-red-500' : ''}
              ${toast.type === 'info' ? 'bg-blue-900/90 text-white border-blue-500' : ''}
            `}
          >
            <div className={`mt-0.5 ${toast.type === 'success' ? 'text-gold-500' : 'text-white'}`}>
              {toast.type === 'success' && <Icons.Check className="w-5 h-5" />}
              {toast.type === 'error' && <span className="font-bold">!</span>}
              {toast.type === 'info' && <span className="font-bold">i</span>}
            </div>
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button onClick={() => removeToast(toast.id)} className="text-zinc-500 hover:text-white">
              &times;
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-left {
          animation: fadeInLeft 0.3s ease-out forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};