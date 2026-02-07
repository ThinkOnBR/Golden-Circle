import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './Icons';
import { HorizontalLogo } from './Logo';
import { UserRole } from '../types';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null; // Should be handled by protected route, but safety check

  const NavItem: React.FC<{ path: string; icon: any; label: string }> = ({ path, icon: Icon, label }) => {
    const isActive = location.pathname === path;
    return (
      <button 
        onClick={() => navigate(path)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-lg transition-all border-l-2 ${
          isActive 
            ? 'bg-zinc-900/80 border-gold-500 text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]' 
            : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
        }`}
      >
        <Icon />
        <span className="font-sans text-sm tracking-wide uppercase font-semibold">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-obsidian flex text-zinc-200 font-sans selection:bg-gold-900 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-black border-r border-zinc-900 flex flex-col fixed h-full z-20 hidden md:flex">
        <div className="p-8">
           <HorizontalLogo />
        </div>
        
        <nav className="flex-1 space-y-1 pr-4">
          <NavItem path="/" icon={Icons.Dashboard} label="Dashboard" />
          <NavItem path="/challenges" icon={Icons.Briefcase} label="Desafios" />
          <NavItem path="/meetings" icon={Icons.Calendar} label="Reuniões" />
          <NavItem path="/members" icon={Icons.Users} label="Membros" />
          {user.role !== UserRole.PARTICIPANT && (
            <NavItem path="/admin" icon={Icons.Shield} label="Admin" />
          )}
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold overflow-hidden border border-zinc-700">
               {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : user.name[0]}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm text-white truncate">{user.name}</div>
              <div className="text-xs text-zinc-500 truncate">{user.company}</div>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 text-xs text-red-500 hover:text-red-400 px-4 py-2">
            <Icons.LogOut /> Sair da conta
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-black border-b border-zinc-900 z-30 p-4 flex justify-between items-center">
        <HorizontalLogo className="scale-75 origin-left" />
        <button onClick={logout}><Icons.LogOut /></button>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 md:p-12 pt-20 md:pt-12 max-w-7xl mx-auto w-full">
        <div className="animate-fade-in-up">
          <Outlet />
        </div>
      </main>

      {/* Simple global styles for animation */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};