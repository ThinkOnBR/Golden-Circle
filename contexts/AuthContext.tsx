import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | undefined;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Key for persisting session ID
const SESSION_KEY = 'CAPITAL_GOLDEN_CIRCLE_SESSION_ID';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Start true to check session
  const [error, setError] = useState<string | undefined>();

  // Restore Session on Mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedId = localStorage.getItem(SESSION_KEY);
      if (storedId) {
        try {
          const restoredUser = await dataService.getUserById(storedId);
          if (restoredUser) {
            setUser(restoredUser);
          } else {
            // Invalid session ID
            localStorage.removeItem(SESSION_KEY);
          }
        } catch (e) {
          console.error("Session restore failed", e);
          localStorage.removeItem(SESSION_KEY);
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const loggedUser = await dataService.login(email, pass);
      setUser(loggedUser);
      localStorage.setItem(SESSION_KEY, loggedUser.id);
    } catch (e: any) {
      setError(e.message || "Erro ao realizar login");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {!loading && children} 
      {/* 
        Prevent rendering children while checking session to avoid 
        flash of login screen or protected route redirects 
      */}
      {loading && (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-gold-500 border-zinc-800 animate-spin"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};