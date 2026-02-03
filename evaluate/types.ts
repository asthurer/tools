
export type Category = string;
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type OptionKey = 'A' | 'B' | 'C' | 'D';

export type Rating = 'Strong Evidence' | 'Good Evidence' | 'Limited Evidence' | 'No Evidence';
export type EvaluationOutcome = 'Decline' | 'Progress to next stage' | 'Offer';
export type AssessmentLevel = 'L4' | 'L5-L7';

export interface Section {
  name: string;
  isActive: boolean;
  createdAt?: string;
}

export interface AssessmentSettings {
  overallTimeLimitMins: number;
  questionTimeLimitSecs: number;
  totalQuestions: number;
  questionsPerSection: Record<string, number>;
}

export interface Question {
  id: string;
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
  evaluationId: string;
  candidateEmail: string;
  interviewerName: string;
  level: AssessmentLevel;
  ratings: Record<string, Rating>;
  notes: Record<string, string>;
  finalOutcome: EvaluationOutcome | null;
  finalComments: string;
  submittedAt: string;
}

export interface AppState {
  view: 'landing' | 'exam' | 'completion' | 'admin' | 'interviewer-form';
  candidate: {
    name: string;
    email: string;
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
}
