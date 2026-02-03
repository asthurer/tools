export type CategoryType = 'INTELLECTUAL QUALITIES' | 'EMOTIONAL QUALITIES' | 'SOCIAL QUALITIES';

export interface Indicator {
  text: string;
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  indicators: string[];
  prompt: string;
  category: CategoryType;
}

export type ScoreValue = 1 | 2 | 3 | 4;

export interface Scores {
  [traitId: string]: ScoreValue;
}

export interface Comments {
  [traitId: string]: string;
}

export interface AssessmentMetadata {
  candidateName: string;
  assessorName: string;
  date: string;
}

export const SCORING_SCALE = [
  { value: 1, label: 'RARELY', color: 'bg-red-700', ring: 'ring-red-700', text: 'text-red-700' },
  { value: 2, label: 'SOMETIMES', color: 'bg-orange-500', ring: 'ring-orange-500', text: 'text-orange-500' },
  { value: 3, label: 'OFTEN', color: 'bg-cyan-500', ring: 'ring-cyan-500', text: 'text-cyan-500' },
  { value: 4, label: 'ALMOST ALL OF THE TIME', color: 'bg-green-600', ring: 'ring-green-600', text: 'text-green-600' },
] as const;