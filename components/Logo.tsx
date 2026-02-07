import React from 'react';

export const LogoMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer Shield */}
    <path d="M50 5 L95 25 V65 L50 95 L5 65 V25 L50 5 Z" stroke="currentColor" strokeWidth="2" className="text-gold-600"/>
    {/* Inner Fill */}
    <path d="M50 12 L88 29 V62 L50 88 L12 62 V29 L50 12 Z" fill="currentColor" className="text-gold-900/20"/>
    {/* Decorative Lines */}
    <path d="M50 12 V35 M50 95 V70" stroke="currentColor" strokeWidth="1" className="text-gold-700"/>
    {/* Monogram */}
    <text x="50" y="62" fontSize="40" fontFamily="serif" textAnchor="middle" fill="currentColor" className="text-gold-400 font-serif font-bold">C</text>
  </svg>
);

export const VerticalLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex flex-col items-center ${className}`}>
    <LogoMark className="w-24 h-24 text-gold-500 mb-3 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]" />
    <h1 className="font-serif text-3xl tracking-[0.25em] text-gold-100 uppercase">Confraria</h1>
    <div className="w-12 h-[1px] bg-gold-600/50 mt-2"></div>
  </div>
);

export const HorizontalLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <LogoMark className="w-8 h-8 text-gold-500" />
    <h1 className="font-serif text-lg tracking-[0.2em] text-gold-100 uppercase font-bold">Confraria</h1>
  </div>
);