export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface Passage {
  id: string;
  title: string;
  difficulty: DifficultyLevel;
  text: string;
  category: 'Tech & Innovation' | 'Himalayan Sikkim' | 'Campus Life' | 'Algorithms & Computing';
  charCount: number;
  wordCount: number;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  department: string;
  year: string;
  phone: string;
  createdAt?: any;
  canRetry?: boolean;
  disqualified?: boolean;
}

export type RoundStatus = 'created' | 'countdown' | 'in_progress' | 'completed' | 'reset';

export interface Round {
  id: string;
  name: string;
  passageId: string;
  passageTitle: string;
  passageText: string;
  difficulty: DifficultyLevel;
  duration: number; // 30, 60, or 120 seconds
  allowBackspaceAfterSpace: boolean;
  status: RoundStatus;
  startAt?: any; // Firestore Timestamp or number in milliseconds
  countdownStartedAt?: number; // epoch ms when organizer initiated countdown
  createdAt?: any;
}

export interface KeystrokeLogItem {
  c: string; // char typed
  t: number; // milliseconds from start
  e: boolean; // is error
}

export interface Attempt {
  id: string;
  participantId: string;
  participantName: string;
  department: string;
  year: string;
  rollNo?: string;
  roundId: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  punctuationAccuracy: number;
  errors: number;
  correctChars: number;
  totalKeystrokes: number;
  blurCount: number;
  flagged: boolean;
  flagReason?: string;
  keystrokes: string; // JSON string of KeystrokeLogItem[]
  submittedAt: any;
  rank?: number;
}

export type CompetitionStatus = 'registration_open' | 'waiting' | 'live' | 'finished';

export interface CompetitionConfig {
  status: CompetitionStatus;
  activeRoundId: string | null;
  resultsPublished: boolean;
  announcement: string;
  updatedAt?: any;
}

export interface AdminUser {
  uid: string;
  email: string;
  name?: string;
  role: 'superadmin' | 'organizer';
}
