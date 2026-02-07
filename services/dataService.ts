import { User, UserRole, UserStatus, Challenge, Meeting, Candidate, Contribution } from '../types';

// STATEFUL MOCK DATA (Persists in memory during session)
// Em produção, isso seria substituído por chamadas de API (fetch/axios) para seu servidor.

let MOCK_USERS: User[] = [
  { id: 'master-01', name: 'Sanroma', email: 'sanroma@thinkondigital.com.br', password: '123456', phone: '11999999999', company: 'ThinkOn Digital', companies: ['ThinkOn Digital'], role: UserRole.MASTER, status: UserStatus.ACTIVE, bio: 'Master Admin.', revenue: '100M+' },
  { id: '1', name: 'Arthur Pendragon', email: 'arthur@kingsman.com', password: '123456', phone: '11999990001', company: 'Camelot Ventures', companies: ['Camelot Ventures', 'Excalibur Holdings'], role: UserRole.MASTER, status: UserStatus.ACTIVE, bio: 'Fundador e Visionário.', revenue: '50M+' },
  { id: '2', name: 'Lancelot du Lac', email: 'lancelot@roundtable.inc', password: '123456', phone: '11999990002', company: 'Knight Industries', companies: ['Knight Industries'], role: UserRole.ADMIN, status: UserStatus.ACTIVE, bio: 'Diretor de Operações.', revenue: '20M - 50M' },
  { id: '3', name: 'Galahad', email: 'harry@hart.co', password: '123456', phone: '11999990003', company: 'Tailors & Co', companies: ['Tailors & Co'], role: UserRole.PARTICIPANT, status: UserStatus.ACTIVE, bio: 'Membro Especialista.', revenue: '10M - 20M' },
];

let MOCK_CHALLENGES: Challenge[] = [
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

let MOCK_MEETINGS: Meeting[] = [
  { id: '201', date: '2023-11-15', time: '19:00', location: 'Hotel Fasano, SP', description: 'Reunião Mensal de Alinhamento Estratégico', termAcceptedBy: ['1', '2'] }
];

let MOCK_CANDIDATES: Candidate[] = [
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
    votes: { '1': 'APPROVE', '3': 'APPROVE' }, // Arthur and Galahad voted
    status: 'EVALUATING' 
  }
];

