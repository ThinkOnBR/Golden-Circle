import React from 'react';

export const LogoMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Mantido como backup caso necessário em outros contextos, mas as logos principais agora são imagens */}
    <path d="M50 5 L95 25 V65 L50 95 L5 65 V25 L50 5 Z" stroke="currentColor" strokeWidth="2" className="text-gold-600"/>
    <path d="M50 12 L88 29 V62 L50 88 L12 62 V29 L50 12 Z" fill="currentColor" className="text-gold-900/20"/>
    <path d="M50 12 V35 M50 95 V70" stroke="currentColor" strokeWidth="1" className="text-gold-700"/>
    <text x="50" y="62" fontSize="40" fontFamily="serif" textAnchor="middle" fill="currentColor" className="text-gold-400 font-serif font-bold">C</text>
  </svg>
);

export const VerticalLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex flex-col items-center ${className}`}>
    <img 
      src="https://capitalgoldencircle.com.br/public/imgs/logo_externa.png" 
      alt="Capital Golden Circle" 
      className="max-w-[250px] h-auto object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.15)]"
    />
  </div>
);

export const HorizontalLogo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center ${className}`}>
    <img 
      src="https://capitalgoldencircle.com.br/public/imgs/logo_interna.png" 
      alt="Capital Golden Circle" 
      className="max-h-10 w-auto object-contain"
    />
  </div>
);