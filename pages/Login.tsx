import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { VerticalLogo } from '../components/Logo';
import { Input, PasswordInput, Button } from '../components/UI';

export const Login: React.FC = () => {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    login(email, password);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold-900/20 via-black to-black opacity-50"></div>
      <div className="z-10 w-full max-w-md p-8 bg-zinc-900/40 border border-zinc-800 backdrop-blur-md rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <VerticalLogo className="mb-4" />
          <p className="text-zinc-500 text-sm mt-4 uppercase tracking-widest">Acesso Restrito a Membros</p>
        </div>
        <div className="space-y-4">
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
          {error && <div className="text-red-500 text-xs text-center">{error}</div>}
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar'}
          </Button>
          <div className="text-center">
            <button className="text-xs text-zinc-600 hover:text-gold-500 transition-colors">Esqueci minha senha</button>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-zinc-800 text-center">
           <p className="text-[10px] text-zinc-600 mb-2 uppercase">Credenciais Demo</p>
           <div className="flex justify-center gap-2">
             <button onClick={() => {setEmail('sanroma@thinkondigital.com.br'); setPassword('123456')}} className="text-[10px] text-gold-600 border border-gold-900/50 px-2 py-1 rounded bg-gold-900/10 hover:bg-gold-900/30">Master</button>
             <button onClick={() => {setEmail('arthur@kingsman.com'); setPassword('123456')}} className="text-[10px] text-zinc-500 border border-zinc-800 px-2 py-1 rounded hover:bg-zinc-800">User 1</button>
           </div>
        </div>
      </div>
    </div>
  );
};