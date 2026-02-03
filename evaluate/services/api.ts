
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question, ExamResult, InterviewEvaluation, AssessmentSettings, Section } from '../types';
import { SEED_QUESTIONS } from '../constants';
import { SUPABASE_CONFIG } from '../config';

let supabaseInstance: SupabaseClient | null = null;

const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const url = SUPABASE_CONFIG.URL || localStorage.getItem('supabase_url');
  const key = SUPABASE_CONFIG.ANON_KEY || localStorage.getItem('supabase_key');

  if (url && key) {
    try {
      supabaseInstance = createClient(url, key);
      return supabaseInstance;
    } catch (e) {
      console.error("Failed to initialize Supabase client", e);
      return null;
    }
  }
  return null;
};

export const apiService = {
  setSupabaseConfig(url: string, key: string) {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    supabaseInstance = createClient(url, key);
  },

  getConfig() {
    return {
      url: SUPABASE_CONFIG.URL || localStorage.getItem('supabase_url') || '',
      key: SUPABASE_CONFIG.ANON_KEY || localStorage.getItem('supabase_key') || ''
    };
  },

  async signIn(email: string, pass: string) {
    const sb = getSupabase();
    if (!sb) throw new Error("Database not connected");
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
  },

  async getSession(): Promise<Session | null> {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session;
  },

  async getSections(): Promise<Section[]> {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('sections').select('*').order('name');
      if (error) throw error;
      return (data || []).map(s => ({
        name: s.name,
        isActive: s.is_active,
        createdAt: s.created_at
      }));
    } catch (err) {
      console.error("Failed to fetch sections", err);
      return [];
    }
  },

  async saveSection(section: Section): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('sections').upsert({
        name: section.name,
        is_active: section.isActive
      }, { onConflict: 'name' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to save section", err);
      return false;
    }
  },

  async getSettings(): Promise<AssessmentSettings | null> {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const { data, error } = await sb.from('settings').select('*');
      if (error) throw error;

      const settingsMap: any = {};
      data.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      return {
        overallTimeLimitMins: Number(settingsMap.overall_time ?? 20),
        questionTimeLimitSecs: Number(settingsMap.per_question_time ?? 60),
        totalQuestions: Number(settingsMap.total_questions ?? 20),
        questionsPerSection: settingsMap.section_config ?? {
          'SQL Basics': 5,
          'IQ': 5,
          'Behavioural': 5,
          'Analytical Ability': 5
        }
      };
    } catch (err) {
      console.error("Failed to fetch settings", err);
      return null;
    }
  },

  async updateSettings(settings: AssessmentSettings) {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const payload = [
        { key: 'overall_time', value: settings.overallTimeLimitMins },
        { key: 'per_question_time', value: settings.questionTimeLimitSecs },
        { key: 'total_questions', value: settings.totalQuestions },
        { key: 'section_config', value: settings.questionsPerSection }
      ];
      const { error } = await sb.from('settings').upsert(payload, { onConflict: 'key' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to update settings:", err);
      return false;
    }
  },

  async checkInfrastructure() {
    const sb = getSupabase();
    if (!sb) return { connected: false, tables: {} };
    const tables = ['questions', 'results', 'evaluations', 'settings', 'sections'];
    const status: Record<string, boolean> = {};
    for (const table of tables) {
      try {
        const { error } = await sb.from(table).select('*', { count: 'exact', head: true }).limit(1);
        status[table] = !(error && error.code === '42P01');
      } catch {
        status[table] = false;
      }
    }
    return { connected: true, tables: status };
  },

  async checkEmailExists(email: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { data, error } = await sb.from('results').select('id').eq('candidate_email', email).limit(1);
      return data && data.length > 0;
    } catch {
      return false;
    }
  },

  async getQuestions(
    onlyActive = true,
    page = 1,
    pageSize = 10,
    category = '',
    search = ''
  ): Promise<{ data: Question[], count: number }> {
    const sb = getSupabase();
    if (!sb) return { data: SEED_QUESTIONS, count: SEED_QUESTIONS.length };

    try {
      let query = sb.from('questions').select('*', { count: 'exact' });

      if (onlyActive) query = query.eq('is_active', true);
      if (category) query = query.eq('category', category);
      if (search) query = query.ilike('text', `%${search}%`);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const formatted = (data || []).map(q => ({
        id: q.id, category: q.category, difficulty: q.difficulty,
        text: q.text, options: q.options, correctOption: q.correct_option,
        isActive: q.is_active
      }));

      return { data: formatted, count: count || 0 };
    } catch (err) {
      console.error("Supabase fetch questions error:", err);
      return { data: [], count: 0 };
    }
  },

  async saveQuestion(question: Question): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('questions').upsert({
        id: question.id, category: question.category, difficulty: question.difficulty,
        text: question.text, options: question.options, correct_option: question.correctOption,
        is_active: question.isActive
      }, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Supabase save question error:", err);
      return false;
    }
  },

  async deleteQuestion(id: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('questions').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  async submitResult(result: ExamResult): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('results').insert([{
        id: result.attemptId, candidate_name: result.candidateName, candidate_email: result.candidateEmail,
        started_at: result.startedAt, submitted_at: result.submittedAt, total_time_taken_sec: result.totalTimeTakenSec,
        total_questions: result.totalQuestions, attempted_count: result.attemptedCount, missed_count: result.missedCount,
        correct_count: result.correctCount, wrong_count: result.wrongCount, avg_time_per_answered_sec: result.avgTimePerAnsweredSec,
        score_percent: result.scorePercent, answers_json: JSON.parse(result.answersJson)
      }]);
      return !error;
    } catch {
      return false;
    }
  },

  async deleteResult(id: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('results').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  async submitInterviewEvaluation(evalData: InterviewEvaluation): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('evaluations').insert([{
        id: evalData.evaluationId, candidate_email: evalData.candidateEmail, interviewer_name: evalData.interviewerName,
        level: evalData.level, ratings: evalData.ratings, notes: evalData.notes, final_outcome: evalData.finalOutcome,
        final_comments: evalData.finalComments, submitted_at: evalData.submittedAt
      }]);
      return !error;
    } catch {
      return false;
    }
  },

  async getAllResults(): Promise<ExamResult[]> {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('results').select('*').order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(r => ({
        attemptId: r.id, candidateName: r.candidate_name, candidateEmail: r.candidate_email,
        startedAt: r.started_at, submittedAt: r.submitted_at, totalTimeTakenSec: r.total_time_taken_sec,
        totalQuestions: r.total_questions, attemptedCount: r.attempted_count, missedCount: r.missed_count,
        correctCount: r.correct_count, wrongCount: r.wrong_count, avgTimePerAnsweredSec: r.avg_time_per_answered_sec,
        scorePercent: r.score_percent, answersJson: JSON.stringify(r.answers_json)
      }));
    } catch {
      return [];
    }
  },

  async getAllEvaluations(): Promise<InterviewEvaluation[]> {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('evaluations').select('*').order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(e => ({
        evaluationId: e.id, candidateEmail: e.candidate_email, interviewerName: e.interviewer_name,
        level: e.level, ratings: e.ratings, notes: e.notes, finalOutcome: e.final_outcome,
        finalComments: e.final_comments, submittedAt: e.submitted_at,
        aiVerdict: e.notes?.['_AI_VERDICT'] ? JSON.parse(e.notes['_AI_VERDICT']) : undefined
      }));
    } catch {
      return [];
    }
  },

  async getEvaluation(email: string): Promise<InterviewEvaluation | null> {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const { data, error } = await sb.from('evaluations').select('*').eq('candidate_email', email).limit(1).single();
      if (error) return null;
      return {
        evaluationId: data.id, candidateEmail: data.candidate_email, interviewerName: data.interviewer_name,
        level: data.level, ratings: data.ratings, notes: data.notes, finalOutcome: data.final_outcome,
        finalComments: data.final_comments, submittedAt: data.submitted_at,
        aiVerdict: data.notes?.['_AI_VERDICT'] ? JSON.parse(data.notes['_AI_VERDICT']) : undefined
      };
    } catch {
      return null;
    }
  },

  async initializeDatabase() {
    const sb = getSupabase();
    if (!sb) throw new Error("Database connection not established.");

    const uniqueCats = Array.from(new Set(SEED_QUESTIONS.map(q => q.category)));
    for (const cat of uniqueCats) {
      await this.saveSection({ name: cat, isActive: true });
    }

    const formattedQuestions = SEED_QUESTIONS.map(q => ({
      id: q.id, category: q.category, difficulty: q.difficulty,
      text: q.text, options: q.options, correct_option: q.correctOption,
      is_active: q.isActive
    }));
    const { error } = await sb.from('questions').upsert(formattedQuestions, { onConflict: 'id' });
    if (error) throw error;
    return true;
  },

  async generateProbeQuestions(standardTitle: string, level: string, contextIndicators: string[]): Promise<string[]> {
    try {
      // Initialize GenAI - ideally this key should be in env or config
      // For this environment, we'll try VITE_GOOGLE_API_KEY from import.meta.env
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) {
        console.warn("No Google API Key found");
        return ["API Key missing. Please configure VITE_GOOGLE_API_KEY."];
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
            You are an expert interviewer. Generate 3 specific, behavioral probe questions to assess a candidate for the leadership standard "${standardTitle}" at level "${level}".
            
            Context - Positive Indicators for this standard:
            ${contextIndicators.map(i => `- ${i}`).join('\n')}

            Output EXACTLY 3 questions, one per line. Do not include numbering or prefixes like "1.".
          `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return text.split('\n').filter(line => line.trim().length > 0).slice(0, 3);
    } catch (e) {
      console.error("AI Generation failed", e);
      return ["Failed to generate questions. Please try again."];
    }
  },

  async generateVerdict(candidateName: string, technicalScore: number, leadershipRatings: Record<string, string>): Promise<{ decision: 'Hire' | 'No Hire' | 'Review', confidence: number, rationale: string }> {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) throw new Error("No API Key");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        Act as a Hiring Manager. Evaluate this candidate:
        Name: ${candidateName}
        Technical Score: ${technicalScore.toFixed(2)}%
        
        Leadership Evidence:
        ${Object.entries(leadershipRatings).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

        Provide a hiring verdict in valid JSON format ONLY:
        {
          "decision": "Hire" | "No Hire" | "Review",
          "confidence": <number 0-100>,
          "rationale": "<short concise justification>"
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      // Cleanup markdown code blocks if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      return JSON.parse(text);
    } catch (e) {
      console.error("Verdict Generation failed", e);
      return { decision: 'Review', confidence: 0, rationale: "AI failed to generate verdict." };
    }
  },

  async saveVerdict(evaluationId: string, verdict: any, existingNotes: Record<string, string>): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;

    const updatedNotes = { ...existingNotes, '_AI_VERDICT': JSON.stringify(verdict) };

    try {
      const { error } = await sb.from('evaluations')
        .update({ notes: updatedNotes })
        .eq('id', evaluationId);
      return !error;
    } catch (e) {
      console.error("Failed to save verdict", e);
      return false;
    }
  }
};
