import { User, UserRole, UserStatus, Challenge, Meeting, Candidate, Contribution } from '../types';
import { auth, db } from './firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  updatePassword 
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy
} from "firebase/firestore";

// --- DEFAULT DATA FOR SEEDING ---
// Removido o Sanroma daqui pois ele será criado dinamicamente no login
const DEFAULT_USERS_SEED: User[] = [
  { id: '1', name: 'Arthur Pendragon', email: 'arthur@kingsman.com', phone: '11999990001', company: 'Camelot Ventures', companies: ['Camelot Ventures', 'Excalibur Holdings'], role: UserRole.MASTER, status: UserStatus.ACTIVE, bio: 'Fundador e Visionário.', revenue: '50M+' },
  { id: '2', name: 'Lancelot du Lac', email: 'lancelot@roundtable.inc', phone: '11999990002', company: 'Knight Industries', companies: ['Knight Industries'], role: UserRole.ADMIN, status: UserStatus.ACTIVE, bio: 'Diretor de Operações.', revenue: '20M - 50M' },
  { id: '3', name: 'Galahad', email: 'harry@hart.co', phone: '11999990003', company: 'Tailors & Co', companies: ['Tailors & Co'], role: UserRole.PARTICIPANT, status: UserStatus.ACTIVE, bio: 'Membro Especialista.', revenue: '10M - 20M' },
];

const DEFAULT_CHALLENGES: Challenge[] = [
  { 
    id: '101', authorId: '3', authorName: 'Galahad', company: 'Tailors & Co', 
    content: 'Preciso de introdução a fornecedores de tecidos balísticos na Ásia. Volume alto.', 
    createdAt: '2023-10-25', status: 'OPEN', contactCount: 2, adviceCount: 1,
    contributions: [] 
  }
];

const DEFAULT_MEETINGS: Meeting[] = [
  { id: '201', date: '2023-11-15', time: '19:00', location: 'Hotel Fasano, SP', description: 'Reunião Mensal de Alinhamento Estratégico', termAcceptedBy: ['1', '2'] }
];

