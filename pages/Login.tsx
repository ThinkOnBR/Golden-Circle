import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { VerticalLogo } from '../components/Logo';
import { Input, PasswordInput, Button } from '../components/UI';
import { useToast } from '../components/Toast';

export const Login: React.FC = () => {
  const { login, loading, error, clearError } = useAuth();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoverMode, setRecoverMode] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      addToast('Por favor, preencha todos os campos.', 'error');
      return;
    }
    login(email, password).catch(() => {
      // Error handled by context state
    });
  };

  const handleForgotPassword = async () => {
    if (!email) {
      addToast('Digite seu e-mail acima para recuperar a senha.', 'info');
      return;
    }
    try {
      await dataService.recoverPassword(email);
      addToast('E-mail de recuperação enviado! Verifique sua caixa de entrada.', 'success');
      setRecoverMode(false);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
         addToast('E-mail não encontrado no sistema.', 'error');
      } else {
         addToast('Erro ao enviar e-mail. Tente novamente.', 'error');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (recoverMode) handleForgotPassword();
      else handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold-900/20 via-black to-black opacity-50"></div>
      <div className="z-10 w-full max-w-md p-8 bg-zinc-900/40 border border-zinc-800 backdrop-blur-md rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <VerticalLogo className="mb-4" />
          <p className="text-zinc-500 text-sm mt-4 uppercase tracking-widest">
            {recoverMode ? 'Recuperação de Acesso' : 'Acesso Restrito a Membros'}
          </p>
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
          
          {!recoverMode && (
            <div>
              <PasswordInput 
                placeholder="Senha" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className={`text-xs text-center p-3 rounded border ${
              error.includes("Regras") || error.includes("PERMISSÃO")
               ? "bg-red-900 text-white border-red-500 font-bold" 
               : "bg-red-900/10 text-red-500 border-red-900/30"
            }`}>
              {error}
            </div>
          )}

          {recoverMode ? (
             <Button className="w-full" onClick={handleForgotPassword}>
               Enviar Link de Redefinição
             </Button>
          ) : (
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? 'Conectando...' : 'Entrar'}
            </Button>
          )}

          <div className="text-center pt-2">
            <button 
              onClick={() => {
                setRecoverMode(!recoverMode);
                clearError();
              }}
              className="text-xs text-zinc-600 hover:text-gold-500 transition-colors"
            >
              {recoverMode ? 'Voltar para Login' : 'Esqueci minha senha / Primeiro acesso'}
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