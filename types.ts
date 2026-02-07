export enum UserRole {
  MASTER = 'MASTER',
  ADMIN = 'ADMIN',
  PARTICIPANT = 'PARTICIPANT'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  SUSPENDED = 'SUSPENDED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string; // Empresa principal para display rápido
  companies: string[]; // Lista completa
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  bio?: string;
  password?: string; // In real app, this is never frontend accessible
  revenue?: string;
}

export interface Contribution {
  id: string;
  challengeId: string;
  authorId: string;
  authorName: string;
  content: string;
  type: 'CONTACT' | 'ADVICE';
  createdAt: string;
}

export interface Challenge {
  id: string;
  authorId: string;
  authorName: string;
  company: string;
  content: string;
  createdAt: string;
  status: 'OPEN' | 'CLOSED';
  contactCount: number;
  adviceCount: number;
  contributions: Contribution[]; // Histórico real de contribuições
}

export interface Meeting {
  id: string;
  date: string;
  time: string;
  location: string;
  description: string;
  termAcceptedBy: string[]; // List of user IDs
}

export interface Candidate {
  id: string;
  nominatorId: string;
  name: string;
  email: string;
  phone: string;
  company: string; // Principal
  companies: string[]; // Lista
  role: string;
  revenueRange: string;
  bio: string;
  // Mapa de votos: ID do usuário -> Tipo do voto
  votes: Record<string, 'APPROVE' | 'VETO'>; 
  status: 'EVALUATING' | 'APPROVED' | 'REJECTED';
}

export type ViewState = 'DASHBOARD' | 'CHALLENGES' | 'MEETINGS' | 'MEMBERS' | 'ADMIN' | 'LOGIN';