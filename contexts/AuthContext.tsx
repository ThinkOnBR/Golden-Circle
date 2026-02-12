import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { dataService } from '../services/dataService';
import { auth, db } from '../services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | undefined;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Tenta buscar os dados detalhados no Firestore
          let dbUser = await dataService.getUserById(firebaseUser.uid);
          
          // 2. AUTO-HEAL: Se for o Master e não tiver perfil
          if (!dbUser && firebaseUser.email?.toLowerCase() === 'sanroma@thinkondigital.com.br') {
             console.warn("Master user detected without profile. Attempting Auto-Heal...");
             const newMasterUser: User = {
                id: firebaseUser.uid,
                name: 'Sanroma',
                email: firebaseUser.email,
                phone: '11999999999',
                company: 'ThinkOn Digital',
                companies: ['ThinkOn Digital'],
                role: UserRole.MASTER,
                status: UserStatus.ACTIVE,
                bio: 'Master Admin.',
                revenue: '100M+'
            };
            
            try {
              // Força a escrita direta
              await setDoc(doc(db, "users", firebaseUser.uid), newMasterUser);
              // Inicializa dados base
              await dataService.initializeDB();
              dbUser = newMasterUser;
            } catch (writeError: any) {
              console.error("Auto-Heal Failed:", writeError);
              if (writeError.code === 'permission-denied') {
                setError("ACESSO BLOQUEADO: Vá no Console Firebase > Firestore > Aba 'Segurança' (ou 'Regras') e altere para 'allow read, write: if true;'");
                setLoading(false);
                return;
              }
            }
          }

          if (dbUser) {
            setUser(dbUser);
          } else {
             // Tratamento para usuários normais sem perfil
             const users = await dataService.getAllUsers();
             const match = users.find(u => u.email === firebaseUser.email);
             if (match) {
               setUser({ ...match, id: firebaseUser.uid });
             } else {
               console.warn("User authenticated but profile not found in Firestore.");
               setUser(null); 
             }
          }
        } catch (e: any) {
          console.error("Error fetching user profile", e);
          if (e.code === 'permission-denied') {
             setError("ACESSO BLOQUEADO: Verifique a aba 'Segurança' no Firebase Console.");
          } else if (e.message.includes("offline") || e.code === 'unavailable' || e.message.includes("not found")) {
             setError("BANCO DE DADOS NÃO ENCONTRADO: O Firebase não achou o banco '(default)'. Verifique o nome do banco no console e atualize o arquivo 'services/firebaseConfig.ts'.");
          }
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const loggedUser = await dataService.login(email, pass);
      setUser(loggedUser);
      
      if (loggedUser.role === 'MASTER' || loggedUser.role === 'ADMIN') {
        dataService.initializeDB().catch(console.error);
      }

    } catch (e: any) {
      console.error(e);
      if (e.message.includes("auth/invalid-credential") || e.message.includes("auth/user-not-found") || e.message.includes("auth/wrong-password")) {
         setError("E-mail ou senha incorretos.");
      } else if (e.message.includes("auth/too-many-requests")) {
         setError("Muitas tentativas. Tente novamente mais tarde.");
      } else if (e.message.includes("permission-denied")) {
         setError("ERRO DE PERMISSÃO: O Firestore está bloqueado. Vá na aba 'Segurança' no Firebase e libere o acesso.");
      } else if (e.message.includes("offline") || e.message.includes("client is offline") || e.message.includes("not found")) {
         setError("ERRO DE CONEXÃO: Banco de dados não encontrado ou offline. Verifique se o nome do banco no código 'firebaseConfig.ts' está correto.");
      } else {
         setError("Erro ao realizar login. " + (e.message || ""));
      }
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await dataService.logout();
      setUser(null);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const clearError = () => setError(undefined);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, clearError }}>
      {!loading && children} 
      {loading && (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-t-gold-500 border-zinc-800 animate-spin"></div>
          <span className="text-zinc-500 text-xs tracking-widest uppercase">Carregando Confraria...</span>
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