
export type Category = string;
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type OptionKey = 'A' | 'B' | 'C' | 'D';

export type Rating = 'Strong Evidence' | 'Good Evidence' | 'Limited Evidence' | 'No Evidence';
export type EvaluationOutcome = 'Decline' | 'Progress to next stage' | 'Offer';
export type AssessmentLevel = 'L4' | 'L5-L7';

export interface Section {
  name: string;
  organizationId?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  adminName: string;
  adminEmail: string;
  createdBy?: string;
  createdAt?: string;
}


export interface Candidate {
  id: string;
  organizationId?: string;
  email: string;
  fullName: string;
  status: string;
  createdAt?: string;
}

export type UserRole = 'super_admin' | 'admin';

export interface User {
  id: string;
  organizationId?: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt?: string;
}

export interface AssessmentSettings {
  organizationId?: string;
  overallTimeLimitMins: number;
  questionTimeLimitSecs: number;
  totalQuestions: number;
  questionsPerSection: Record<string, number>;
}

export interface Question {
  id: string;
  organizationId?: string;
  category: Category;
  difficulty: Difficulty;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: OptionKey;
  isActive: boolean;
}

export interface AnswerDetail {
  questionId: string;
  selectedOption: OptionKey | null;
  isCorrect: boolean | null;
  timeSpentSec: number;
  status: 'ANSWERED' | 'MISSED' | 'AUTO_MISSED_OVERALL_TIMEOUT';
  questionIndex: number;
}

export interface ExamResult {
  attemptId: string;
  organizationId?: string;
  candidateId?: string;
  candidateName: string;
  candidateEmail: string;
  startedAt: string;
  submittedAt: string;
  totalTimeTakenSec: number;
  totalQuestions: number;
  attemptedCount: number;
  missedCount: number;
  correctCount: number;
  wrongCount: number;
  avgTimePerAnsweredSec: number;
  scorePercent: number;
  answersJson: string;
}

export interface InterviewEvaluation {
  id?: string;
  organizationId?: string;
  candidateId?: string;
  candidateName?: string;
  candidateEmail: string;
  interviewerName: string;
  level: string;
  ratings: Record<string, Rating>;
  notes: Record<string, string>;
  finalOutcome: string;
  finalComments: string;
  submittedAt: string;
  areasOfStrength?: string[];
  areasForImprovement?: string[];
  recommendedAction?: string;
  aiVerdict?: {
    verdict: string;
    confidence: number;
    reasoning: string;
    keySkillsAnalysis: Record<string, string>;
  };
}

export interface AIVerdict {
  decision: 'Hire' | 'No Hire' | 'Review';
  confidence: number;
  rationale: string;
}

export interface AppState {
  view: 'landing' | 'exam' | 'completion' | 'admin' | 'interviewer-form';
  candidate: {
    id?: string;
    name: string;
    email: string;
    organizationId?: string;
  } | null;
  currentAttempt: {
    id: string;
    questions: Question[];
    currentIndex: number;
    answers: AnswerDetail[];
    startTime: number;
    overallTimer: number;
    questionTimer: number;
  } | null;
  lastResult?: ExamResult | null;
  activeEvaluationCandidate?: string; // email
  currentUser?: User | null;
}