export const dataService = {
  // --- AUTHENTICATION ---
  
  login: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      // 1. Tenta buscar dados do perfil no Firestore
      const userDoc = await getDoc(doc(db, "users", uid)); 
      
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      } else {
        // 2. AUTO-BOOTSTRAP PARA O MASTER (Primeiro Acesso)
        if (email.toLowerCase() === 'sanroma@thinkondigital.com.br') {
            console.log("Detectado login de Master sem perfil. Criando perfil e populando banco...");
            
            const newMasterUser: User = {
                id: uid, // Usa o UID real do Auth
                name: 'Sanroma',
                email: email,
                phone: '11999999999',
                company: 'ThinkOn Digital',
                companies: ['ThinkOn Digital'],
                role: UserRole.MASTER,
                status: UserStatus.ACTIVE,
                bio: 'Master Admin.',
                revenue: '100M+'
            };

            // Salva o perfil do Master
            await setDoc(doc(db, "users", uid), newMasterUser);
            
            // Popula o resto do banco para as associações funcionarem
            await dataService.initializeDB();

            return newMasterUser;
        }

        // 3. Fallback para migração de outros usuários (se necessário)
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data() as User;
            await setDoc(doc(db, "users", uid), { ...userData, id: uid });
            return { ...userData, id: uid };
        }
        
        throw new Error("Usuário autenticado, mas perfil não encontrado no banco de dados.");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.message || "Falha na autenticação");
    }
  },

  logout: async () => {
    await signOut(auth);
  },

  recoverPassword: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  },
  
  changeUserPassword: async (newPassword: string) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
    } else {
      throw new Error("Nenhum usuário autenticado para alterar a senha.");
    }
  },

  // --- SESSION & USER MANAGEMENT ---

  getUserById: async (id: string): Promise<User | null> => {
    try {
      const docRef = doc(db, "users", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
      }
      return null;
    } catch (e) {
      console.error("Error getting user", e);
      return null;
    }
  },

  // --- STATISTICS ---

  getUserStats: async (userId: string) => {
    try {
      // Challenges Created
      const qChallenges = query(collection(db, "challenges"), where("authorId", "==", userId));
      const snapChallenges = await getDocs(qChallenges);
      const challengesCreated = snapChallenges.size;

      // Meetings Attended
      const meetingsSnap = await getDocs(collection(db, "meetings"));
      let totalMeetings = 0;
      let attended = 0;
      meetingsSnap.forEach(doc => {
        const m = doc.data() as Meeting;
        totalMeetings++;
        if (m.termAcceptedBy && m.termAcceptedBy.includes(userId)) {
          attended++;
        }
      });
      const attendanceRate = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;

      // Contributions (REAL CALCULATION)
      // Iterate through all challenges to count user's contributions
      const allChallengesSnap = await getDocs(collection(db, "challenges"));
      let contributions = 0;
      allChallengesSnap.forEach(doc => {
         const c = doc.data() as Challenge;
         if (c.contributions) {
             contributions += c.contributions.filter(contrib => contrib.authorId === userId).length;
         }
      });

      return { challenges: challengesCreated, contributions, attendance: attendanceRate };
    } catch (error) {
      console.error(error);
      return { challenges: 0, contributions: 0, attendance: 0 };
    }
  },

  getLeaderboard: async () => {
    try {
        const [usersSnap, challengesSnap, meetingsSnap] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "challenges")),
            getDocs(collection(db, "meetings"))
        ]);

        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
        const challenges = challengesSnap.docs.map(d => d.data() as Challenge);
        const meetings = meetingsSnap.docs.map(d => d.data() as Meeting);

        const leaderboard = users.map(u => {
            // Logic:
            // Meeting confirmed: 100 pts
            // Challenge Created: 50 pts
            // Contribution: 30 pts

            const myMeetings = meetings.filter(m => m.termAcceptedBy?.includes(u.id)).length;
            const myChallenges = challenges.filter(c => c.authorId === u.id).length;
            let myContributions = 0;
            challenges.forEach(c => {
                if (c.contributions) {
                    myContributions += c.contributions.filter(contrib => contrib.authorId === u.id).length;
                }
            });

            const points = (myMeetings * 100) + (myChallenges * 50) + (myContributions * 30);
            
            return {
                id: u.id,
                name: u.name,
                points,
                avatarUrl: u.avatarUrl
            };
        });

        // Return sorted by points desc
        return leaderboard.sort((a, b) => b.points - a.points);
    } catch (e) {
        console.error("Error fetching leaderboard", e);
        return [];
    }
  },

  getActiveMemberCount: async () => {
    const q = query(collection(db, "users"), where("status", "==", UserStatus.ACTIVE));
    const snap = await getDocs(q);
    return snap.size;
  },

  // --- CRUD: USERS ---

  getAllUsers: async (): Promise<User[]> => {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },

  updateUser: async (updatedUser: User): Promise<void> => {
    const userRef = doc(db, "users", updatedUser.id);
    const { password, ...userData } = updatedUser as any; 
    await updateDoc(userRef, userData);
  },

  deleteUser: async (userId: string): Promise<void> => {
    await deleteDoc(doc(db, "users", userId));
  },

  // --- CRUD: CHALLENGES ---

  getChallenges: async (): Promise<Challenge[]> => {
    const q = query(collection(db, "challenges"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs
      .map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          contributions: data.contributions || [] // Ensure it's never undefined
        } as Challenge;
      })
      .filter(c => c.status !== 'DELETED'); // Filter out soft-deleted items
  },

  createChallenge: async (content: string, user: User): Promise<Challenge> => {
    const newChallenge = {
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatarUrl || null,
      company: user.company,
      content,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'OPEN',
      contactCount: 0,
      adviceCount: 0,
      contributions: []
    };
    const docRef = await addDoc(collection(db, "challenges"), newChallenge);
    return { id: docRef.id, ...newChallenge } as Challenge;
  },

  closeChallenge: async (challengeId: string): Promise<void> => {
    const ref = doc(db, "challenges", challengeId);
    await updateDoc(ref, { status: 'CLOSED' });
  },

  softDeleteChallenge: async (challengeId: string): Promise<void> => {
    const ref = doc(db, "challenges", challengeId);
    await updateDoc(ref, { status: 'DELETED' });
  },

  addContribution: async (challengeId: string, content: string, user: User): Promise<'CONTACT' | 'ADVICE'> => {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\(?\d{2}\)?\s)?(\d{4,5}\-?\d{4})/;
    const isContact = emailRegex.test(content) || phoneRegex.test(content);
    const type = isContact ? 'CONTACT' : 'ADVICE';

    const challengeRef = doc(db, "challenges", challengeId);
    const challengeSnap = await getDoc(challengeRef);
    
    if (challengeSnap.exists()) {
      const challenge = challengeSnap.data() as Challenge;
      
      const newContribution: Contribution = {
        id: Math.random().toString(36).substr(2, 9),
        challengeId: challengeId, // Fix: Use parameter directly to avoid undefined from data()
        authorId: user.id,
        authorName: user.name,
        content: content,
        type: type,
        createdAt: new Date().toISOString()
      };

      const contributions = [...(challenge.contributions || []), newContribution];
      const contactCount = type === 'CONTACT' ? challenge.contactCount + 1 : challenge.contactCount;
      const adviceCount = type !== 'CONTACT' ? challenge.adviceCount + 1 : challenge.adviceCount;

      await updateDoc(challengeRef, {
        contributions,
        contactCount,
        adviceCount
      });
    }

    return type;
  },

  // --- CRUD: MEETINGS ---

  getMeetings: async (): Promise<Meeting[]> => {
    const snap = await getDocs(collection(db, "meetings"));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting));
  },

  createMeeting: async (meetingData: Omit<Meeting, 'id' | 'termAcceptedBy'>): Promise<Meeting> => {
    const newMeeting = {
      ...meetingData,
      termAcceptedBy: []
    };
    const docRef = await addDoc(collection(db, "meetings"), newMeeting);
    return { id: docRef.id, ...newMeeting } as Meeting;
  },

  updateMeeting: async (meeting: Meeting): Promise<void> => {
    const ref = doc(db, "meetings", meeting.id);
    await updateDoc(ref, { ...meeting });
  },

  deleteMeeting: async (meetingId: string): Promise<void> => {
    await deleteDoc(doc(db, "meetings", meetingId));
  },

  acceptMeetingTerm: async (meetingId: string, userId: string): Promise<void> => {
    const ref = doc(db, "meetings", meetingId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const meeting = snap.data() as Meeting;
      const termAcceptedBy = meeting.termAcceptedBy || [];
      if (!termAcceptedBy.includes(userId)) {
        await updateDoc(ref, { termAcceptedBy: [...termAcceptedBy, userId] });
      }
    }
  },

  // --- CRUD: CANDIDATES ---

  getCandidates: async (): Promise<Candidate[]> => {
    const snap = await getDocs(collection(db, "candidates"));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
  },

  addCandidate: async (candidateData: Partial<Candidate>, nominator: User): Promise<void> => {
    const newCandidate = {
      nominatorId: nominator.id,
      name: candidateData.name!,
      email: candidateData.email!,
      phone: candidateData.phone || '',
      company: candidateData.companies?.[0] || '',
      companies: candidateData.companies || [],
      role: candidateData.role || 'CEO',
      revenueRange: candidateData.revenueRange || '',
      bio: candidateData.bio || '',
      votes: {},
      status: 'EVALUATING'
    };
    await addDoc(collection(db, "candidates"), newCandidate);
  },

  voteCandidate: async (candidateId: string, userId: string, type: 'APPROVE' | 'VETO'): Promise<boolean> => {
    const ref = doc(db, "candidates", candidateId);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) return false;
    
    const candidate = snap.data() as Candidate;
    const votes = candidate.votes || {};

    if (votes[userId] === type) {
      delete votes[userId];
    } else {
      votes[userId] = type;
    }

    await updateDoc(ref, { votes });

    // Check Promotion Logic
    const activeMembers = await dataService.getActiveMemberCount();
    const approvalVotes = Object.values(votes).filter(v => v === 'APPROVE').length;
    
    if (activeMembers > 0) {
      const approvalRate = approvalVotes / activeMembers;
      if (approvalRate >= 0.8) {
        // Promote to User
        const newUser: Partial<User> = {
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          company: candidate.company,
          companies: candidate.companies,
          role: UserRole.PARTICIPANT,
          status: UserStatus.ACTIVE,
          bio: candidate.bio,
          revenue: candidate.revenueRange
        };
        
        await addDoc(collection(db, "users"), newUser);
        await deleteDoc(ref); // Remove from candidates
        return true;
      }
    }
    return false;
  },

  // --- SEEDING / SETUP ---
  
  initializeDB: async () => {
    console.group("INITIALIZE DB - START");
    try {
      // 1. Seed Dummy Users
      for (const u of DEFAULT_USERS_SEED) {
        try {
          const userDoc = await getDoc(doc(db, "users", u.id));
          if (!userDoc.exists()) {
             const { password, ...uData } = u as any;
             await setDoc(doc(db, "users", u.id), uData);
             console.log(`[SEED] User ${u.name} criado com sucesso.`);
          }
        } catch (e) {
          console.error(`[SEED ERROR] Falha ao criar user ${u.name}:`, e);
          throw e; // Propagate error specifically to trigger AuthContext error handling
        }
      }

      // 2. Seed Challenges
      try {
        const challengesSnap = await getDocs(collection(db, "challenges"));
        if (challengesSnap.empty) {
          for (const c of DEFAULT_CHALLENGES) {
            await addDoc(collection(db, "challenges"), c);
          }
          console.log("[SEED] Desafios iniciais criados.");
        }
      } catch (e) {
         console.error("[SEED ERROR] Falha ao criar desafios:", e);
      }

      // 3. Seed Meetings
      try {
        const meetingsSnap = await getDocs(collection(db, "meetings"));
        if (meetingsSnap.empty) {
          for (const m of DEFAULT_MEETINGS) {
            await addDoc(collection(db, "meetings"), m);
          }
          console.log("[SEED] Reuniões iniciais criadas.");
        }
      } catch (e) {
         console.error("[SEED ERROR] Falha ao criar reuniões:", e);
      }

    } catch (criticalError) {
      console.error("[INITIALIZE DB] Erro crítico:", criticalError);
      throw criticalError;
    } finally {
      console.groupEnd();
    }
  }
};