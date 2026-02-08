import { User, UserRole, UserStatus, Challenge, Meeting, Candidate, Contribution } from '../types';

// --- DATA PERSISTENCE LAYER ---
const STORAGE_KEY = 'CONFRARIA_DB_V1';

// Default Data (Initial State)
const DEFAULT_USERS: User[] = [
  { id: 'master-01', name: 'Sanroma', email: 'sanroma@thinkondigital.com.br', password: '123456', phone: '11999999999', company: 'ThinkOn Digital', companies: ['ThinkOn Digital'], role: UserRole.MASTER, status: UserStatus.ACTIVE, bio: 'Master Admin.', revenue: '100M+' },
  { id: '1', name: 'Arthur Pendragon', email: 'arthur@kingsman.com', password: '123456', phone: '11999990001', company: 'Camelot Ventures', companies: ['Camelot Ventures', 'Excalibur Holdings'], role: UserRole.MASTER, status: UserStatus.ACTIVE, bio: 'Fundador e Visionário.', revenue: '50M+' },
  { id: '2', name: 'Lancelot du Lac', email: 'lancelot@roundtable.inc', password: '123456', phone: '11999990002', company: 'Knight Industries', companies: ['Knight Industries'], role: UserRole.ADMIN, status: UserStatus.ACTIVE, bio: 'Diretor de Operações.', revenue: '20M - 50M' },
  { id: '3', name: 'Galahad', email: 'harry@hart.co', password: '123456', phone: '11999990003', company: 'Tailors & Co', companies: ['Tailors & Co'], role: UserRole.PARTICIPANT, status: UserStatus.ACTIVE, bio: 'Membro Especialista.', revenue: '10M - 20M' },
];

const DEFAULT_CHALLENGES: Challenge[] = [
  { 
    id: '101', 
    authorId: '3', 
    authorName: 'Galahad', 
    company: 'Tailors & Co', 
    content: 'Preciso de introdução a fornecedores de tecidos balísticos na Ásia. Volume alto.', 
    createdAt: '2023-10-25', 
    status: 'OPEN', 
    contactCount: 2, 
    adviceCount: 1,
    contributions: [
      { id: 'c1', challengeId: '101', authorId: '2', authorName: 'Lancelot du Lac', content: 'Tenho um contato na Malásia. Falar com Mr. Wei: wei@textile.asia', type: 'CONTACT', createdAt: '2023-10-26' },
      { id: 'c2', challengeId: '101', authorId: '1', authorName: 'Arthur Pendragon', content: 'Cuidado com a regulação de importação atual, verifique a taxa antidumping.', type: 'ADVICE', createdAt: '2023-10-27' },
      { id: 'c3', challengeId: '101', authorId: '1', authorName: 'Arthur Pendragon', content: 'Segue contato de despachante especializado: +55 11 99999-9999', type: 'CONTACT', createdAt: '2023-10-27' }
    ]
  },
  { 
    id: '102', 
    authorId: '2', 
    authorName: 'Lancelot du Lac', 
    company: 'Knight Industries', 
    content: 'Buscando CFO com experiência em M&A para rodada Series B.', 
    createdAt: '2023-10-20', 
    status: 'CLOSED', 
    contactCount: 5, 
    adviceCount: 3,
    contributions: [] 
  },
];

const DEFAULT_MEETINGS: Meeting[] = [
  { id: '201', date: '2023-11-15', time: '19:00', location: 'Hotel Fasano, SP', description: 'Reunião Mensal de Alinhamento Estratégico', termAcceptedBy: ['1', '2'] }
];

const DEFAULT_CANDIDATES: Candidate[] = [
  { 
    id: '301', 
    nominatorId: '3', 
    name: 'Merlin', 
    email: 'merlin@wizardry.tech', 
    phone: '11988887777',
    company: 'Magic AI',
    companies: ['Magic AI', 'Spellbound Inc'],
    role: 'CTO', 
    revenueRange: '10M - 50M', 
    bio: 'Pioneiro em IA generativa.', 
    votes: { '1': 'APPROVE', '3': 'APPROVE' }, 
    status: 'EVALUATING' 
  }
];

interface DB {
  users: User[];
  challenges: Challenge[];
  meetings: Meeting[];
  candidates: Candidate[];
}

// Load from Storage or Initialize Defaults
const loadDB = (): DB => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load persistence", e);
  }
  return {
    users: DEFAULT_USERS,
    challenges: DEFAULT_CHALLENGES,
    meetings: DEFAULT_MEETINGS,
    candidates: DEFAULT_CANDIDATES
  };
};

// In-Memory Instance (synced to storage on changes)
let db = loadDB();

const saveDB = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error("Failed to save persistence", e);
  }
};

