// ─── API envelope ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data:  T;
  error: string | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * DAY 2 SCOPE: board is always 'maharashtra'.
 * This is the shape returned by GET /api/auth/me and PATCH /api/auth/me.
 * Do NOT widen board to string or add 'cbse' until formally scoped.
 */
export interface AuthUser {
  id:            string;
  name:          string;
  email:         string;
  plan:          'free' | 'pro';
  board:         'maharashtra';
  language:      'english' | 'marathi' | 'hindi' | 'semi';
  targetPercent: number;
  weakSubjects:  string[];
  examDate:      string | null;   // ISO date string 'YYYY-MM-DD' or null
  emailVerified: boolean;
  onboardingComplete: boolean;
  emergencyTrialUsed: boolean;
}

// ─── Academic data ────────────────────────────────────────────────────────────

export interface Subject {
  id:            string;
  name:          string;
  emoji?:        string;
  progress?:     number;
  chapters?:     number;
}

export interface Chapter {
  id:     string;
  name:   string;
  status: 'Ready' | 'Updated' | 'Generating' | 'Coming Soon';
  type:   'High Weightage' | 'Important' | 'Core' | 'Coming Soon';
  free:   boolean;
}

export interface ScheduleItem {
  id:   string;
  time: string;
  task: string;
  done: boolean;
}

export interface RecentNote {
  id:    string;
  title: string;
  date:  string;
  type:  'notes' | 'test' | 'sheet';
}

export interface NoteSection {
  heading: string;
  content: string;
}

export interface ActiveNote {
  title:    string;
  sections: NoteSection[];
  boardTip: string;
  pyqs:     { q: string; marks: number }[];
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface PaymentOrder {
  orderId:  string;
  amount:   number;
  currency: string;
  keyId:    string;
}

export interface PaymentVerification {
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
