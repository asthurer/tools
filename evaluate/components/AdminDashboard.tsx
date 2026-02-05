
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { ExamResult, Question, InterviewEvaluation, Rating, Category, Difficulty, OptionKey, AssessmentSettings, AnswerDetail, Section, Organization, User, UserRole, Candidate, AuditLog, AuditEventType, AuditEntityType } from '../types';
import { LEADERSHIP_STANDARDS, OVERALL_TIME_LIMIT_SEC, QUESTION_TIME_LIMIT_SEC } from '../constants';
import { SUPABASE_CONFIG } from '../config';
import { AIQuestionGenerator } from './AIQuestionGenerator';

interface Props {
  onEvaluate: (candidate: { candidateName: string, candidateEmail: string, organizationId?: string, candidateId: string }) => void;
  onLogout?: () => void;
  currentUser?: User | null;
  selectedOrgId?: string;
  onOrganizationSelect?: (id: string) => void;
  initialActiveTab?: 'leaderboard' | 'assessments' | 'questions' | 'config' | 'organizations' | 'users' | 'candidates' | 'audit';
  onTabChange?: (tab: 'leaderboard' | 'assessments' | 'questions' | 'config' | 'organizations' | 'users' | 'candidates' | 'audit') => void;
}

export const AdminDashboard: React.FC<Props> = ({ onEvaluate, onLogout, currentUser, selectedOrgId: propSelectedOrgId, onOrganizationSelect, initialActiveTab, onTabChange }) => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [evaluations, setEvaluations] = useState<InterviewEvaluation[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLookup, setQuestionsLookup] = useState<Record<string, Question>>({});
  const [sections, setSections] = useState<Section[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'assessments' | 'questions' | 'config' | 'organizations' | 'users' | 'candidates' | 'audit'>(initialActiveTab || 'leaderboard');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newCandidateData, setNewCandidateData] = useState({ email: '', fullName: '' });
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [isEditingCandidate, setIsEditingCandidate] = useState(false);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [newOrgData, setNewOrgData] = useState({ id: '', name: '', adminName: '', adminEmail: '', aiLimit: 0 });
  const [isAddingOrg, setIsAddingOrg] = useState(false);

  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Internal state for non-lifted scenarios, or local override check
  // However, since we now lift state, we should rely on the prop if provided.
  // We'll use a derived value or a local state that syncs.
  const [localSelectedOrgId, setLocalSelectedOrgId] = useState<string | undefined>(currentUser?.organizationId);

  // Use the prop if passed, otherwise fall back to local (backward compatibility/stand-alone)
  const selectedOrgId = propSelectedOrgId !== undefined ? propSelectedOrgId : localSelectedOrgId;

  const handleOrgChange = (newId: string) => {
    if (onOrganizationSelect) {
      onOrganizationSelect(newId);
    } else {
      setLocalSelectedOrgId(newId);
    }
  };

  useEffect(() => {
    // If not controlled, and we just loaded a user, set the default
    if (!onOrganizationSelect && currentUser?.organizationId && !localSelectedOrgId) {
      setLocalSelectedOrgId(currentUser.organizationId);
    }
  }, [currentUser, onOrganizationSelect, localSelectedOrgId]);

  // Sync active tab changes to parent
  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  const [newUserData, setNewUserData] = useState<{ id: string, email: string, fullName: string, role: UserRole }>({ id: '', email: '', fullName: '', role: 'admin' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [infraStatus, setInfraStatus] = useState<{ connected: boolean, tables: Record<string, boolean> }>({
    connected: false,
    tables: {}
  });
  const [syncMessage, setSyncMessage] = useState<{ text: string, type: 'info' | 'success' | 'error' } | null>(null);

  const [selectedProfile, setSelectedProfile] = useState<ExamResult | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [viewingComment, setViewingComment] = useState<{ title: string, comment: string } | null>(null);
  const [generatingVerdict, setGeneratingVerdict] = useState(false);

  const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({
    isOpen: false, title: '', message: '', onConfirm: () => { }
  });

  const requestConfirmation = (title: string, message: string, action: () => void) => {
    setConfirmation({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        action();
        setConfirmation(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const [assessmentSettings, setAssessmentSettings] = useState<AssessmentSettings>({
    overallTimeLimitMins: OVERALL_TIME_LIMIT_SEC / 60,
    questionTimeLimitSecs: QUESTION_TIME_LIMIT_SEC,
    totalQuestions: 20,
    questionsPerSection: {}
  });

  const [newSectionName, setNewSectionName] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilters, setAuditFilters] = useState({
    eventType: '' as AuditEventType | '',
    entityType: '' as AuditEntityType | '',
    userEmail: '',
    startDate: '',
    endDate: '',
    limit: 100
  });
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Pagination & Filtering State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQuestions = useCallback(async (page: number, size: number, cat: string, query: string) => {
    setLoading(true);
    try {
      const { data, count } = await apiService.getQuestions(false, page, size, cat, query, selectedOrgId);
      setQuestions(data);
      setTotalQuestionsCount(count);
    } catch (err) {
      console.error("Fetch questions error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId]);

  const fetchAllQuestionsForLookup = async () => {
    try {
      // Fetch a large chunk of questions to ensure results have data to link to
      const { data } = await apiService.getQuestions(false, 1, 1000, '', '', selectedOrgId);
      const lookup: Record<string, Question> = {};
      data.forEach(q => { lookup[q.id] = q; });
      setQuestionsLookup(lookup);
    } catch (err) {
      console.error("Lookup fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    runDiagnostics();
    fetchSettings();
    fetchSections();
    fetchOrganizations();
    fetchUsers();
    fetchCandidates();
    fetchAllQuestionsForLookup();
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (activeTab === 'questions') {
      fetchQuestions(currentPage, pageSize, filterCategory, searchQuery);
    }
  }, [activeTab, currentPage, pageSize, filterCategory, searchQuery, fetchQuestions, selectedOrgId]);

  const fetchSections = async () => {
    const list = await apiService.getSections(selectedOrgId);
    setSections(list);
  };

  const fetchOrganizations = async () => {
    const list = await apiService.getOrganizations();
    setOrganizations(list);
  };

  const fetchUsers = async () => {
    // For Super Admins, users are global/separate, so we fetch ALL (undefined orgId).
    // For others, we scope to the selected/current organization.
    const orgIdScope = currentUser?.role === 'super_admin' ? undefined : selectedOrgId;
    const list = await apiService.getUsers(orgIdScope);
    setUsers(list);
  };

  const fetchCandidates = async () => {
    const list = await apiService.getCandidates(selectedOrgId);
    setCandidates(list);
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await apiService.getAuditLogs({
        organizationId: selectedOrgId,
        ...auditFilters,
        eventType: auditFilters.eventType || undefined,
        entityType: auditFilters.entityType || undefined,
        userEmail: auditFilters.userEmail || undefined,
        startDate: auditFilters.startDate || undefined,
        endDate: auditFilters.endDate || undefined,
        limit: auditFilters.limit
      });
      setAuditLogs(logs);
    } catch (err) {
      console.error("Fetch audit logs error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAuditLogs = async () => {
    const csv = await apiService.exportAuditLogs(auditLogs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };



  const fetchSettings = async () => {
    const settings = await apiService.getSettings(selectedOrgId);
    if (settings) {
      setAssessmentSettings(settings);
    }
  };

  const handleUpdateSettings = async () => {
    setLoading(true);
    setSyncMessage({ text: "Syncing with cloud...", type: 'info' });
    const success = await apiService.updateSettings({ ...assessmentSettings, organizationId: selectedOrgId });
    setLoading(false);
    if (success) {
      setSyncMessage({ text: "Assessment parameters updated and saved to DB.", type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to update parameters. Verify table schema and permissions.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resData, evalData] = await Promise.all([
        apiService.getAllResults(selectedOrgId),
        apiService.getAllEvaluations(selectedOrgId)
      ]);
      setResults(resData || []);
      setEvaluations(evalData || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostics = async () => {
    const status = await apiService.checkInfrastructure();
    setInfraStatus(status);
    return status;
  };



  const handleSaveQuestion = async (q: Question) => {
    await apiService.saveSection({ name: q.category, isActive: true, organizationId: selectedOrgId });
    const success = await apiService.saveQuestion({ ...q, organizationId: selectedOrgId });
    if (success) {
      setEditingQuestion(null);
      fetchQuestions(currentPage, pageSize, filterCategory, searchQuery);
      fetchAllQuestionsForLookup();
      fetchSections();
      setSyncMessage({ text: "Question saved.", type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to save question.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleAISave = async (newQs: Question[]) => {
    setLoading(true);
    setShowAIGenerator(false);
    try {
      let successCount = 0;
      for (const q of newQs) {
        await apiService.saveSection({ name: q.category, isActive: true, organizationId: selectedOrgId });
        const ok = await apiService.saveQuestion({ ...q, organizationId: selectedOrgId });
        if (ok) successCount++;
      }
      setSyncMessage({ text: `${successCount} AI questions imported successfully.`, type: 'success' });
    } catch (err) {
      setSyncMessage({ text: "Batch import encountered errors.", type: 'error' });
    } finally {
      setLoading(false);
      fetchQuestions(currentPage, pageSize, filterCategory, searchQuery);
      fetchAllQuestionsForLookup();
      fetchSections();
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    requestConfirmation("Delete Question?", "This action cannot be undone. The question will be permanently removed.", async () => {
      const success = await apiService.deleteQuestion(id);
      if (success) {
        fetchQuestions(currentPage, pageSize, filterCategory, searchQuery);
        fetchAllQuestionsForLookup();
        setSyncMessage({ text: "Question deleted.", type: 'success' });
      } else {
        setSyncMessage({ text: "Deletion failed.", type: 'error' });
      }
      setTimeout(() => setSyncMessage(null), 3000);
    });
  };

  const handleDeleteResult = async (id: string) => {
    requestConfirmation("Purge Result?", "This will permanently delete the candidate's exam record. This cannot be undone.", async () => {
      setLoading(true);
      const success = await apiService.deleteResult(id);
      if (success) {
        await fetchData();
        setSyncMessage({ text: "Record purged successfully.", type: 'success' });
      } else {
        setSyncMessage({ text: "Purge failed. Verify permissions.", type: 'error' });
      }
      setLoading(false);
      setTimeout(() => setSyncMessage(null), 3000);
    });
  };

  const getRatingColor = (rating: Rating) => {
    switch (rating) {
      case 'Strong Evidence': return 'text-green-600 bg-green-50 border-green-200';
      case 'Good Evidence': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Limited Evidence': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-slate-400 bg-slate-50 border-slate-200';
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (b.scorePercent !== a.scorePercent) return b.scorePercent - a.scorePercent;
    if (a.totalTimeTakenSec !== b.totalTimeTakenSec) return a.totalTimeTakenSec - b.totalTimeTakenSec;
    return a.avgTimePerAnsweredSec - b.avgTimePerAnsweredSec;
  });

  const getActiveCategories = () => {
    return sections.filter(s => s.isActive).map(s => s.name);
  };

  const handleSectionConfigChange = (category: string, count: number) => {
    setAssessmentSettings(prev => ({
      ...prev,
      questionsPerSection: {
        ...prev.questionsPerSection,
        [category]: count
      }
    }));
  };

  const handleAddNewSection = async () => {
    const trimmed = newSectionName.trim();
    if (!trimmed) return;

    setLoading(true);
    const ok = await apiService.saveSection({ name: trimmed, isActive: true, organizationId: selectedOrgId });
    setLoading(false);

    if (ok) {
      handleSectionConfigChange(trimmed, 0);
      setNewSectionName('');
      setIsAddingSection(false);
      fetchSections();
      setSyncMessage({ text: `Domain "${trimmed}" initialized.`, type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to create section. Check DB permissions.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleEditOrganization = async () => {
    if (!newOrgData.adminName || !newOrgData.adminEmail) {
      setError("Please fill all fields.");
      return;
    }
    setError(null);
    setLoading(true);
    const success = await apiService.updateOrganization({
      id: newOrgData.id,
      name: newOrgData.name,
      adminName: newOrgData.adminName,
      adminEmail: newOrgData.adminEmail,
      aiLimit: newOrgData.aiLimit
    });
    setLoading(false);

    if (success) {
      setNewOrgData({ id: '', name: '', adminName: '', adminEmail: '', aiLimit: 0 });
      setIsEditingOrg(false);
      setIsAddingOrg(false);
      fetchOrganizations();
      setSyncMessage({ text: "Organization updated successfully.", type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to update organization.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleDeleteOrganization = async (id: string) => {
    requestConfirmation("Delete Organization?", "Are you sure? This will remove the organization and could affect associated data.", async () => {
      setLoading(true);
      const success = await apiService.deleteOrganization(id);
      setLoading(false);

      if (success) {
        fetchOrganizations();
        setSyncMessage({ text: "Organization deleted.", type: 'success' });
      } else {
        setSyncMessage({ text: "Failed to delete organization.", type: 'error' });
      }
      setTimeout(() => setSyncMessage(null), 3000);
    });
  };

  const handleAddOrganization = async () => {
    if (!newOrgData.name || !newOrgData.adminName || !newOrgData.adminEmail) {
      setError("Please fill all fields for the organization.");
      return;
    }
    setError(null);

    setLoading(true);
    const success = await apiService.addOrganization(newOrgData.name, newOrgData.adminName, newOrgData.adminEmail, newOrgData.aiLimit);
    setLoading(false);

    if (success) {
      setNewOrgData({ id: '', name: '', adminName: '', adminEmail: '', aiLimit: 0 });
      setIsAddingOrg(false);
      fetchOrganizations();
      setSyncMessage({ text: "Organization added successfully.", type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to add organization. Name might be duplicate.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleAddUser = async () => {
    if (!newUserData.email || !newUserData.fullName) {
      alert("Please fill all fields.");
      return;
    }
    setLoading(true);
    const success = await apiService.addUser({
      email: newUserData.email,
      fullName: newUserData.fullName,
      role: newUserData.role,
      organizationId: selectedOrgId
    });
    setLoading(false);

    if (success) {
      setNewUserData({ id: '', email: '', fullName: '', role: 'admin' });
      setIsAddingUser(false);
      fetchUsers();
      setSyncMessage({ text: "User added successfully.", type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to add user.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleEditUser = async () => {
    if (!newUserData.email || !newUserData.fullName) {
      alert("Please fill all fields.");
      return;
    }
    setLoading(true);
    const success = await apiService.updateUser({
      id: newUserData.id,
      email: newUserData.email,
      fullName: newUserData.fullName,
      role: newUserData.role
    });
    setLoading(false);

    if (success) {
      setNewUserData({ id: '', email: '', fullName: '', role: 'admin' });
      setIsEditingUser(false);
      setIsAddingUser(false);
      fetchUsers();
      setSyncMessage({ text: "User updated successfully.", type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to update user.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleDeleteUser = async (id: string) => {
    requestConfirmation("Delete User?", "This user will lose access immediately. Proceed?", async () => {
      setLoading(true);
      const success = await apiService.deleteUser(id);
      setLoading(false);
      if (success) {
        fetchUsers();
        setSyncMessage({ text: "User deleted.", type: 'success' });
      } else {
        setSyncMessage({ text: "Failed to delete user.", type: 'error' });
      }
      setTimeout(() => setSyncMessage(null), 3000);
    });
  };

  const handleAddCandidate = async () => {
    if (!newCandidateData.email || !newCandidateData.fullName) {
      setError("Please fill all fields.");
      return;
    }
    setError(null);
    setLoading(true);
    const success = await apiService.addCandidate({
      email: newCandidateData.email,
      fullName: newCandidateData.fullName,
      organizationId: selectedOrgId
    });
    setLoading(false);
    if (success) {
      setNewCandidateData({ email: '', fullName: '' });
      setIsAddingCandidate(false);
      fetchCandidates();
      setSyncMessage({ text: "Candidate added successfully.", type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to add candidate.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleEditCandidate = async () => {
    if (!editingCandidateId || !newCandidateData.email || !newCandidateData.fullName) {
      setError("Please fill all fields.");
      return;
    }
    setError(null);
    setLoading(true);
    const success = await apiService.updateCandidate(editingCandidateId, {
      ...newCandidateData,
      organizationId: selectedOrgId
    });
    setLoading(false);
    if (success) {
      setNewCandidateData({ email: '', fullName: '' });
      setIsAddingCandidate(false);
      setIsEditingCandidate(false);
      setEditingCandidateId(null);
      fetchCandidates();
      setSyncMessage({ text: "Candidate updated successfully.", type: 'success' });
    } else {
      setSyncMessage({ text: "Failed to update candidate.", type: 'error' });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleResetCandidate = async (id: string) => {
    requestConfirmation("Reset Candidate?", "This will archive their previous attempts and allow them to take the exam again.", async () => {
      setLoading(true);
      const success = await apiService.resetCandidate(id);
      if (success) {
        fetchCandidates();
        setSyncMessage({ text: "Candidate reset successfully.", type: 'success' });
      } else {
        setSyncMessage({ text: "Reset failed.", type: 'error' });
      }
      setLoading(false);
      setTimeout(() => setSyncMessage(null), 3000);
    });
  };

  const handleDeleteCandidate = async (id: string) => {
    requestConfirmation("Delete Candidate?", "This will verify remove the candidate from the registry.", async () => {
      setLoading(true);
      const success = await apiService.deleteCandidate(id);
      setLoading(false);
      if (success) {
        fetchCandidates();
        setSyncMessage({ text: "Candidate deleted.", type: 'success' });
      } else {
        setSyncMessage({ text: "Failed to delete candidate.", type: 'error' });
      }
      setTimeout(() => setSyncMessage(null), 3000);
    });
  };

  const totalPages = Math.ceil(totalQuestionsCount / pageSize);

  const PaginationControls = () => (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
          Viewing <span className="text-slate-900">{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalQuestionsCount)}</span> of <span className="text-slate-900">{totalQuestionsCount}</span> records
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Questions per page:</span>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[5, 10, 20, 50, 100].map(size => (
              <button
                key={size}
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${pageSize === size ? 'bg-white text-[#002b49] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          className={`p-4 rounded-2xl border-2 transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed border-slate-100' : 'hover:bg-slate-50 border-slate-200 active:scale-95'
            }`}
        >
          <svg className="w-5 h-5 text-[#002b49]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
        </button>

        <div className="flex gap-2">
          {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5) {
              if (currentPage > 3) {
                pageNum = currentPage - 2 + i;
              }
              if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              if (pageNum <= 0) pageNum = i + 1;
            }
            if (pageNum > totalPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-12 h-12 rounded-2xl font-black text-xs transition-all ${currentPage === pageNum
                  ? 'bg-[#002b49] text-white shadow-xl'
                  : 'bg-white border-2 border-slate-100 text-slate-300 hover:border-slate-300'
                  }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          className={`p-4 rounded-2xl border-2 transition-all ${currentPage === totalPages || totalPages === 0 ? 'opacity-30 cursor-not-allowed border-slate-100' : 'hover:bg-slate-50 border-slate-200 active:scale-95'
            }`}
        >
          <svg className="w-5 h-5 text-[#002b49]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
        </button>
      </div>
    </div>
  );

  const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-slate-100 scale-100 animate-in zoom-in-95 duration-200">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">{title}</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-[#002b49] hover:bg-[#003b5c] text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-[#002b49]/20"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  const QuestionModal = ({ question, onClose, onSave }: { question: Partial<Question>, onClose: () => void, onSave: (q: Question) => void }) => {
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const [formData, setFormData] = useState<Partial<Question>>({
      id: question.id || `q_${Date.now()}`,
      text: question.text || '',
      category: question.category || getActiveCategories()[0] || 'General',
      difficulty: question.difficulty || 'Easy',
      options: question.options || { A: '', B: '', C: '', D: '' },
      correctOption: question.correctOption || 'A',
      isActive: question.isActive ?? true
    });

    const existingCategories = getActiveCategories();
    const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];

    const handleInternalSave = () => {
      const finalCategory = isAddingNewCategory ? newCategoryName.trim() : formData.category;
      if (!finalCategory) {
        setError("Category is required.");
        return;
      }
      setError(null);
      onSave({ ...formData, category: finalCategory } as Question);
    };

    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
        <div className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
          <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter">{question.id ? 'Edit Record' : 'Create Record'}</h3>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Question Definition</label>
              <textarea
                value={formData.text}
                onChange={e => setFormData({ ...formData, text: e.target.value })}
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium outline-none focus:ring-4 focus:ring-indigo-100 min-h-[100px] shadow-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                  <button
                    onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    {isAddingNewCategory ? 'Back to List' : '+ Add New'}
                  </button>
                </div>
                {isAddingNewCategory ? (
                  <input
                    placeholder="Domain Name"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="w-full p-4 bg-white border border-indigo-200 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-4 focus:ring-indigo-50"
                  />
                ) : (
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none shadow-sm"
                  >
                    {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Complexity</label>
                <select
                  value={formData.difficulty}
                  onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none shadow-sm"
                >
                  {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => (
                <div key={key}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Option {key}</label>
                  <input
                    value={formData.options?.[key]}
                    onChange={e => setFormData({ ...formData, options: { ...formData.options!, [key]: e.target.value } })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none shadow-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between items-end gap-6 pt-4">
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">True Answer Key</label>
                <div className="flex gap-2">
                  {(['A', 'B', 'C', 'D'] as OptionKey[]).map(key => (
                    <button
                      key={key}
                      onClick={() => setFormData({ ...formData, correctOption: key })}
                      className={`flex-1 py-3 rounded-xl font-black transition-all ${formData.correctOption === key ? 'bg-[#002b49] text-white' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 pb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</label>
                <button
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${formData.isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-10">
            <button onClick={onClose} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Discard</button>
            <button
              onClick={handleInternalSave}
              className="flex-1 bg-[#002b49] text-[#d4af37] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#002b49]/20"
            >
              Commit Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleGenerateVerdict = async (profile: ExamResult) => {
    setGeneratingVerdict(true);
    const evaluation = evaluations.find(e => e.candidateEmail === profile.candidateEmail);
    if (!evaluation) {
      setGeneratingVerdict(false);
      return;
    }

    try {
      const verdict = await apiService.generateVerdict(profile.candidateName, profile.scorePercent, evaluation.ratings as Record<string, string>, selectedOrgId);
      if (!evaluation.id) throw new Error("Evaluation ID missing");
      const success = await apiService.saveVerdict(evaluation.id, verdict, evaluation.notes);
      if (success) {
        // Optimistically update
        setEvaluations(prev => prev.map(e => e.id === evaluation.id ? { ...e, aiVerdict: verdict } : e));
      }
    } catch (err: any) {
      console.error(err);
      setError(`Verdict generation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setGeneratingVerdict(false);
    }
  };

  const renderProfileModal = () => {
    if (!selectedProfile) return null;

    let detailedAnswers: AnswerDetail[] = [];
    try {
      detailedAnswers = JSON.parse(selectedProfile.answersJson);
    } catch (e) {
      console.error("Failed to parse answers JSON", e);
    }

    // Calculate Category Stats
    const categoryStats: Record<string, { total: number; correct: number; time: number }> = {};
    detailedAnswers.forEach(ans => {
      const question = questionsLookup[ans.questionId];
      if (question) {
        const cat = question.category || 'General'; // Fallback
        if (!categoryStats[cat]) categoryStats[cat] = { total: 0, correct: 0, time: 0 };
        categoryStats[cat].total++;
        if (ans.isCorrect) categoryStats[cat].correct++;
        categoryStats[cat].time += ans.timeSpentSec || 0;
      }
    });

    const categoryData = Object.entries(categoryStats).map(([name, stats]) => ({
      name,
      ...stats,
      percent: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
    })).sort((a, b) => b.percent - a.percent); // Sort by highest score

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
        <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <div className="bg-[#002b49] p-8 text-white flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{selectedProfile.candidateName}</h2>
              <p className="text-[#d4af37] font-bold text-xs uppercase tracking-widest mt-2">{selectedProfile.candidateEmail}</p>
            </div>
            <button onClick={() => setSelectedProfile(null)} className="text-white/50 hover:text-white font-bold uppercase text-xs border border-white/20 px-4 py-2 rounded-xl transition-colors">Close Profile</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

            {/* 1. Tech Assessment Overview (Compact Full Width) */}
            <section className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col items-center md:items-start shrink-0">
                <div className="text-[40px] font-black text-[#002b49] leading-none mb-1">{selectedProfile.scorePercent.toFixed(2)}%</div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Composite Score</p>
              </div>
              <div className="grid grid-cols-4 gap-8 w-full max-w-3xl">
                {/* Stats Grid */}
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Correct</span>
                  <span className="text-lg font-black text-green-600 leading-none">{selectedProfile.correctCount}</span>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Missed</span>
                  <span className="text-lg font-black text-red-600 leading-none">{selectedProfile.missedCount}</span>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Time</span>
                  <span className="text-sm font-black text-slate-900 leading-none">
                    {Math.floor(selectedProfile.totalTimeTakenSec / 60)}M {selectedProfile.totalTimeTakenSec % 60}S
                  </span>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Speed</span>
                  <span className="text-sm font-black text-slate-900 leading-none">{selectedProfile.avgTimePerAnsweredSec.toFixed(1)}S</span>
                </div>
              </div>
            </section>

            {/* 2. Side-by-Side: Domain Perf + Leadership Evidence */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Domain Performance */}
              <section className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm flex flex-col h-full">
                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Domain Performance</h4>
                <div className="space-y-4 flex-1">
                  {categoryData.map((cat) => (
                    <div key={cat.name}>
                      <div className="flex justify-between items-end mb-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-700">{cat.name}</span>
                          <span className="text-[8px] text-slate-400 font-medium">
                            {cat.correct}/{cat.total} • {Math.round(cat.time)}s
                          </span>
                        </div>
                        <span className="text-xs font-black text-[#002b49]">{cat.percent.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${cat.percent >= 80 ? 'bg-green-500' :
                            cat.percent >= 50 ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                          style={{ width: `${cat.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Leadership Evidence */}
              <section className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm flex flex-col h-full">
                <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Leadership Evidence</h4>
                {evaluations.find(e => e.candidateEmail === selectedProfile.candidateEmail) ? (
                  <div className="flex flex-col gap-4 flex-1">
                    {(() => {
                      const evaluation = evaluations.find(e => e.candidateEmail === selectedProfile.candidateEmail)!;
                      return (
                        <div className={`p-4 rounded-xl border-l-4 mb-2 shadow-sm ${evaluation.finalOutcome === 'Offer' ? 'bg-green-50 border-green-500 text-green-900' :
                          evaluation.finalOutcome === 'Decline' ? 'bg-red-50 border-red-500 text-red-900' :
                            'bg-amber-50 border-amber-500 text-amber-900'
                          }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Interviewer Verdict</div>
                              <div className="text-lg font-black uppercase tracking-tight">{evaluation.finalOutcome}</div>
                            </div>
                            {evaluation.finalComments && (
                              <div className="text-[10px] italic opacity-80 max-w-[60%] text-right font-medium">
                                "{evaluation.finalComments}"
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 gap-2">
                      {LEADERSHIP_STANDARDS.map(s => {
                        const evaluation = evaluations.find(e => e.candidateEmail === selectedProfile.candidateEmail)!;
                        return (
                          <div key={s.id} className="flex justify-between items-center p-3 border border-slate-50 rounded-lg bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                            <div className="flex items-center gap-2">
                              <div className="text-[9px] font-black uppercase text-[#002b49] tracking-tight">{s.title}</div>
                              {evaluation.notes?.[s.id] && (
                                <button
                                  onClick={() => setViewingComment({ title: s.title, comment: evaluation.notes[s.id] })}
                                  className="text-indigo-400 hover:text-indigo-600 transition-colors"
                                  title="View Details"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
                                </button>
                              )}
                            </div>
                            <div className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase ${getRatingColor(evaluation.ratings[s.id] as Rating)}`}>
                              {evaluation.ratings[s.id] || 'No Evidence'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-slate-300 font-black uppercase text-[9px] border-2 border-dashed border-slate-100 rounded-xl">No Interview Conducted</div>
                )}
              </section>
            </div>

            {/* AI Verdict Section - Compact */}
            <section className="bg-slate-50 border border-slate-100 rounded-[24px] p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                  <span className="text-sm">🤖</span> AI Candidate Verdict
                </h3>
                <button
                  onClick={() => selectedProfile && handleGenerateVerdict(selectedProfile)}
                  disabled={generatingVerdict || !evaluations.find(e => e.candidateEmail === selectedProfile!.candidateEmail)}
                  className="bg-[#002b49] text-white px-5 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50 hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  {generatingVerdict ? <span className="animate-spin text-lg">⟳</span> : <span>⚡</span>}
                  {generatingVerdict ? 'Analyzing...' : 'Generate Verdict'}
                </button>
              </div>

              {evaluations.find(e => e.candidateEmail === selectedProfile?.candidateEmail)?.aiVerdict ? (
                (() => {
                  const verdict = evaluations.find(e => e.candidateEmail === selectedProfile?.candidateEmail)!.aiVerdict!;
                  return (
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className={`flex-1 p-6 rounded-2xl border-2 ${verdict.decision === 'Hire' ? 'bg-green-50 border-green-200 text-green-800' :
                        verdict.decision === 'No Hire' ? 'bg-red-50 border-red-200 text-red-800' :
                          'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                        <div className="text-[10px] uppercase tracking-widest font-black opacity-60 mb-2">Recommendation</div>
                        <div className="text-3xl font-black uppercase mb-2">{verdict.decision}</div>
                        <div className="text-xs font-bold opacity-80">Confidence: {verdict.confidence}%</div>
                      </div>
                      <div className="flex-[2] bg-white p-6 rounded-2xl border border-slate-100 text-slate-600 text-sm font-medium leading-relaxed shadow-sm">
                        <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Rationale</div>
                        "{verdict.rationale}"
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8 text-slate-400 italic text-xs">
                  Click generate to analyze candidate performance and interview notes.
                </div>
              )}
            </section>

            {viewingComment && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
                <div className="bg-white max-w-md w-full p-8 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">{viewingComment.title}</h4>
                  <div className="text-slate-700 text-sm font-medium leading-relaxed mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    "{viewingComment.comment}"
                  </div>
                  <button
                    onClick={() => setViewingComment(null)}
                    className="w-full bg-[#002b49] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}


            <section>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-6 border-b pb-2">Technical Response Log</h3>
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">No.</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Question & Category</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Candidate Choice</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Correct Key</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedAnswers.map((ans, idx) => {
                      const question = questionsLookup[ans.questionId];
                      const isMissed = ans.status === 'MISSED';
                      const isOverallTimeout = ans.status === 'AUTO_MISSED_OVERALL_TIMEOUT';
                      const isCorrect = ans.isCorrect;

                      return (
                        <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${isMissed || isOverallTimeout ? 'bg-red-50/10' : ''}`}>
                          <td className="px-6 py-5 text-xs font-black text-slate-200">{idx + 1}</td>
                          <td className="px-6 py-5">
                            <div className="text-xs font-bold text-slate-900 leading-snug mb-1">{question?.text || 'Question Record Missing'}</div>
                            <div className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">{question?.category || 'General'}</div>
                          </td>
                          <td className="px-6 py-5">
                            {ans.selectedOption ? (
                              <div className="flex flex-col">
                                <span className={`text-xs font-black ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{ans.selectedOption}</span>
                                <span className="text-[8px] text-slate-400 max-w-[150px] leading-tight mt-1">{question?.options[ans.selectedOption as OptionKey] || 'Option text unavailable'}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-slate-300 uppercase italic">BLANK</span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {question ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900">{question.correctOption}</span>
                                <span className="text-[8px] text-slate-400 max-w-[150px] leading-tight mt-1">{question.options[question.correctOption as OptionKey]}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-black text-slate-200">?</span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isCorrect ? 'bg-green-100 text-green-700' :
                              isOverallTimeout ? 'bg-amber-100 text-amber-700' :
                                isMissed ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-700'
                              }`}>
                              {isCorrect ? 'Correct' : isOverallTimeout ? 'Timeout' : isMissed ? 'Missed' : 'Wrong'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-mono text-xs font-bold text-slate-400">
                            {ans.timeSpentSec}s
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div >
      </div >
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {error && (
        <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-red-500/20">!</div>
            <div>
              <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none mb-1">System Exception</h4>
              <p className="text-red-900 font-bold text-sm leading-tight">{error}</p>
            </div>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-black uppercase text-[10px] tracking-widest">Acknowledge</button>
        </div>
      )}
      {renderProfileModal()}

      {showManualModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Manual Evaluation</h3>
            <div className="space-y-4">
              <input placeholder="Full Name" id="mName" className="w-full p-4 bg-white border border-slate-100 rounded-xl outline-none shadow-sm" />
              <input placeholder="Email" id="mEmail" className="w-full p-4 bg-white border border-slate-100 rounded-xl outline-none shadow-sm" />
              <button
                onClick={() => {
                  const n = (document.getElementById('mName') as HTMLInputElement).value;
                  const e = (document.getElementById('mEmail') as HTMLInputElement).value;
                  if (n && e) onEvaluate({ candidateName: n, candidateEmail: e, organizationId: selectedOrgId });
                  setShowManualModal(false);
                }}
                className="w-full bg-[#002b49] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg"
              >Launch Toolkit</button>
            </div>
          </div>
        </div>
      )}

      {isAddingCandidate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">
              {isEditingCandidate ? 'Edit Candidate' : 'Register Candidate'}
            </h3>
            <div className="space-y-4">
              <input
                placeholder="Full Name"
                value={newCandidateData.fullName}
                onChange={e => setNewCandidateData({ ...newCandidateData, fullName: e.target.value })}
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none shadow-sm focus:ring-4 focus:ring-slate-100 transition-all font-medium"
              />
              <input
                placeholder="Email Address"
                value={newCandidateData.email}
                onChange={e => setNewCandidateData({ ...newCandidateData, email: e.target.value })}
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none shadow-sm focus:ring-4 focus:ring-slate-100 transition-all font-medium"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setIsAddingCandidate(false);
                    setIsEditingCandidate(false);
                    setEditingCandidateId(null);
                    setNewCandidateData({ email: '', fullName: '' });
                  }}
                  className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={isEditingCandidate ? handleEditCandidate : handleAddCandidate}
                  className="flex-1 bg-[#002b49] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {isEditingCandidate ? 'Update' : 'Register'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingQuestion && (
        <QuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={handleSaveQuestion}
        />
      )}

      {showAIGenerator && (
        <AIQuestionGenerator
          existingCategories={getActiveCategories()}
          onClose={() => setShowAIGenerator(false)}
          onSaveQuestions={handleAISave}
          organizationId={selectedOrgId}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          {currentUser && (
            <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1">
              Logged in: <span className="text-slate-600">{currentUser.email}</span>
            </div>
          )}
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Recruitment Hub</h1>
          <p className="text-[#002b49] font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Central Data Architecture & Quality Control</p>
          {currentUser?.role === 'super_admin' && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Context:</span>
              <select
                value={selectedOrgId || ''}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 py-1 px-3 outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Select Organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          {activeTab === 'questions' && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowAIGenerator(true)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <span className="text-lg">✨</span> AI Architect
              </button>
              <button
                onClick={() => setEditingQuestion({} as Question)}
                className="bg-[#d4af37] text-[#002b49] px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-200"
              >+ Manual Add</button>
            </div>
          )}
          <button onClick={() => {
            fetchData();
            if (activeTab === 'questions') fetchQuestions(currentPage, pageSize, filterCategory, searchQuery);
            if (activeTab === 'audit') fetchAuditLogs();
          }} className="bg-[#002b49] text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Refresh Hub</button>
          {onLogout && (
            <button onClick={onLogout} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-100 transition-all">Exit Hub</button>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-10 gap-8 overflow-x-auto no-scrollbar">
        {(['leaderboard', 'assessments', 'questions', 'config', 'candidates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === 'questions') setCurrentPage(1);
            }}
            className={`px-2 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-[#002b49] text-[#002b49]' : 'border-transparent text-slate-300 hover:text-slate-400'
              }`}
          >
            {tab === 'questions' ? '📋 Question Bank' : tab === 'assessments' ? '⭐ Evaluate' : tab === 'candidates' ? '👥 Candidates' : tab}
          </button>
        ))}

        {currentUser?.role === 'super_admin' && (['organizations', 'users', 'audit'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-[#002b49] text-[#002b49]' : 'border-transparent text-slate-300 hover:text-slate-400'
              }`}
          >
            {tab === 'organizations' ? '🏢 Organizations' : tab === 'users' ? '👥 Users' : '📊 Audit Logs'}
          </button>
        ))}
      </div>

      {loading && !syncMessage && activeTab !== 'questions' ? (
        <div className="py-32 flex flex-col items-center justify-center gap-6 text-center">
          <div className="w-14 h-14 border-4 border-slate-100 border-t-[#002b49] rounded-full animate-spin"></div>
          <p className="text-slate-300 font-black uppercase text-[11px] tracking-[0.5em] animate-pulse">Syncing Distributed Systems</p>
        </div>
      ) : (
        <div className="pb-24">
          {syncMessage && (
            <div className={`mb-8 p-6 rounded-3xl text-center font-black uppercase text-[10px] tracking-widest border-2 shadow-sm transition-all animate-bounce ${syncMessage.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' :
              syncMessage.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' :
                'bg-indigo-50 border-indigo-100 text-indigo-600'
              }`}>
              {syncMessage.text}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl flex flex-col max-h-[70vh] overflow-hidden">
              {sortedResults.length > 0 ? (
                <div className="overflow-auto flex-1 w-full">
                  <table className="w-full text-left min-w-[1000px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-10 py-5 text-[8px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                        <th className="px-10 py-5 text-[8px] font-black text-slate-400 uppercase tracking-widest">Candidate Profile</th>
                        <th className="px-10 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Test Score</th>
                        <th className="px-10 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">AI Verdict</th>
                        <th className="px-10 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Interviewer</th>
                        <th className="px-10 py-5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedResults.map((r, i) => (
                        <tr key={r.attemptId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-10 py-8 font-black text-slate-200 text-4xl italic tracking-tighter">#{i + 1}</td>
                          <td className="px-10 py-8">
                            <div className="font-black text-slate-900 text-xl tracking-tight leading-none mb-1">{r.candidateName}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.candidateEmail}</div>
                          </td>
                          <td className="px-10 py-8 text-center">
                            <span className="text-2xl font-black text-[#002b49] tracking-tighter">{r.scorePercent.toFixed(2)}%</span>
                          </td>
                          <td className="px-10 py-8 text-center">
                            {evaluations.find(e => e.candidateEmail === r.candidateEmail)?.aiVerdict ? (
                              <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${evaluations.find(e => e.candidateEmail === r.candidateEmail)?.aiVerdict?.decision === 'Hire' ? 'bg-green-50 text-green-600 border-green-100' :
                                evaluations.find(e => e.candidateEmail === r.candidateEmail)?.aiVerdict?.decision === 'No Hire' ? 'bg-red-50 text-red-600 border-red-100' :
                                  'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                {evaluations.find(e => e.candidateEmail === r.candidateEmail)?.aiVerdict?.decision}
                              </span>
                            ) : (
                              <span className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 bg-blue-50 text-blue-600 border-blue-100">TBD</span>
                            )}
                          </td>
                          <td className="px-10 py-8 text-center">
                            {evaluations.find(e => e.candidateEmail === r.candidateEmail)?.finalOutcome ? (
                              <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${evaluations.find(e => e.candidateEmail === r.candidateEmail)?.finalOutcome === 'Offer' ? 'bg-green-50 text-green-600 border-green-100' :
                                evaluations.find(e => e.candidateEmail === r.candidateEmail)?.finalOutcome === 'Decline' ? 'bg-red-50 text-red-600 border-red-100' :
                                  evaluations.find(e => e.candidateEmail === r.candidateEmail)?.finalOutcome === 'On Hold' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                    'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                {evaluations.find(e => e.candidateEmail === r.candidateEmail)?.finalOutcome}
                              </span>
                            ) : (
                              <span className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 bg-blue-50 text-blue-600 border-blue-100">TBD</span>
                            )}
                          </td>
                          <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                            <button onClick={() => setSelectedProfile(r)} className="bg-[#002b49] text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95">View Analytics</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-48 text-center bg-slate-50/30">
                  <p className="text-slate-300 font-bold uppercase text-[11px] tracking-[0.4em] mb-10">System remains unpopulated</p>
                  {!infraStatus.connected && (
                    <button onClick={() => setActiveTab('config')} className="bg-[#002b49] text-white px-12 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl">Establish Connectivity</button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'assessments' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
              <div className="bg-[#002b49] rounded-[48px] p-12 flex flex-col items-center justify-center text-center border-4 border-[#d4af37] shadow-2xl hover:scale-[1.03] transition-all min-h-[400px]">
                <div className="w-20 h-20 bg-[#d4af37] text-[#002b49] rounded-[32px] flex items-center justify-center text-4xl font-black mb-8 shadow-xl shadow-[#d4af37]/20">+</div>
                <h3 className="text-white font-black uppercase tracking-widest text-base mb-3">Direct Entry</h3>
                <p className="text-white/40 text-[9px] mb-10 font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[200px]">Manual leadership evaluation for walk-in candidates</p>
                <button
                  onClick={() => setShowManualModal(true)}
                  className="w-full bg-white text-[#002b49] py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:shadow-2xl transition-all"
                >
                  Launch manual tool
                </button>
              </div>

              {results
                .filter(r => {
                  const candidate = candidates.find(c => c.id === r.candidateId || c.email === r.candidateEmail);
                  return candidate?.status === 'Attempted';
                })
                .map(r => {
                  const isDone = evaluations.find(e => e.candidateEmail === r.candidateEmail);
                  return (
                    <div key={r.attemptId} className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-xl flex flex-col justify-between hover:shadow-2xl transition-all group">
                      <div>
                        <div className="text-[9px] font-black uppercase text-indigo-600 mb-6 flex justify-between items-center bg-indigo-50/50 px-4 py-2 rounded-full">
                          <span className="tracking-widest">CAPABILITY STATUS</span>
                          {isDone ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-black text-[8px]">EVALUATED</span>
                          ) : (
                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-black text-[8px]">PENDING</span>
                          )}
                        </div>
                        <div className="text-2xl font-black text-slate-900 mb-2 leading-none tracking-tighter group-hover:text-[#002b49] transition-colors">{r.candidateName}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8 truncate">{r.candidateEmail}</div>
                        <div className="bg-slate-50 p-6 rounded-3xl flex justify-between items-center mb-10 border border-slate-100 shadow-inner overflow-hidden">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap mr-2">Technical score</span>
                          <span className="text-lg font-black text-slate-900 tracking-tighter">{r.scorePercent.toFixed(2)}%</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onEvaluate({ candidateName: r.candidateName, candidateEmail: r.candidateEmail, organizationId: selectedOrgId, candidateId: r.candidateId })}
                        className={`w-full py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all ${isDone ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' : 'bg-[#002b49] text-[#d4af37] shadow-xl hover:bg-[#002b49]/90'
                          }`}
                      >
                        {isDone ? 'Review capability' : 'Conduct Assessment'}
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Search Query</label>
                  <input
                    placeholder="Filter by question text..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Category Filter</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => {
                      setFilterCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-slate-600 cursor-pointer"
                  >
                    <option value="">All Domains</option>
                    {getActiveCategories().map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* TOP PAGINATION & PAGE SIZE SELECTOR */}
              {!loading && questions.length > 0 && <PaginationControls />}

              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-6">
                  <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Updating View...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {questions.length > 0 ? (
                    <>
                      {questions.map(q => (
                        <div key={q.id} className={`bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl flex flex-col gap-6 hover:shadow-2xl transition-all ${!q.isActive ? 'opacity-40' : ''}`}>
                          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-3 mb-3">
                                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-indigo-100">{q.category}</span>
                                <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-slate-100">{q.difficulty}</span>
                                {!q.isActive && <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-red-100">Hidden from bank</span>}
                              </div>
                              <p className="text-sm font-bold text-slate-900 leading-relaxed tracking-tight mb-6">{q.text}</p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => {
                                  const isCorrect = q.correctOption === key;
                                  return (
                                    <div
                                      key={key}
                                      className={`flex items-center p-3 rounded-2xl border-2 transition-all ${isCorrect
                                        ? 'bg-green-50 border-green-200 text-green-900 shadow-sm'
                                        : 'bg-white border-slate-50 text-slate-500'
                                        }`}
                                    >
                                      <div className={`w-6 h-6 flex items-center justify-center rounded-lg font-black text-[10px] mr-3 shrink-0 shadow-sm ${isCorrect ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {key}
                                      </div>
                                      <span className="text-[10px] font-semibold leading-snug">{q.options[key]}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex lg:flex-col gap-2 shrink-0 pt-1">
                              <button
                                onClick={() => setEditingQuestion(q)}
                                className="px-6 py-2 bg-[#002b49] text-[#d4af37] rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                              >Update</button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="px-6 py-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                              >Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* BOTTOM PAGINATION */}
                      <PaginationControls />
                    </>
                  ) : (
                    <div className="py-32 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-100 shadow-inner">
                      <p className="text-slate-300 font-black uppercase text-[11px] tracking-[0.5em] mb-4">No matching questions found</p>
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Use AI Architect or Manual Add to create question bank</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Registered Candidates</h3>
                <button
                  onClick={() => setIsAddingCandidate(true)}
                  className="bg-[#002b49] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all"
                >
                  + Register Candidate
                </button>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 text-[8px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                      <th className="px-8 py-5 text-[8px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                      <th className="px-8 py-5 text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-[8px] font-black text-slate-400 uppercase tracking-widest">Added</th>
                      <th className="px-8 py-5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {candidates.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 font-bold text-sm text-slate-700">{c.fullName}</td>
                        <td className="px-8 py-5 font-medium text-xs text-slate-500">{c.email}</td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wide border ${c.status === 'Opted Out' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            (c.status === 'Registered' || c.status === 'Re-registered') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              'bg-green-50 text-green-700 border-green-100'
                            }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-[10px] text-slate-400">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              const result = results.find(r => r.candidateEmail === c.email);
                              if (result) setSelectedProfile(result);
                            }}
                            disabled={c.status !== 'Attempted'}
                            className={`p-2 rounded-lg transition-colors ${c.status === 'Attempted' ? 'text-[#002b49] hover:text-slate-800 hover:bg-slate-50' : 'text-slate-200 cursor-not-allowed'}`}
                            title={c.status === 'Attempted' ? "View Analytics" : "Candidate has not attempted exam"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                          </button>
                          <button
                            onClick={() => onEvaluate({ candidateName: c.fullName, candidateEmail: c.email, organizationId: selectedOrgId, candidateId: c.id })}
                            disabled={c.status !== 'Attempted'}
                            className={`p-2 rounded-lg transition-colors ${c.status === 'Attempted' ? 'text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50' : 'text-slate-200 cursor-not-allowed'}`}
                            title={c.status === 'Attempted' ? "Evaluate Candidate" : "Candidate has not attempted exam"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                          </button>
                          <button
                            onClick={() => {
                              setNewCandidateData({ email: c.email, fullName: c.fullName });
                              setEditingCandidateId(c.id);
                              setIsEditingCandidate(true);
                              setIsAddingCandidate(true);
                            }}
                            className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Candidate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleResetCandidate(c.id)}
                            className="p-2 text-slate-400 hover:text-[#002b49] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Reset Candidate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(c.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove Candidate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {candidates.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-24 text-center text-slate-300">
                          <div className="flex flex-col items-center gap-3">
                            <span className="text-2xl">👥</span>
                            <span className="font-bold uppercase text-xs tracking-widest">No candidates found</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'organizations' && (
            <div className="grid grid-cols-1 gap-10">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-3xl font-black text-[#002b49] uppercase tracking-tighter mb-2 leading-none">Organization Registry</h3>
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.3em]">Manage partner entities and administrators</p>
                </div>
                <button onClick={() => {
                  setNewOrgData({ id: '', name: '', adminName: '', adminEmail: '', aiLimit: 0 });
                  setIsAddingOrg(true);
                  setIsEditingOrg(false);
                }} className="bg-[#002b49] text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                  + Add Entity
                </button>
              </div>

              {isAddingOrg && (
                <div className="bg-indigo-50 p-8 rounded-[32px] border-2 border-indigo-100 shadow-lg animate-in fade-in slide-in-from-top-4">
                  <h4 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-6">{isEditingOrg ? 'Edit Organization Profile' : 'New Organization Profile'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Organization Name</label>
                      <input
                        value={newOrgData.name}
                        onChange={e => setNewOrgData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Acme Corp"
                        className={`w-full p-4 bg-white border border-indigo-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 ${isEditingOrg ? 'opacity-60 cursor-not-allowed' : ''}`}
                        disabled={isEditingOrg}
                      />
                      <p className="text-[8px] text-indigo-400 mt-2 font-bold px-1">* Saved as lowercase</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Admin Name</label>
                      <input
                        value={newOrgData.adminName}
                        onChange={e => setNewOrgData(prev => ({ ...prev, adminName: e.target.value }))}
                        placeholder="Full Name"
                        className="w-full p-4 bg-white border border-indigo-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Admin Email</label>
                      <input
                        value={newOrgData.adminEmail}
                        onChange={e => setNewOrgData(prev => ({ ...prev, adminEmail: e.target.value }))}
                        placeholder="admin@company.com"
                        type="email"
                        className="w-full p-4 bg-white border border-indigo-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                    {currentUser?.role === 'super_admin' && (
                      <div>
                        <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Free AI Requests</label>
                        <input
                          type="number"
                          value={newOrgData.aiLimit}
                          onChange={e => setNewOrgData(prev => ({ ...prev, aiLimit: parseInt(e.target.value) || 0 }))}
                          placeholder="e.g. 100"
                          className="w-full p-4 bg-white border border-indigo-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-4">
                    <button onClick={() => { setIsAddingOrg(false); setIsEditingOrg(false); }} className="px-8 py-3 text-indigo-400 font-black uppercase text-[10px] tracking-widest hover:text-indigo-600 transition-colors">Cancel</button>
                    <button onClick={isEditingOrg ? handleEditOrganization : handleAddOrganization} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-indigo-700 transition-all">
                      {isEditingOrg ? 'Update Profile' : 'Create Profile'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map(org => (
                  <div key={org.id} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center text-lg font-black uppercase group-hover:bg-[#002b49] group-hover:text-[#d4af37] transition-colors duration-500">
                          {org.name.substring(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 capitalize mb-1">{org.name}</h4>
                          <span className="bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border border-slate-100">{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setNewOrgData({ id: org.id, name: org.name, adminName: org.adminName, adminEmail: org.adminEmail, aiLimit: org.aiLimit });
                            setIsEditingOrg(true);
                            setIsAddingOrg(true);
                          }}
                          className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button
                          onClick={() => handleDeleteOrganization(org.id)}
                          className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Free AI Balance</span>
                        <span className="text-sm font-black text-[#002b49]">{org.aiLimit} Requests</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-[10px] font-black">
                          {org.adminName.substring(0, 1)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">{org.adminName}</p>
                          <p className="text-[9px] font-medium text-slate-400">{org.adminEmail}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {organizations.length === 0 && !isAddingOrg && (
                  <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                    <p className="text-slate-300 font-black uppercase text-[11px] tracking-[0.4em]">No organizations registered</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 gap-10">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-3xl font-black text-[#002b49] uppercase tracking-tighter mb-2 leading-none">User Management</h3>
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.3em]">Manage access and roles</p>
                </div>
                <button onClick={() => {
                  setNewUserData({ id: '', email: '', fullName: '', role: 'admin' });
                  setIsAddingUser(true);
                  setIsEditingUser(false);
                }} className="bg-[#002b49] text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                  + Add User
                </button>
              </div>

              {isAddingUser && (
                <div className="bg-indigo-50 p-8 rounded-[32px] border-2 border-indigo-100 shadow-lg animate-in fade-in slide-in-from-top-4">
                  <h4 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest mb-6">{isEditingUser ? 'Edit User' : 'New User'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Full Name</label>
                      <input
                        value={newUserData.fullName}
                        onChange={e => setNewUserData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="John Doe"
                        className="w-full p-4 bg-white border border-indigo-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Email Address</label>
                      <input
                        value={newUserData.email}
                        onChange={e => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                        type="email"
                        className="w-full p-4 bg-white border border-indigo-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 block">Role</label>
                      <select
                        value={newUserData.role}
                        onChange={e => setNewUserData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                        className="w-full p-4 bg-white border border-indigo-200 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 appearance-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4">
                    <button onClick={() => { setIsAddingUser(false); setIsEditingUser(false); }} className="px-8 py-3 text-indigo-400 font-black uppercase text-[10px] tracking-widest hover:text-indigo-600 transition-colors">Cancel</button>
                    <button onClick={isEditingUser ? handleEditUser : handleAddUser} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-indigo-700 transition-all">
                      {isEditingUser ? 'Update User' : 'Create User'}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-6 text-[8px] font-black uppercase text-slate-400 tracking-widest">Name</th>
                      <th className="p-6 text-[8px] font-black uppercase text-slate-400 tracking-widest">Email</th>
                      <th className="p-6 text-[8px] font-black uppercase text-slate-400 tracking-widest">Role</th>
                      <th className="p-6 text-[8px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                      <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="p-6 font-bold text-sm text-slate-700">{user.fullName}</td>
                        <td className="p-6 font-medium text-xs text-slate-500">{user.email}</td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${user.role === 'super_admin'
                            ? 'bg-purple-50 text-purple-600 border-purple-100'
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setNewUserData({ id: user.id, email: user.email, fullName: user.fullName, role: user.role });
                                setIsEditingUser(true);
                                setIsAddingUser(true);
                              }}
                              className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Delete">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !isAddingUser && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-slate-300 font-black uppercase text-[11px] tracking-[0.4em]">No users found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="grid lg:grid-cols-1 gap-12">
              <div className="bg-white rounded-[48px] p-12 border border-slate-100 shadow-2xl">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <h3 className="text-3xl font-black text-[#002b49] uppercase tracking-tighter mb-2 leading-none">Assessment Strategy</h3>
                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.3em]">Configure exam structure and timers</p>
                  </div>
                  <button onClick={handleUpdateSettings} className="bg-[#d4af37] text-[#002b49] px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#d4af37]/10 hover:scale-[1.02] active:scale-95 transition-all">Sync to Cloud</button>
                </div>

                <div className="space-y-12">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">TOTAL QUESTIONS</label>
                      <input
                        type="number"
                        value={assessmentSettings.totalQuestions}
                        onChange={e => setAssessmentSettings(prev => ({ ...prev, totalQuestions: Number(e.target.value) }))}
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner text-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">OVERALL SESSION (MINS)</label>
                      <input
                        type="number"
                        value={assessmentSettings.overallTimeLimitMins}
                        onChange={e => setAssessmentSettings(prev => ({ ...prev, overallTimeLimitMins: Number(e.target.value) }))}
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner text-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">PER QUESTION (SECS)</label>
                      <input
                        type="number"
                        value={assessmentSettings.questionTimeLimitSecs}
                        onChange={e => setAssessmentSettings(prev => ({ ...prev, questionTimeLimitSecs: Number(e.target.value) }))}
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] font-black text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner text-xl"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-10">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h4 className="text-xl font-black text-[#002b49] uppercase tracking-tighter">Question Section Distribution</h4>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">Define how many questions from each category are picked for a session</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {getActiveCategories().map(category => (
                        <div key={category} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner group relative">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block truncate" title={category}>{category}</label>
                          <input
                            type="number"
                            value={assessmentSettings.questionsPerSection[category] || 0}
                            onChange={e => handleSectionConfigChange(category, Number(e.target.value))}
                            className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-indigo-400 shadow-sm transition-all"
                          />
                        </div>
                      ))}

                      {isAddingSection ? (
                        <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-200 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2 block">NEW SECTION NAME</label>
                          <input
                            autoFocus
                            placeholder="e.g. Data Modeling"
                            value={newSectionName}
                            onChange={e => setNewSectionName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddNewSection()}
                            className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl font-black text-slate-900 outline-none focus:border-indigo-400 mb-3"
                          />
                          <div className="flex gap-2">
                            <button onClick={handleAddNewSection} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Add</button>
                            <button onClick={() => { setIsAddingSection(false); setNewSectionName(''); }} className="flex-1 bg-white text-indigo-400 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-100">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsAddingSection(true)}
                          className="bg-white border-4 border-dashed border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 hover:border-[#d4af37] hover:bg-slate-50 transition-all text-slate-300 hover:text-[#d4af37]"
                        >
                          <span className="text-2xl font-black">+</span>
                          <span className="text-[10px] font-black uppercase tracking-widest">Add Section</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-8 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                      <div className="flex justify-between items-center font-black uppercase text-[10px] tracking-widest text-indigo-700">
                        <span>Total Configured Pick:</span>
                        <span className={`text-xl tracking-tighter ${Object.values(assessmentSettings.questionsPerSection).reduce((a: number, b: number) => a + b, 0) !== assessmentSettings.totalQuestions ? 'text-amber-600' : 'text-green-600'}`}>
                          {Object.values(assessmentSettings.questionsPerSection).reduce((a: number, b: number) => a + b, 0)} / {assessmentSettings.totalQuestions}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentUser?.role === 'super_admin' && activeTab === 'config' && (
            <div className="bg-[#002b49] rounded-[48px] p-12 shadow-2xl border border-white/5 mt-10">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 leading-none">Infrastructure</h3>
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.3em] mb-12">Cloud synchronization & health</p>

              <div className="space-y-6">
                <div className="flex justify-between items-center p-6 bg-white/5 border border-white/10 rounded-3xl">
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Global connection</span>
                  <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${infraStatus.connected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {infraStatus.connected ? 'ONLINE' : 'DISCONNECTED'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {['questions', 'results', 'evaluations', 'settings', 'sections', 'organizations', 'users'].map(table => (
                    <div key={table} className="flex justify-between items-center p-6 bg-white rounded-3xl shadow-lg border-b-4 border-slate-100">
                      <span className="text-[11px] font-black uppercase text-slate-800 tracking-widest">{table} collection</span>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${infraStatus.tables[table] ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {infraStatus.tables[table] ? 'VERIFIED' : 'NOT FOUND'}
                      </span>
                    </div>
                  ))}
                </div>

                {!Object.values(infraStatus.tables).every(v => v) && (
                  <div className="mt-8 pt-10 border-t border-white/5">
                    <p className="text-[11px] text-amber-400 font-black uppercase tracking-widest mb-6 text-center">Protocol deviation detected: Table schema required.</p>
                    <p className="text-[9px] text-white/40 font-bold uppercase mb-6 text-center">If "settings" or other tables are "NOT FOUND", please execute the SQL script in your Supabase SQL Editor.</p>
                    <button
                      onClick={() => {
                        const sql = `
-- Disable Row Level Security (RLS)
ALTER TABLE sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- MIGRATION: Multi-tenancy Support
INSERT INTO organizations (id, name, admin_name, admin_email)
VALUES ('a956050a-8eb5-44e0-8725-24269181038c', 'Default Organization', 'System Admin', 'admin@default.com')
ON CONFLICT (id) DO NOTHING;

-- Create Tables with organization_id support
CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, admin_name TEXT, admin_email TEXT, created_by TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE IF NOT EXISTS sections (name TEXT, organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c', is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (name, organization_id));

CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, section_name TEXT NOT NULL, organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c', difficulty TEXT NOT NULL, text TEXT NOT NULL, options JSONB NOT NULL, correct_option CHAR(1) NOT NULL, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), FOREIGN KEY (section_name, organization_id) REFERENCES sections(name, organization_id) ON UPDATE CASCADE);

CREATE TABLE IF NOT EXISTS results (id TEXT PRIMARY KEY, organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c', candidate_name TEXT NOT NULL, candidate_email TEXT NOT NULL, started_at TIMESTAMPTZ NOT NULL, submitted_at TIMESTAMPTZ NOT NULL, total_time_taken_sec INTEGER NOT NULL, total_questions INTEGER NOT NULL, attempted_count INTEGER NOT NULL, missed_count INTEGER NOT NULL, correct_count INTEGER NOT NULL, wrong_count INTEGER NOT NULL, avg_time_per_answered_sec DECIMAL NOT NULL, score_percent DECIMAL NOT NULL, answers_json JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE IF NOT EXISTS evaluations (id TEXT PRIMARY KEY, organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c', candidate_email TEXT NOT NULL, interviewer_name TEXT NOT NULL, level TEXT NOT NULL, ratings JSONB NOT NULL, notes JSONB NOT NULL, final_outcome TEXT NOT NULL, final_comments TEXT, submitted_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE IF NOT EXISTS settings (key TEXT, organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c', value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (key, organization_id));

CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(), organization_id TEXT REFERENCES organizations(id) DEFAULT 'a956050a-8eb5-44e0-8725-24269181038c', email TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL, role TEXT CHECK (role IN ('super_admin', 'admin')) NOT NULL, created_at TIMESTAMPTZ DEFAULT now());

-- Migration for existing tables (Idempotent)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'organization_id') THEN ALTER TABLE users ADD COLUMN organization_id TEXT REFERENCES organizations(id); UPDATE users SET organization_id = 'a956050a-8eb5-44e0-8725-24269181038c' WHERE organization_id IS NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sections' AND column_name = 'organization_id') THEN ALTER TABLE sections ADD COLUMN organization_id TEXT REFERENCES organizations(id); UPDATE sections SET organization_id = 'a956050a-8eb5-44e0-8725-24269181038c' WHERE organization_id IS NULL; ALTER TABLE sections DROP CONSTRAINT sections_pkey CASCADE; ALTER TABLE sections ADD PRIMARY KEY (name, organization_id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'organization_id') THEN ALTER TABLE questions ADD COLUMN organization_id TEXT REFERENCES organizations(id); UPDATE questions SET organization_id = 'a956050a-8eb5-44e0-8725-24269181038c' WHERE organization_id IS NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'results' AND column_name = 'organization_id') THEN ALTER TABLE results ADD COLUMN organization_id TEXT REFERENCES organizations(id); UPDATE results SET organization_id = 'a956050a-8eb5-44e0-8725-24269181038c' WHERE organization_id IS NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'organization_id') THEN ALTER TABLE evaluations ADD COLUMN organization_id TEXT REFERENCES organizations(id); UPDATE evaluations SET organization_id = 'a956050a-8eb5-44e0-8725-24269181038c' WHERE organization_id IS NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'organization_id') THEN ALTER TABLE settings ADD COLUMN organization_id TEXT REFERENCES organizations(id); UPDATE settings SET organization_id = 'a956050a-8eb5-44e0-8725-24269181038c' WHERE organization_id IS NULL; ALTER TABLE settings DROP CONSTRAINT settings_pkey CASCADE; ALTER TABLE settings ADD PRIMARY KEY (key, organization_id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_admin_email_key') THEN ALTER TABLE organizations ADD CONSTRAINT organizations_admin_email_key UNIQUE (admin_email); END IF; END $$;
`;
                        navigator.clipboard.writeText(sql);
                        setSyncMessage({ text: "Database Schema captured to clipboard.", type: 'success' });
                      }}
                      className="w-full bg-[#d4af37] text-[#002b49] py-5 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-amber-400 transition-all"
                    >
                      Copy SQL Initialization Script
                    </button>
                  </div>
                )}

                <button onClick={() => runDiagnostics()} className="w-full text-white/20 hover:text-white font-black uppercase text-[9px] tracking-[0.4em] transition-all mt-6 text-center underline">RE-RUN INFRASTRUCTURE DIAGNOSTICS</button>
              </div>
            </div>
          )}

          {/* AUDIT LOGS TAB */}
          {activeTab === 'audit' && currentUser?.role === 'super_admin' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-[40px] p-10 shadow-xl border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Audit Trail</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Complete activity log with IP tracking</p>
                  </div>
                  <button
                    onClick={handleExportAuditLogs}
                    className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                  >
                    📊 Export CSV
                  </button>
                </div>

                {/* Filters */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Event Type</label>
                    <select
                      value={auditFilters.eventType}
                      onChange={e => { setAuditFilters({ ...auditFilters, eventType: e.target.value as any }); fetchAuditLogs(); }}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold"
                    >
                      <option value="">All Events</option>
                      <option value="login">Login</option>
                      <option value="logout">Logout</option>
                      <option value="create">Create</option>
                      <option value="update">Update</option>
                      <option value="delete">Delete</option>
                      <option value="reset">Reset</option>
                      <option value="exam_submit">Exam Submit</option>
                      <option value="eval_submit">Eval Submit</option>
                      <option value="ai_verdict_generate">AI Verdict</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Entity Type</label>
                    <select
                      value={auditFilters.entityType}
                      onChange={e => { setAuditFilters({ ...auditFilters, entityType: e.target.value as any }); fetchAuditLogs(); }}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold"
                    >
                      <option value="">All Entities</option>
                      <option value="candidate">Candidate</option>
                      <option value="question">Question</option>
                      <option value="result">Result</option>
                      <option value="evaluation">Evaluation</option>
                      <option value="user">User</option>
                      <option value="organization">Organization</option>
                      <option value="settings">Settings</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">User Email</label>
                    <input
                      type="text"
                      value={auditFilters.userEmail}
                      onChange={e => setAuditFilters({ ...auditFilters, userEmail: e.target.value })}
                      onBlur={fetchAuditLogs}
                      placeholder="Filter by user..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Limit</label>
                    <select
                      value={auditFilters.limit}
                      onChange={e => { setAuditFilters({ ...auditFilters, limit: Number(e.target.value) }); fetchAuditLogs(); }}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold"
                    >
                      <option value={50}>50 logs</option>
                      <option value={100}>100 logs</option>
                      <option value={250}>250 logs</option>
                      <option value={500}>500 logs</option>
                    </select>
                  </div>
                </div>

                {/* Audit Log Table */}
                <div className="overflow-x-auto rounded-3xl border border-slate-200">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                        <th className="text-left p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Event</th>
                        <th className="text-left p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">User</th>
                        <th className="text-left p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Entity</th>
                        <th className="text-left p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">IP Address</th>
                        <th className="text-left p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Device</th>
                        <th className="text-center p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center p-12 text-slate-400 text-sm font-medium">
                            No audit logs found. Events will appear here as users interact with the system.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map(log => {
                          const deviceInfo = log.deviceInfo ? JSON.parse(log.deviceInfo || '{}') : {};
                          const getEventColor = (eventType: string) => {
                            switch (eventType) {
                              case 'login': return 'bg-blue-50 text-blue-700 border-blue-200';
                              case 'logout': return 'bg-slate-50 text-slate-600 border-slate-200';
                              case 'create': return 'bg-green-50 text-green-700 border-green-200';
                              case 'update': return 'bg-amber-50 text-amber-700 border-amber-200';
                              case 'delete': return 'bg-red-50 text-red-700 border-red-200';
                              case 'reset': return 'bg-purple-50 text-purple-700 border-purple-200';
                              case 'exam_submit': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
                              case 'eval_submit': return 'bg-pink-50 text-pink-700 border-pink-200';
                              case 'ai_verdict_generate': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
                              default: return 'bg-slate-50 text-slate-600 border-slate-200';
                            }
                          };

                          return (
                            <React.Fragment key={log.id}>
                              <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                                <td className="p-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="p-4">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getEventColor(log.eventType)}`}>
                                    {log.eventType}
                                  </span>
                                </td>
                                <td className="p-4 text-xs font-medium text-slate-700 max-w-[200px] truncate" title={log.userEmail || 'N/A'}>
                                  {log.userEmail || 'System'}
                                </td>
                                <td className="p-4">
                                  {log.entityType && (
                                    <div className="text-xs">
                                      <div className="font-bold text-slate-900">{log.entityType}</div>
                                      {log.entityId && <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]" title={log.entityId}>{log.entityId}</div>}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 text-xs font-mono text-slate-600">
                                  {log.ipAddress || 'N/A'}
                                </td>
                                <td className="p-4">
                                  {deviceInfo.browser && (
                                    <div className="text-xs">
                                      <div className="font-bold text-slate-900 flex items-center gap-1">
                                        {deviceInfo.deviceType === 'desktop' && '🖥️'}
                                        {deviceInfo.deviceType === 'mobile' && '📱'}
                                        {deviceInfo.deviceType === 'tablet' && '📱'}
                                        {deviceInfo.browser}
                                      </div>
                                      <div className="text-[10px] text-slate-400">{deviceInfo.os}</div>
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 text-center">
                                  {log.actionDetails && (
                                    <button
                                      onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-wider transition-all"
                                    >
                                      {expandedLogId === log.id ? 'Hide' : 'View'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {expandedLogId === log.id && log.actionDetails && (
                                <tr>
                                  <td colSpan={7} className="p-6 bg-slate-50 border-b border-slate-200">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Action Details</p>
                                      <pre className="text-xs font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(JSON.parse(log.actionDetails), null, 2)}</pre>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 text-center text-xs text-slate-400 font-medium">
                  Showing {auditLogs.length} audit log entries
                </div>
              </div>
            </div>
          )}

        </div>
      )}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        onConfirm={confirmation.onConfirm}
        onCancel={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
      />
    </div >
  );
};
