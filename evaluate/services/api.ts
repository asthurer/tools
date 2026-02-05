
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

// Debug Log to verify file update
console.log("%c Evaluate.ai API Service v2.2 Loaded ", "background: #002b49; color: #d4af37; padding: 4px; border-radius: 4px; font-weight: bold");

import { Question, ExamResult, InterviewEvaluation, AssessmentSettings, Section, Organization, User, UserRole, Candidate, AuditLog, AuditEventType, AuditEntityType, DeviceInfo } from '../types';
import { SUPABASE_CONFIG } from '../config';
import { aiService } from './aiService';

let supabaseInstance: SupabaseClient | null = null;

const getSupabase = () => {
  // Check both local variable and a global to be extra safe during HMR
  if (supabaseInstance) return supabaseInstance;
  if (typeof window !== 'undefined' && (window as any)._supabaseInstance) {
    supabaseInstance = (window as any)._supabaseInstance;
    return supabaseInstance;
  }

  const url = SUPABASE_CONFIG.URL || localStorage.getItem('supabase_url');
  const key = SUPABASE_CONFIG.ANON_KEY || localStorage.getItem('supabase_key');

  if (url && key) {
    try {
      const client = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      supabaseInstance = client;
      if (typeof window !== 'undefined') {
        (window as any)._supabaseInstance = client;
      }
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
    // Reset instance to force re-initialization with new config in getSupabase
    supabaseInstance = null;
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

    // Log login event
    const userProfile = await this.getUserProfile(email);
    this.logAuditEvent({
      eventType: 'login',
      userEmail: email,
      userId: data.user?.id,
      organizationId: userProfile?.organizationId
    }).catch(err => console.error('Audit log failed:', err));

    return data;
  },

  async signOut() {
    const sb = getSupabase();
    if (sb) {
      // Get session before logging out
      const session = await this.getSession();
      const userEmail = session?.user?.email;
      const userProfile = userEmail ? await this.getUserProfile(userEmail) : null;

      await sb.auth.signOut();

      // Log logout event
      if (userEmail) {
        this.logAuditEvent({
          eventType: 'logout',
          userEmail,
          userId: session?.user?.id,
          organizationId: userProfile?.organizationId
        }).catch(err => console.error('Audit log failed:', err));
      }
    }
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
      .maybeSingle();

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
        aiLimit: o.ai_limit || 0,
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

  async addOrganization(name: string, adminName: string, adminEmail: string, aiLimit: number = 0, createdBy: string = 'system'): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      // Force lowercase name
      const normalizedName = name.trim().toLowerCase();

      const { error } = await sb.from('organizations').insert([{
        name: normalizedName,
        admin_name: adminName,
        admin_email: adminEmail,
        ai_limit: aiLimit,
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
        admin_email: org.adminEmail,
        ai_limit: org.aiLimit
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

      if (!error) {
        // Log settings update
        const session = await this.getSession();
        this.logAuditEvent({
          eventType: 'update',
          entityType: 'settings',
          userEmail: session?.user?.email,
          organizationId: orgId,
          actionDetails: {
            overallTime: settings.overallTimeLimitMins,
            perQuestionTime: settings.questionTimeLimitSecs,
            totalQuestions: settings.totalQuestions
          }
        }).catch(err => console.error('Audit log failed:', err));
      }

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to update settings:", err);
      return false;
    }
  },

  async incrementAiUsage(organizationId: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await sb.rpc('increment_ai_usage', {
        org_id: organizationId,
        usage_date_val: today
      });
      // If the function doesn't exist yet (SQL not run), we fail gracefully
      if (error) {
        if (error.code === 'P0001' || error.message?.includes('does not exist')) {
          console.warn("AI Usage tracking RPC not found. Please run the SQL migration.");
          return false;
        }
        throw error;
      }
      return true;
    } catch (err) {
      console.error("Failed to increment AI usage:", err);
      return false;
    }
  },

  async checkAiUsageLimit(organizationId: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return true;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: orgData } = await sb.from('organizations').select('ai_limit').eq('id', organizationId).maybeSingle();
      const { data: usageData } = await sb.from('ai_usage').select('requests_made').eq('organization_id', organizationId).eq('usage_date', today).maybeSingle();

      const limit = orgData?.ai_limit || 0;
      const currentUsage = usageData?.requests_made || 0;

      return currentUsage < limit;
    } catch (err) {
      console.error("Failed to check AI usage limit:", err);
      return true;
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
      // Check if question exists using maybeSingle to avoid 406/404 errors on missing records
      const { data: existing } = await sb.from('questions').select('id').eq('id', question.id).maybeSingle();
      const isUpdate = !!existing;

      const { error } = await sb.from('questions').upsert({
        id: question.id, category: question.category, difficulty: question.difficulty,
        text: question.text, options: question.options, correct_option: question.correctOption,
        is_active: question.isActive,

        organization_id: question.organizationId || '55147170-54ed-4fdd-840b-66f81cbc1883'
      }, { onConflict: 'id' });

      if (!error) {
        // Log question create/update
        const session = await this.getSession();
        this.logAuditEvent({
          eventType: isUpdate ? 'update' : 'create',
          entityType: 'question',
          entityId: question.id,
          userEmail: session?.user?.email,
          organizationId: question.organizationId,
          actionDetails: {
            category: question.category,
            difficulty: question.difficulty,
            isActive: question.isActive
          }
        }).catch(err => console.error('Audit log failed:', err));
      }

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

      if (!error) {
        // Log question deletion
        const session = await this.getSession();
        this.logAuditEvent({
          eventType: 'delete',
          entityType: 'question',
          entityId: id,
          userEmail: session?.user?.email
        }).catch(err => console.error('Audit log failed:', err));
      }

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

      if (!error) {
        // Log exam submission
        this.logAuditEvent({
          eventType: 'exam_submit',
          entityType: 'result',
          entityId: result.attemptId,
          userEmail: result.candidateEmail,
          organizationId: result.organizationId,
          actionDetails: {
            candidateName: result.candidateName,
            score: result.scorePercent,
            totalQuestions: result.totalQuestions
          }
        }).catch(err => console.error('Audit log failed:', err));
      }

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

    if (!error) {
      // Log candidate creation
      const session = await this.getSession();
      this.logAuditEvent({
        eventType: 'create',
        entityType: 'candidate',
        entityId: candidate.email,
        userEmail: session?.user?.email,
        organizationId: candidate.organizationId,
        actionDetails: {
          candidateEmail: candidate.email,
          candidateName: candidate.fullName
        }
      }).catch(err => console.error('Audit log failed:', err));
    }

    if (error) {
      console.error("Add candidate error:", error);
      return false;
    }
    return true;
  },

  async updateCandidate(id: string, candidate: { email: string, fullName: string, organizationId?: string }) {
    const sb = getSupabase();
    if (!sb) return false;

    // Get existing candidate details for logging changes
    const { data: oldData } = await sb.from('candidates').select('*').eq('id', id).single();

    const { error } = await sb.from('candidates').update({
      email: candidate.email,
      full_name: candidate.fullName
    }).eq('id', id);

    if (!error) {
      // Log candidate update
      const session = await this.getSession();
      this.logAuditEvent({
        eventType: 'update',
        entityType: 'candidate',
        entityId: candidate.email,
        userEmail: session?.user?.email,
        organizationId: candidate.organizationId,
        actionDetails: {
          candidateId: id,
          from: { email: oldData?.email, name: oldData?.full_name },
          to: { email: candidate.email, name: candidate.fullName }
        }
      }).catch(err => console.error('Audit log failed:', err));
    }

    if (error) {
      console.error("Update candidate error:", error);
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
      const { error } = await sb.from('evaluations').upsert([{
        id: evalData.id, interviewer_name: evalData.interviewerName,
        level: evalData.level, ratings: evalData.ratings, notes: evalData.notes, final_outcome: evalData.finalOutcome,
        final_comments: evalData.finalComments, submitted_at: evalData.submittedAt,
        organization_id: evalData.organizationId || '55147170-54ed-4fdd-840b-66f81cbc1883',
        candidate_id: evalData.candidateId, is_deleted: 0
      }], { onConflict: 'id' });

      if (!error) {
        // Log evaluation submission
        this.logAuditEvent({
          eventType: 'eval_submit',
          entityType: 'evaluation',
          entityId: evalData.id,
          userEmail: evalData.interviewerName,
          organizationId: evalData.organizationId,
          actionDetails: {
            candidateEmail: evalData.candidateEmail,
            level: evalData.level,
            outcome: evalData.finalOutcome
          }
        }).catch(err => console.error('Audit log failed:', err));
      }

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

      if (!error) {
        // Log candidate status update
        this.logAuditEvent({
          eventType: 'update',
          entityType: 'candidate',
          entityId: email,
          organizationId,
          actionDetails: {
            candidateEmail: email,
            newStatus: status
          }
        }).catch(err => console.error('Audit log failed:', err));
      }

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
      // Get candidate info before reset
      const { data: candidate } = await sb.from('candidates')
        .select('email, organization_id')
        .eq('id', candidateId)
        .single();

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

      // Log candidate reset
      if (candidate) {
        const session = await this.getSession();
        this.logAuditEvent({
          eventType: 'reset',
          entityType: 'candidate',
          entityId: candidateId,
          userEmail: session?.user?.email,
          organizationId: candidate.organization_id,
          actionDetails: {
            candidateEmail: candidate.email
          }
        }).catch(err => console.error('Audit log failed:', err));
      }

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

  async getEvaluation(candidateIdentifier: string, organizationId?: string): Promise<InterviewEvaluation | null> {
    const sb = getSupabase();
    if (!sb) return null;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateIdentifier);

      let query = sb.from('evaluations').select('*, candidates!candidate_id(email, full_name)');

      if (isUuid) {
        query = query.eq('candidate_id', candidateIdentifier);
      } else {
        // If passed an email, we can't query evaluations directly if candidate_email col is gone.
        // We must bail out or try to look up candidate first which is expensive.
        // Given the app flow, we should always have ID now.
        console.warn("getEvaluation called with non-UUID, likely email. Legacy lookup not supported without candidate_email column.");
        return null;
      }

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        candidateEmail: data.candidates?.email || 'Unknown',
        candidateName: data.candidates?.full_name,
        interviewerName: data.interviewer_name || '', // Handle if column dropped or null
        level: data.level,
        ratings: data.ratings,
        notes: data.notes,
        finalOutcome: data.final_outcome,
        finalComments: data.final_comments,
        submittedAt: data.submitted_at,
        organizationId: data.organization_id,
        aiVerdict: data.notes?.['_AI_VERDICT'] ? JSON.parse(data.notes['_AI_VERDICT']) : undefined
      };
    } catch (e) {
      console.error("getEvaluation failed", e);
      return null;
    }
  },



  async generateProbeQuestions(standardTitle: string, level: string, contextIndicators: string[], organizationId?: string): Promise<string[]> {
    try {
      const prompt = `
            You are an expert interviewer. Generate 3 specific, behavioral probe questions to assess a candidate for the leadership standard "${standardTitle}" at level "${level}".
            
            Context - Positive Indicators for this standard:
            ${contextIndicators.map(i => `- ${i}`).join('\n')}

            Output EXACTLY 3 questions, one per line. Do not include numbering or prefixes like "1.".
          `;

      const text = await aiService.generateText(prompt, organizationId);
      return text.split('\n').filter(line => line.trim().length > 0).slice(0, 3);
    } catch (e) {
      console.error("AI Generation failed", e);
      return ["Failed to generate questions. Please try again."];
    }
  },

  async generateVerdict(candidateName: string, technicalScore: number, leadershipRatings: Record<string, string>, organizationId?: string): Promise<{ decision: 'Hire' | 'No Hire' | 'Review', confidence: number, rationale: string }> {
    try {
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

      return await aiService.generateJSON<{ decision: 'Hire' | 'No Hire' | 'Review', confidence: number, rationale: string }>(prompt, organizationId);
    } catch (e) {
      console.error("Verdict Generation failed", e);
      return { decision: 'Review', confidence: 0, rationale: "AI failed to generate verdict." };
    }
  },

  async saveVerdict(evaluationId: string, verdict: any, existingNotes: Record<string, string>): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;

    const updatedNotes = { ...(existingNotes || {}), '_AI_VERDICT': JSON.stringify(verdict) };

    try {
      const { error } = await sb.from('evaluations')
        .update({ notes: updatedNotes })
        .eq('id', evaluationId);
      return !error;
    } catch (e) {
      console.error("Failed to save verdict", e);
      return false;
    }
  },

  // ===== AUDIT LOGGING FUNCTIONS =====

  /**
   * Parse user agent string to extract device information
   */
  parseDeviceInfo(userAgent: string): DeviceInfo {
    const ua = userAgent.toLowerCase();
    const deviceInfo: DeviceInfo = {};

    // Detect browser
    if (ua.includes('chrome') && !ua.includes('edge')) {
      deviceInfo.browser = 'Chrome';
      const match = ua.match(/chrome\/([\d.]+)/);
      if (match) deviceInfo.browserVersion = match[1];
    } else if (ua.includes('firefox')) {
      deviceInfo.browser = 'Firefox';
      const match = ua.match(/firefox\/([\d.]+)/);
      if (match) deviceInfo.browserVersion = match[1];
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      deviceInfo.browser = 'Safari';
      const match = ua.match(/version\/([\d.]+)/);
      if (match) deviceInfo.browserVersion = match[1];
    } else if (ua.includes('edge')) {
      deviceInfo.browser = 'Edge';
      const match = ua.match(/edg\/([\d.]+)/);
      if (match) deviceInfo.browserVersion = match[1];
    } else if (ua.includes('opera') || ua.includes('opr')) {
      deviceInfo.browser = 'Opera';
    }

    // Detect OS
    if (ua.includes('windows nt')) {
      deviceInfo.os = 'Windows';
      if (ua.includes('windows nt 10.0')) deviceInfo.osVersion = '10/11';
      else if (ua.includes('windows nt 6.3')) deviceInfo.osVersion = '8.1';
      else if (ua.includes('windows nt 6.2')) deviceInfo.osVersion = '8';
      else if (ua.includes('windows nt 6.1')) deviceInfo.osVersion = '7';
    } else if (ua.includes('mac os x')) {
      deviceInfo.os = 'macOS';
      const match = ua.match(/mac os x ([\d_]+)/);
      if (match) deviceInfo.osVersion = match[1].replace(/_/g, '.');
    } else if (ua.includes('linux')) {
      deviceInfo.os = 'Linux';
    } else if (ua.includes('android')) {
      deviceInfo.os = 'Android';
      const match = ua.match(/android ([\d.]+)/);
      if (match) deviceInfo.osVersion = match[1];
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      deviceInfo.os = 'iOS';
      const match = ua.match(/os ([\d_]+)/);
      if (match) deviceInfo.osVersion = match[1].replace(/_/g, '.');
    }

    // Detect device type
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceInfo.deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceInfo.deviceType = 'tablet';
    } else {
      deviceInfo.deviceType = 'desktop';
    }

    return deviceInfo;
  },

  /**
   * Attempt to get client IP address (limited in browser context)
   * Note: This will only work if you're proxying through a server that adds headers
   * For pure client-side apps, IP will typically be null
   */
  async getClientIP(): Promise<string | undefined> {
    try {
      // In browser context, we can't reliably get the IP
      // This would need to be done server-side
      // For now, we'll attempt to use a public IP API
      const response = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
      const data = await response.json();
      return data.ip;
    } catch {
      return undefined;
    }
  },

  /**
   * Log an audit event
   */
  async logAuditEvent(params: {
    eventType: AuditEventType;
    entityType?: AuditEntityType;
    entityId?: string;
    actionDetails?: Record<string, any>;
    userEmail?: string;
    userId?: string;
    organizationId?: string;
  }): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;

    try {
      // Capture session info
      const userAgent = navigator.userAgent;
      const deviceInfo = this.parseDeviceInfo(userAgent);
      const ipAddress = await this.getClientIP();

      const auditEntry = {
        event_type: params.eventType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        action_details: params.actionDetails ? JSON.stringify(params.actionDetails) : undefined,
        user_email: params.userEmail,
        user_id: params.userId,
        organization_id: params.organizationId,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_info: JSON.stringify(deviceInfo),
        is_deleted: 0
      };

      const { error } = await sb.from('audit_logs').insert([auditEntry]);

      if (error) {
        console.error("Failed to log audit event:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Audit logging error:", err);
      return false;
    }
  },

  /**
   * Get audit logs with optional filtering
   */
  async getAuditLogs(params?: {
    organizationId?: string;
    eventType?: AuditEventType;
    entityType?: AuditEntityType;
    userEmail?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    const sb = getSupabase();
    if (!sb) return [];

    try {
      let query = sb.from('audit_logs')
        .select('*')
        .eq('is_deleted', 0)
        .order('timestamp', { ascending: false });

      // Apply filters
      if (params?.organizationId) {
        query = query.eq('organization_id', params.organizationId);
      }
      if (params?.eventType) {
        query = query.eq('event_type', params.eventType);
      }
      if (params?.entityType) {
        query = query.eq('entity_type', params.entityType);
      }
      if (params?.userEmail) {
        query = query.eq('user_email', params.userEmail);
      }
      if (params?.startDate) {
        query = query.gte('timestamp', params.startDate);
      }
      if (params?.endDate) {
        query = query.lte('timestamp', params.endDate);
      }
      if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        organizationId: log.organization_id,
        userId: log.user_id,
        userEmail: log.user_email,
        eventType: log.event_type as AuditEventType,
        entityType: log.entity_type as AuditEntityType,
        entityId: log.entity_id,
        actionDetails: log.action_details,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        deviceInfo: log.device_info,
        timestamp: log.timestamp
      }));
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      return [];
    }
  },

  /**
   * Export audit logs as CSV
   */
  async exportAuditLogs(logs: AuditLog[]): Promise<string> {
    const headers = ['Timestamp', 'User Email', 'Event Type', 'Entity Type', 'Entity ID', 'IP Address', 'Device Type', 'Browser', 'OS', 'Details'];

    const rows = logs.map(log => {
      let deviceInfo: DeviceInfo = {};
      try {
        deviceInfo = JSON.parse(log.deviceInfo || '{}');
      } catch { }

      return [
        log.timestamp,
        log.userEmail || '',
        log.eventType,
        log.entityType || '',
        log.entityId || '',
        log.ipAddress || '',
        deviceInfo.deviceType || '',
        deviceInfo.browser || '',
        deviceInfo.os || '',
        log.actionDetails || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }
};