export const dataService = {
  // Authentication
  login: async (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (user) {
          // Clone to avoid reference issues
          resolve(JSON.parse(JSON.stringify(user)));
        } else {
          reject(new Error("Credenciais inválidas."));
        }
      }, 500);
    });
  },

  getCurrentUser: async (): Promise<User> => {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_USERS[0]), 500));
  },
  
  // Stats
  getUserStats: async (userId: string) => {
    const challengesCreated = MOCK_CHALLENGES.filter(c => c.authorId === userId).length;
    const contributions = userId === '1' ? 15 : userId === '2' ? 8 : 25; 
    const totalMeetings = MOCK_MEETINGS.length;
    const attended = MOCK_MEETINGS.filter(m => m.termAcceptedBy.includes(userId)).length;
    const attendanceRate = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;

    return {
      challenges: challengesCreated,
      contributions: contributions,
      attendance: attendanceRate
    };
  },

  getActiveMemberCount: () => {
    return MOCK_USERS.filter(u => u.status === UserStatus.ACTIVE).length;
  },

  // Users (Admin)
  getAllUsers: async (): Promise<User[]> => {
    return Promise.resolve([...MOCK_USERS]);
  },

  updateUser: async (updatedUser: User): Promise<void> => {
    const index = MOCK_USERS.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      MOCK_USERS[index] = updatedUser;
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    MOCK_USERS = MOCK_USERS.filter(u => u.id !== userId);
    return Promise.resolve();
  },

  // Challenges
  getChallenges: async (): Promise<Challenge[]> => {
    return Promise.resolve([...MOCK_CHALLENGES]);
  },

  createChallenge: async (content: string, user: User): Promise<Challenge> => {
    const newChallenge: Challenge = {
      id: Math.random().toString(),
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
    MOCK_CHALLENGES.unshift(newChallenge);
    return newChallenge;
  },

  closeChallenge: async (challengeId: string): Promise<void> => {
    // Immutable update to ensure React detects changes properly
    MOCK_CHALLENGES = MOCK_CHALLENGES.map(c => 
      c.id === challengeId ? { ...c, status: 'CLOSED' } : c
    );
    return Promise.resolve();
  },

  addContribution: async (challengeId: string, content: string, user: User): Promise<'CONTACT' | 'ADVICE'> => {
    // Business Rule: Auto-detection
    // Regex for Email OR Phone (simple check)
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\(?\d{2}\)?\s)?(\d{4,5}\-?\d{4})/;
    
    const isContact = emailRegex.test(content) || phoneRegex.test(content);
    const type = isContact ? 'CONTACT' : 'ADVICE';

    // Find index to update immutably
    const index = MOCK_CHALLENGES.findIndex(c => c.id === challengeId);
    if (index !== -1) {
      const challenge = MOCK_CHALLENGES[index];
      
      const newContribution: Contribution = {
        id: Math.random().toString(36).substr(2, 9),
        challengeId: challenge.id,
        authorId: user.id,
        authorName: user.name,
        content: content,
        type: type,
        createdAt: new Date().toISOString()
      };

      // Create new challenge object with updated counts and contributions
      MOCK_CHALLENGES[index] = {
        ...challenge,
        contactCount: type === 'CONTACT' ? challenge.contactCount + 1 : challenge.contactCount,
        adviceCount: type !== 'CONTACT' ? challenge.adviceCount + 1 : challenge.adviceCount,
        contributions: [...(challenge.contributions || []), newContribution]
      };
    }

    return Promise.resolve(type);
  },

  // Meetings
  getMeetings: async (): Promise<Meeting[]> => {
    return Promise.resolve([...MOCK_MEETINGS]);
  },

  acceptMeetingTerm: async (meetingId: string, userId: string): Promise<void> => {
    const meeting = MOCK_MEETINGS.find(m => m.id === meetingId);
    if (meeting && !meeting.termAcceptedBy.includes(userId)) {
      meeting.termAcceptedBy.push(userId);
    }
  },

  // Candidates & Voting
  getCandidates: async (): Promise<Candidate[]> => {
    return Promise.resolve([...MOCK_CANDIDATES]);
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
    MOCK_CANDIDATES.push(newCandidate);
  },

  voteCandidate: async (candidateId: string, userId: string, type: 'APPROVE' | 'VETO'): Promise<void> => {
    const candidate = MOCK_CANDIDATES.find(c => c.id === candidateId);
    if (!candidate) return;

    const currentVote = candidate.votes[userId];

    // Logic: Toggle or Switch
    if (currentVote === type) {
      // User clicked same vote again -> Remove vote (Abstain)
      delete candidate.votes[userId];
    } else {
      // New vote or switching vote -> Set new type
      candidate.votes[userId] = type;
    }

    // Check Promotion Logic (80% of ACTIVE members)
    const activeMembers = MOCK_USERS.filter(u => u.status === UserStatus.ACTIVE).length;
    const approvalVotes = Object.values(candidate.votes).filter(v => v === 'APPROVE').length;
    
    // Safety check to avoid division by zero
    if (activeMembers > 0) {
      const approvalRate = approvalVotes / activeMembers;
      
      if (approvalRate >= 0.8) {
        // PROMOTE CANDIDATE
        const newUser: User = {
          id: candidate.id, // Keep ID or generate new
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          company: candidate.company,
          companies: candidate.companies,
          role: UserRole.PARTICIPANT,
          status: UserStatus.ACTIVE,
          bio: candidate.bio,
          password: 'generated_pass_123', // System generated password
          revenue: candidate.revenueRange
        };
        
        MOCK_USERS.push(newUser);
        
        // Remove from candidates list
        MOCK_CANDIDATES = MOCK_CANDIDATES.filter(c => c.id !== candidateId);
      }
    }
  }
};