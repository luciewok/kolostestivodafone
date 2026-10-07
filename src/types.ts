export interface Prize {
  id: string;
  name: string;
  color: string;
  textColor: string;
  weight: number; // probability weight (e.g. 1-10)
  active: boolean;
  stock?: number | null; // optional remaining count limit. null/undefined = unlimited
  initialStock?: number | null; // optional original count limit for reference
  image?: string; // product illustration/image path e.g. '/charger.png'
}

export interface SpinLog {
  id: string;
  timestamp: string;
  prizeId: string;
  prizeName: string;
  userEmail?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  explanation?: string;
}

export interface CompetitionEntry {
  id: string;
  email: string;
  timestamp: string;
  score: number;
  totalQuestions: number;
  prizeWon?: string;
}

export interface SystemSettings {
  pin: string;
  eventTitle: string;
  eventSubTitle: string;
  soundEnabled: boolean;
  minSpinsDuration: number; // seconds
  minPassingScore?: number; // minimum correct quiz answers to spin wheel (default 4)
  grandPrizeScore?: number; // minimum correct quiz answers to enter grand prize draw (default 8)
  allowedEmailRegex?: string; // regex pattern for employee email validation
  updatedAt?: number; // timestamp for cloud sync synchronization
  siteLocked?: boolean;
  googleSheetWebhookUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  stationName?: string;
  autoSyncGoogleSheets?: boolean;
}

export type ViewMode =
  | 'device_lock'
  | 'attractor'
  | 'quiz'
  | 'quiz_result'
  | 'wheel'
  | 'thank_you'
  | 'pin_entry'
  | 'admin';
