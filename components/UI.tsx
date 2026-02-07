import React, { useState } from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyle = "px-4 py-2 rounded text-sm font-bold tracking-wider transition-all duration-200 uppercase";
  const variants = {
    primary: "bg-gold-600 text-black hover:bg-gold-500 hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]",
    secondary: "bg-transparent border border-zinc-700 text-zinc-400 hover:border-gold-600 hover:text-gold-500",
    danger: "bg-red-900/20 text-red-500 border border-red-900 hover:bg-red-900/40"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    className="w-full bg-zinc-900/50 border border-zinc-800 rounded p-3 text-zinc-200 focus:outline-none focus:border-gold-600 focus:ring-1 focus:ring-gold-600 transition-colors"
    {...props}
  />
);

export const PasswordInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className="w-full bg-zinc-900/50 border border-zinc-800 rounded p-3 text-zinc-200 focus:outline-none focus:border-gold-600 focus:ring-1 focus:ring-gold-600 transition-colors pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-gold-500 focus:outline-none"
        tabIndex={-1}
      >
        {show ? (
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea 
    className="w-full bg-zinc-900/50 border border-zinc-800 rounded p-3 text-zinc-200 focus:outline-none focus:border-gold-600 focus:ring-1 focus:ring-gold-600 transition-colors"
    {...props}
  />
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-charcoal border border-zinc-800 p-6 rounded-lg shadow-xl ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'bg-zinc-800' }) => (
  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${color} text-zinc-300 border border-white/5`}>
    {children}
  </span>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-obsidian border border-gold-600/30 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-zinc-900/50 p-4 border-b border-zinc-800 flex justify-between items-center shrink-0">
          <h3 className="font-serif text-gold-500 text-lg tracking-widest">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-8 border-l-2 border-gold-600 pl-4">
    <h2 className="text-2xl font-serif text-white tracking-widest">{title}</h2>
    {subtitle && <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>}
  </div>
);