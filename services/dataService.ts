
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

// --- DEFAULT DATA FOR SEEDING (REMOVIDO PARA EVITAR DADOS FAKES) ---
const DEFAULT_USERS_SEED: User[] = [];
const DEFAULT_CHALLENGES: Challenge[] = [];
const DEFAULT_MEETINGS: Meeting[] = [];

export const dataService = {
  // --- AUTHENTICATION ---
  
  login: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      const userDoc = await getDoc(doc(db, "users", uid)); 
      
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      } else {
        // AUTO-BOOTSTRAP APENAS PARA O MASTER (Sanroma)
        if (email.toLowerCase() === 'sanroma@thinkondigital.com.br') {
            console.log("Detectado login de Master. Restaurando perfil...");
            
            const newMasterUser: User = {
                id: uid,
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

            await setDoc(doc(db, "users", uid), newMasterUser);
            return newMasterUser;
        }
        
        throw new Error("Usuário autenticado, mas perfil não encontrado.");
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

  getUserStats: async (userId: string) => {
    try {
      const qChallenges = query(collection(db, "challenges"), where("authorId", "==", userId));
      const snapChallenges = await getDocs(qChallenges);
      const challengesCreated = snapChallenges.size;

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

        return leaderboard.sort((a, b) => b.points - a.points);
    } catch (e) {
        return [];
    }
  },

  getActiveMemberCount: async () => {
    // Conta apenas quem já é membro oficial ATIVO
    const q = query(collection(db, "users"), where("status", "==", UserStatus.ACTIVE));
    const snap = await getDocs(q);
    return snap.size;
  },

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

  getChallenges: async (): Promise<Challenge[]> => {
    const q = query(collection(db, "challenges"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs
      .map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          contributions: data.contributions || []
        } as Challenge;
      })
      .filter(c => c.status !== 'DELETED');
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
        challengeId: challengeId,
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

  voteCandidate: async (candidateId: string, userId: string, type: 'APPROVE' | 'VETO'): Promise<{ success: boolean; tempPassword?: string; error?: string }> => {
    const ref = doc(db, "candidates", candidateId);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) return { success: false, error: "Candidato não encontrado" };
    
    const candidate = snap.data() as Candidate;
    const votes = candidate.votes || {};

    // Toggle vote logic
    if (votes[userId] === type) {
      delete votes[userId];
    } else {
      votes[userId] = type;
    }

    await updateDoc(ref, { votes });

    // --- LOGIC: Check Approval ---
    const activeMembers = await dataService.getActiveMemberCount();
    const approvalVotes = Object.values(votes).filter(v => v === 'APPROVE').length;
    
    // Regra: Se tiver membros ativos e atingir 60%
    if (activeMembers > 0) {
      const approvalRate = approvalVotes / activeMembers;
      
      if (approvalRate >= 0.6) {
        // --- UPGRADE: Server-Side User Creation ---
        try {
          const idToken = await auth.currentUser?.getIdToken();
          
          if (!idToken) throw new Error("Usuário não autenticado para realizar promoção");

          // Chama a API do servidor (que usa Admin SDK)
          const response = await fetch('/api/admin/promote', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json'
             },
             body: JSON.stringify({
               idToken,
               email: candidate.email,
               name: candidate.name
             })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Erro no servidor ao criar usuário");
          }

          const { uid, tempPassword } = await response.json();

          // Cria perfil no Firestore usando o UID real do Auth
          const newUser: User = {
            id: uid, // Importante: Mesmo ID do Auth
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
          
          await setDoc(doc(db, "users", uid), newUser);
          await deleteDoc(ref);

          return { success: true, tempPassword };

        } catch (serverError: any) {
          console.error("Server creation failed:", serverError);
          return { success: false, error: "Aprovado, mas falha ao criar login: " + serverError.message };
        }
      }
    }
    return { success: false };
  },

  initializeDB: async () => {
    console.log("[INIT] Banco de dados pronto para uso.");
  }
};