export const dataService = {
  // Authentication
  login: async (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (user) {
          resolve(JSON.parse(JSON.stringify(user)));
        } else {
          reject(new Error("Credenciais inválidas."));
        }
      }, 500);
    });
  },

  // Used for Session Restoration (Auto-Login on Refresh)
  getUserById: async (id: string): Promise<User | null> => {
    return new Promise((resolve) => {
      const user = db.users.find(u => u.id === id);
      if (user) {
        resolve(JSON.parse(JSON.stringify(user)));
      } else {
        resolve(null);
      }
    });
  },

  getCurrentUser: async (): Promise<User> => {
    return new Promise(resolve => setTimeout(() => resolve(db.users[0]), 500));
  },
  
  // Stats
  getUserStats: async (userId: string) => {
    const challengesCreated = db.challenges.filter(c => c.authorId === userId).length;
    // Simple heuristic for mock stats
    const contributions = db.challenges.reduce((acc, c) => acc + (c.contributions?.filter(ct => ct.authorId === userId).length || 0), 0) + (userId === '1' ? 10 : 0); 
    const totalMeetings = db.meetings.length;
    const attended = db.meetings.filter(m => m.termAcceptedBy.includes(userId)).length;
    const attendanceRate = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;

    return {
      challenges: challengesCreated,
      contributions: contributions,
      attendance: attendanceRate
    };
  },

  getActiveMemberCount: () => {
    return db.users.filter(u => u.status === UserStatus.ACTIVE).length;
  },

  // Users (Admin)
  getAllUsers: async (): Promise<User[]> => {
    return Promise.resolve([...db.users]);
  },

  updateUser: async (updatedUser: User): Promise<void> => {
    const index = db.users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      db.users[index] = updatedUser;
      saveDB();
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    db.users = db.users.filter(u => u.id !== userId);
    saveDB();
    return Promise.resolve();
  },

  // Challenges
  getChallenges: async (): Promise<Challenge[]> => {
    return Promise.resolve([...db.challenges]);
  },

  createChallenge: async (content: string, user: User): Promise<Challenge> => {
    const newChallenge: Challenge = {
      id: Math.random().toString(36).substr(2, 9),
      authorId: user.id,
      authorName: user.name,
      company: user.company,
      content,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'OPEN',
      contactCount: 0,
      adviceCount: 0,
      contributions: []
    };
    db.challenges.unshift(newChallenge);
    saveDB();
    return newChallenge;
  },

  closeChallenge: async (challengeId: string): Promise<void> => {
    db.challenges = db.challenges.map(c => 
      c.id === challengeId ? { ...c, status: 'CLOSED' } : c
    );
    saveDB();
    return Promise.resolve();
  },

  addContribution: async (challengeId: string, content: string, user: User): Promise<'CONTACT' | 'ADVICE'> => {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\(?\d{2}\)?\s)?(\d{4,5}\-?\d{4})/;
    
    const isContact = emailRegex.test(content) || phoneRegex.test(content);
    const type = isContact ? 'CONTACT' : 'ADVICE';

    const index = db.challenges.findIndex(c => c.id === challengeId);
    if (index !== -1) {
      const challenge = db.challenges[index];
      
      const newContribution: Contribution = {
        id: Math.random().toString(36).substr(2, 9),
        challengeId: challenge.id,
        authorId: user.id,
        authorName: user.name,
        content: content,
        type: type,
        createdAt: new Date().toISOString()
      };

      db.challenges[index] = {
        ...challenge,
        contactCount: type === 'CONTACT' ? challenge.contactCount + 1 : challenge.contactCount,
        adviceCount: type !== 'CONTACT' ? challenge.adviceCount + 1 : challenge.adviceCount,
        contributions: [...(challenge.contributions || []), newContribution]
      };
      saveDB();
    }

    return Promise.resolve(type);
  },

  // Meetings
  getMeetings: async (): Promise<Meeting[]> => {
    return Promise.resolve([...db.meetings]);
  },

  acceptMeetingTerm: async (meetingId: string, userId: string): Promise<void> => {
    const meeting = db.meetings.find(m => m.id === meetingId);
    if (meeting && !meeting.termAcceptedBy.includes(userId)) {
      meeting.termAcceptedBy.push(userId);
      saveDB();
    }
  },

  // Candidates & Voting
  getCandidates: async (): Promise<Candidate[]> => {
    return Promise.resolve([...db.candidates]);
  },

  addCandidate: async (candidateData: Partial<Candidate>, nominator: User): Promise<void> => {
    const newCandidate: Candidate = {
      id: Math.random().toString(36).substr(2, 9),
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
    db.candidates.push(newCandidate);
    saveDB();
  },

  voteCandidate: async (candidateId: string, userId: string, type: 'APPROVE' | 'VETO'): Promise<boolean> => {
    const candidate = db.candidates.find(c => c.id === candidateId);
    if (!candidate) return false;

    const currentVote = candidate.votes[userId];

    if (currentVote === type) {
      delete candidate.votes[userId];
    } else {
      candidate.votes[userId] = type;
    }

    // Check Promotion Logic (80% of ACTIVE members)
    const activeMembers = db.users.filter(u => u.status === UserStatus.ACTIVE).length;
    const approvalVotes = Object.values(candidate.votes).filter(v => v === 'APPROVE').length;
    let promoted = false;

    if (activeMembers > 0) {
      const approvalRate = approvalVotes / activeMembers;
      
      if (approvalRate >= 0.8) {
        const newUser: User = {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          company: candidate.company,
          companies: candidate.companies,
          role: UserRole.PARTICIPANT,
          status: UserStatus.ACTIVE,
          bio: candidate.bio,
          password: 'generated_pass_123',
          revenue: candidate.revenueRange
        };
        
        db.users.push(newUser);
        db.candidates = db.candidates.filter(c => c.id !== candidateId);
        promoted = true;
      }
    }
    saveDB();
    return promoted;
  },

  // Debug Helper
  resetDB: () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
};