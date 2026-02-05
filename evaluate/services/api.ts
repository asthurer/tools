
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

// Debug Log to verify file update
console.log("%c Evaluate.ai API Service v2.2 Loaded ", "background: #002b49; color: #d4af37; padding: 4px; border-radius: 4px; font-weight: bold");

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question, ExamResult, InterviewEvaluation, AssessmentSettings, Section, Organization, User, UserRole, Candidate } from '../types';
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

  async getUserProfile(email: string): Promise<User | null> {
    const sb = getSupabase();
    if (!sb) return null;

    // 1. Get User Role & Basic Info
    const { data: userData, error: userError } = await sb
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userData) return null;

    // 2. Resolve Organization ID via admin_email match (Priority Source)
    // This ensures that if the user is listed as an admin in the organizations table, 
    // we use THAT organization's ID, keeping them strictly bound to their owned org.
    const { data: orgData } = await sb
      .from('organizations')
      .select('id')
      .eq('admin_email', email.toLowerCase())
      .single();

    return {
      id: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      role: userData.role as UserRole,
      createdAt: userData.created_at,
      organizationId: orgData?.id || userData.organization_id // Prefer direct admin linkage
    };
  },

  async getSections(organizationId?: string): Promise<Section[]> {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      let query = sb.from('sections').select('*').order('name');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(s => ({
        name: s.name,
        isActive: s.is_active,
        createdAt: s.created_at,
        organizationId: s.organization_id
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
        is_active: section.isActive,
        organization_id: section.organizationId || '55147170-54ed-4fdd-840b-66f81cbc1883'
      }, { onConflict: 'name,organization_id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to save section", err);
      return false;
    }
  },

  async getSettings(organizationId?: string): Promise<AssessmentSettings | null> {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      let query = sb.from('settings').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        // Fallback or default? For now, fetch all might be wrong if multiple settings exist.
        // Prefer specific org if known. If not, maybe limit 1?
        // Let's assume passed ID for now.
      }

      const { data, error } = await query;
      if (error) throw error;

      const settingsMap: any = {};
      data.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      // If no settings found for this org, return defaults
      if (data.length === 0) return {
        organizationId,
        overallTimeLimitMins: 20,
        questionTimeLimitSecs: 60,
        totalQuestions: 20,
        questionsPerSection: { 'SQL Basics': 5, 'IQ': 5, 'Behavioural': 5, 'Analytical Ability': 5 }
      };

      return {
        organizationId: organizationId,
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

  async getOrganizations(): Promise<Organization[]> {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('organizations').select('*').order('name');
      if (error) throw error;
      return (data || []).map(o => ({
        id: o.id,
        name: o.name,
        adminName: o.admin_name,
        adminEmail: o.admin_email,
        createdBy: o.created_by,
        createdAt: o.created_at
      }));
    } catch (err) {
      console.error("Failed to fetch organizations", err);
      return [];
    }
  },

  async validateOrganization(name: string): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const normalizedName = name.trim().toLowerCase();
      // Also check exact match on name
      const { data, error } = await sb.from('organizations')
        .select('id')
        .eq('name', normalizedName)
        .single();

      if (error || !data) return null;
      return data.id;
    } catch (err) {
      return null;
    }
  },

  async addOrganization(name: string, adminName: string, adminEmail: string, createdBy: string = 'system'): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      // Force lowercase name
      const normalizedName = name.trim().toLowerCase();

      const { error } = await sb.from('organizations').insert([{
        name: normalizedName,
        admin_name: adminName,
        admin_email: adminEmail,
        created_by: createdBy
      }]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to add organization", err);
      return false;
    }
  },

  async updateOrganization(org: Organization): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('organizations').update({
        admin_name: org.adminName,
        admin_email: org.adminEmail
      }).eq('id', org.id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to update organization", err);
      return false;
    }
  },

  async deleteOrganization(id: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('organizations').delete().eq('id', id);
      return !error;
    } catch (err) {
      console.error("Failed to delete organization", err);
      return false;
    }
  },

  async updateSettings(settings: AssessmentSettings) {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const orgId = settings.organizationId || '55147170-54ed-4fdd-840b-66f81cbc1883';
      const payload = [
        { key: 'overall_time', value: settings.overallTimeLimitMins, organization_id: orgId },
        { key: 'per_question_time', value: settings.questionTimeLimitSecs, organization_id: orgId },
        { key: 'total_questions', value: settings.totalQuestions, organization_id: orgId },
        { key: 'section_config', value: settings.questionsPerSection, organization_id: orgId }
      ];
      const { error } = await sb.from('settings').upsert(payload, { onConflict: 'key,organization_id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to update settings:", err);
      return false;
    }
  },

  async getUsers(organizationId?: string): Promise<User[]> {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      let query = sb.from('users').select('*').order('created_at', { ascending: false });
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(u => ({
        id: u.id,
        organizationId: u.organization_id,
        email: u.email,
        fullName: u.full_name,
        role: u.role as UserRole,
        createdAt: u.created_at
      }));
    } catch (err) {
      console.error("Failed to fetch users", err);
      return [];
    }
  },

  async addUser(user: Omit<User, 'id' | 'createdAt'>): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('users').insert([{
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        organization_id: user.organizationId || '55147170-54ed-4fdd-840b-66f81cbc1883'
      }]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to add user", err);
      return false;
    }
  },

  async updateUser(user: User): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('users').update({
        email: user.email,
        full_name: user.fullName,
        role: user.role
      }).eq('id', user.id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to update user", err);
      return false;
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('users').delete().eq('id', id);
      return !error;
    } catch (err) {
      console.error("Failed to delete user", err);
      return false;
    }
  },

  async checkInfrastructure() {
    const sb = getSupabase();
    if (!sb) return { connected: false, tables: {} };
    const tables = ['questions', 'results', 'evaluations', 'settings', 'sections', 'organizations', 'users'];
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

  async checkResultExists(candidateId: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { data } = await sb.from('results').select('id').eq('candidate_id', candidateId).limit(1);
      return !!data && data.length > 0;
    } catch {
      return false;
    }
  },

  async getQuestions(
    onlyActive = true,
    page = 1,
    pageSize = 10,
    category = '',
    search = '',
    organizationId?: string
  ): Promise<{ data: Question[], count: number }> {
    const sb = getSupabase();
    if (!sb) return { data: [], count: 0 };

    try {
      let query = sb.from('questions').select('*', { count: 'exact' });

      if (onlyActive) query = query.eq('is_active', true);
      if (category) query = query.eq('category', category);
      if (search) query = query.ilike('text', `%${search}%`);
      if (organizationId) query = query.eq('organization_id', organizationId);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const formatted = (data || []).map(q => ({
        id: q.id, category: q.category, difficulty: q.difficulty,
        text: q.text, options: q.options, correctOption: q.correct_option,
        isActive: q.is_active, organizationId: q.organization_id
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
        is_active: question.isActive,

        organization_id: question.organizationId || '55147170-54ed-4fdd-840b-66f81cbc1883'
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
        id: result.attemptId,
        started_at: result.startedAt, submitted_at: result.submittedAt, total_time_taken_sec: result.totalTimeTakenSec,
        total_questions: result.totalQuestions, attempted_count: result.attemptedCount, missed_count: result.missedCount,
        correct_count: result.correctCount, wrong_count: result.wrongCount, avg_time_per_answered_sec: result.avgTimePerAnsweredSec,
        score_percent: result.scorePercent, answers_json: JSON.parse(result.answersJson),
        organization_id: result.organizationId || '55147170-54ed-4fdd-840b-66f81cbc1883',
        candidate_id: result.candidateId, is_deleted: 0
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

  async getCandidates(organizationId?: string): Promise<Candidate[]> {
    const sb = getSupabase();
    if (!sb) return [];
    try {
      let query = sb.from('candidates').select('*').order('created_at', { ascending: false });
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(c => ({
        id: c.id,
        email: c.email,
        fullName: c.full_name,
        organizationId: c.organization_id,
        status: c.status,
        createdAt: c.created_at
      }));
    } catch (err) {
      console.error("Get candidates error:", err);
      return [];
    }
  },

  async addCandidate(candidate: { email: string, fullName: string, organizationId?: string }) {
    const sb = getSupabase();
    if (!sb) return false;
    const { error } = await sb.from('candidates').insert([{
      email: candidate.email,
      full_name: candidate.fullName,
      organization_id: candidate.organizationId || '55147170-54ed-4fdd-840b-66f81cbc1883',
      status: 'Registered'
    }]);
    if (error) {
      console.error("Add candidate error:", error);
      return false;
    }
    return true;
  },

  async deleteCandidate(id: string) {
    const sb = getSupabase();
    if (!sb) return false;
    const { error } = await sb.from('candidates').delete().eq('id', id);
    return !error;
  },

  async submitInterviewEvaluation(evalData: InterviewEvaluation): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('evaluations').insert([{
        id: evalData.id, interviewer_name: evalData.interviewerName,
        level: evalData.level, ratings: evalData.ratings, notes: evalData.notes, final_outcome: evalData.finalOutcome,
        final_comments: evalData.finalComments, submitted_at: evalData.submittedAt,
        organization_id: evalData.organizationId || '55147170-54ed-4fdd-840b-66f81cbc1883',
        candidate_id: evalData.candidateId, is_deleted: 0
      }]);
      return !error;
    } catch {
      return false;
    }
  },

  async verifyCandidateRegistration(email: string, organizationId: string): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const { data, error } = await sb.from('candidates')
        .select('id')
        .eq('email', email)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) return null;
      return data.id;
    } catch {
      return null;
    }
  },

  async updateCandidateStatus(email: string, organizationId: string, status: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const { error } = await sb.from('candidates')
        .update({ status })
        .eq('email', email)
        .eq('organization_id', organizationId);
      return !error;
    } catch {
      return false;
    }
  },

  async getCandidateStatus(email: string, organizationId: string): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const { data, error } = await sb.from('candidates')
        .select('status')
        .eq('email', email)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) return null;
      return data.status;
    } catch {
      return null;
    }
  },

  async resetCandidate(candidateId: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      // 1. Reset Status to 'Registered' so they can take exam again
      const { error: updateError } = await sb.from('candidates')
        .update({ status: 'Registered' })
        .eq('id', candidateId);

      if (updateError) throw updateError;

      // 2. Soft Delete Results
      await sb.from('results')
        .update({ is_deleted: 1 })
        .eq('candidate_id', candidateId);

      // 3. Soft Delete Evaluations
      await sb.from('evaluations')
        .update({ is_deleted: 1 })
        .eq('candidate_id', candidateId);

      return true;
    } catch (err) {
      console.error("Reset candidate failed", err);
      return false;
    }
  },

  async getAllResults(organizationId?: string): Promise<ExamResult[]> {
    const sb = getSupabase();
    if (!sb) return [];

    const fetchResults = async (includeDeletedCheck: boolean) => {
      // Join with candidates table to get name and email
      let query = sb.from('results')
        .select('*, candidates!candidate_id(full_name, email)')
        .order('submitted_at', { ascending: false });

      if (includeDeletedCheck) {
        query = query.neq('is_deleted', 1);
      }
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      return await query;
    };

    try {
      // Try with soft-delete filter
      const { data, error } = await fetchResults(true);
      if (error) throw error;
      return (data || []).map(r => ({
        attemptId: r.id,
        candidateName: r.candidates?.full_name || 'Unknown',
        candidateEmail: r.candidates?.email || 'Unknown',
        startedAt: r.started_at, submittedAt: r.submitted_at, totalTimeTakenSec: r.total_time_taken_sec,
        totalQuestions: r.total_questions, attemptedCount: r.attempted_count, missedCount: r.missed_count,
        correctCount: r.correct_count, wrongCount: r.wrong_count, avgTimePerAnsweredSec: r.avg_time_per_answered_sec,
        scorePercent: r.score_percent, answersJson: JSON.stringify(r.answers_json),
        organizationId: r.organization_id, candidateId: r.candidate_id
      }));
    } catch (err: any) {
      // Fallback: If 'is_deleted' column is missing (Code 400 or Postgres 42703), fetch without filter
      if (err.code === '42703' || err.code === '400' || err.status === 400 || err.message?.includes('is_deleted')) {
        console.warn("Soft-delete column missing, fetching all results.");
        try {
          const { data } = await fetchResults(false);
          return (data || []).map(r => ({
            attemptId: r.id,
            candidateName: r.candidates?.full_name || 'Unknown',
            candidateEmail: r.candidates?.email || 'Unknown',
            startedAt: r.started_at, submittedAt: r.submitted_at, totalTimeTakenSec: r.total_time_taken_sec,
            totalQuestions: r.total_questions, attemptedCount: r.attempted_count, missedCount: r.missed_count,
            correctCount: r.correct_count, wrongCount: r.wrong_count, avgTimePerAnsweredSec: r.avg_time_per_answered_sec,
            scorePercent: r.score_percent, answersJson: JSON.stringify(r.answers_json),
            organizationId: r.organization_id, candidateId: r.candidate_id
          }));
        } catch (retryErr) {
          return [];
        }
      }
      return [];
    }
  },

  async getAllEvaluations(organizationId?: string): Promise<InterviewEvaluation[]> {
    const sb = getSupabase();
    if (!sb) return [];

    const fetchEvals = async (includeDeletedCheck: boolean) => {
      // Join with candidates to get email
      let query = sb.from('evaluations')
        .select('*, candidates!candidate_id(email, full_name)')
        .order('submitted_at', { ascending: false });

      if (includeDeletedCheck) {
        query = query.neq('is_deleted', 1);
      }
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      return await query;
    };

    try {
      const { data, error } = await fetchEvals(true);
      if (error) throw error;

      return (data || []).map(e => ({
        id: e.id,
        candidateEmail: e.candidates?.email || 'Unknown',
        candidateName: e.candidates?.full_name,
        interviewerName: e.interviewer_name,
        level: e.level, ratings: e.ratings, notes: e.notes, finalOutcome: e.final_outcome,
        finalComments: e.final_comments, submittedAt: e.submitted_at,
        organizationId: e.organization_id,
        aiVerdict: e.notes?.['_AI_VERDICT'] ? JSON.parse(e.notes['_AI_VERDICT']) : undefined
      }));
    } catch (err: any) {
      // Fallback for missing column
      if (err.code === '42703' || err.code === '400' || err.status === 400 || err.message?.includes('is_deleted')) {
        console.warn("Soft-delete column missing, fetching all evaluations.");
        try {
          const { data } = await fetchEvals(false);
          return (data || []).map(e => ({
            id: e.id,
            candidateEmail: e.candidates?.email || 'Unknown',
            candidateName: e.candidates?.full_name,
            interviewerName: e.interviewer_name,
            level: e.level, ratings: e.ratings, notes: e.notes, finalOutcome: e.final_outcome,
            finalComments: e.final_comments, submittedAt: e.submitted_at,
            organizationId: e.organization_id,
            aiVerdict: e.notes?.['_AI_VERDICT'] ? JSON.parse(e.notes['_AI_VERDICT']) : undefined
          }));
        } catch {
          return [];
        }
      }
      return [];
    }
  },

  async getEvaluation(email: string, organizationId?: string): Promise<InterviewEvaluation | null> {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      let query = sb.from('evaluations').select('*').eq('candidate_email', email);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.limit(1).single();

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
