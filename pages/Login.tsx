import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { VerticalLogo } from '../components/Logo';
import { Input, PasswordInput, Button } from '../components/UI';
import { useToast } from '../components/Toast';

export const Login: React.FC = () => {
  const { login, loading, error } = useAuth();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      addToast('Por favor, preencha todos os campos.', 'error');
      return;
    }
    login(email, password).catch(() => {
      // Error handled by context state
    });
  };

  const handleForgotPassword = () => {
    addToast('Funcionalidade indisponível no momento. Entre em contato com a administração para redefinir sua senha.', 'info');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold-900/20 via-black to-black opacity-50"></div>
      <div className="z-10 w-full max-w-md p-8 bg-zinc-900/40 border border-zinc-800 backdrop-blur-md rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <VerticalLogo className="mb-4" />
          <p className="text-zinc-500 text-sm mt-4 uppercase tracking-widest">Acesso Restrito a Membros</p>
        </div>
        <div className="space-y-4" onKeyDown={handleKeyDown}>
          <div>
            <Input 
              placeholder="E-mail Corporativo" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <PasswordInput 
              placeholder="Senha" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-red-500 text-xs text-center bg-red-900/10 border border-red-900/30 p-2 rounded">{error}</div>}
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar'}
          </Button>
          <div className="text-center">
            <button 
              onClick={handleForgotPassword}
              className="text-xs text-zinc-600 hover:text-gold-500 transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-zinc-800 text-center text-[10px] text-zinc-700">
           &copy; {new Date().getFullYear()} Capital Golden Circle. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};