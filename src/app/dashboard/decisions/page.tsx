'use client';

import React, { useState, useEffect } from 'react';
import { 
  GitMerge, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  AlertCircle, 
  Clock, 
  Calendar,
  ArrowRight,
  MessageSquare,
  Loader2,
  FileText,
  BookOpen,
  Sparkles,
  Activity,
  CheckSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LessonsVault } from './LessonsVault';

interface ProgressLog {
  id: string;
  decisionId: string;
  note: string;
  createdAt: number;
}

interface DecisionRecord {
  id: string;
  thoughtId: string;
  title: string;
  expectedOutcomeDate: number;
  successMetric: string;
  status: 'pending' | 'success' | 'failed' | 'trash';
  outcomeNotes: string | null;
  reviewedAt: number | null;
  evolutionInsight: string | null;
  finalSynthesis: string | null;
  createdAt: number;
  thoughtContent: string;
  thoughtSummary: string;
  logs: ProgressLog[];
}

export default function DecisionLedgerPage() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Retroactive Outcome logging states (inline inside lists)
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [outcomeStatus, setOutcomeStatus] = useState<'success' | 'failed' | 'trash'>('success');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab switching: 'ledger' | 'lessons'
  const [activeTab, setActiveTab] = useState<'ledger' | 'lessons'>('ledger');
  // Ledger sub-tabs: 'active' | 'historical'
  const [ledgerTab, setLedgerTab] = useState<'active' | 'historical'>('active');

  // Filter & Sorting state variables
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCreatedDate, setFilterCreatedDate] = useState<string>('all');
  const [filterTargetDate, setFilterTargetDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Progress update logging states
  const [progressNoteText, setProgressNoteText] = useState<{ [decisionId: string]: string }>({});
  const [isSubmittingProgress, setIsSubmittingProgress] = useState<{ [decisionId: string]: boolean }>({});
  const [expandedProgressId, setExpandedProgressId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Manual Decision creation states
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [manualMetric, setManualMetric] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  
  // Thoughts list for mapping manual decisions
  const [thoughtsList, setThoughtsList] = useState<any[]>([]);
  const [selectedThoughtId, setSelectedThoughtId] = useState<string>('');

  const handleCreateManualDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedThoughtId || selectedThoughtId === '' || !manualContent.trim() || !manualMetric.trim() || !manualDate) {
      alert('Please fill out all fields. Every decision must be linked to a thought.');
      return;
    }

    setIsCreatingManual(true);
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thoughtId: selectedThoughtId,
          title: manualContent.trim(),
          successMetric: manualMetric.trim(),
          expectedOutcomeDate: new Date(manualDate).getTime(),
        }),
      });

      if (res.ok) {
        await fetchDecisions();
        // Reset states
        setManualContent('');
        setManualMetric('');
        setManualDate('');
        // Keep selectedThoughtId pointing to first item or reset to first
        if (thoughtsList.length > 0) {
          setSelectedThoughtId(thoughtsList[0].id);
          setManualContent(thoughtsList[0].content || '');
        } else {
          setSelectedThoughtId('');
        }
        setShowManualForm(false);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to create decision.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating decision.');
    } finally {
      setIsCreatingManual(false);
    }
  };

  const fetchThoughts = async () => {
    try {
      const res = await fetch('/api/thoughts');
      if (res.ok) {
        const data = await res.json();
        const thoughts = data.thoughts || [];
        setThoughtsList(thoughts);
        if (thoughts.length > 0) {
          setSelectedThoughtId(thoughts[0].id);
          setManualContent(thoughts[0].content || '');
        }
      }
    } catch (err) {
      console.error('Error fetching thoughts for dropdown selector:', err);
    }
  };

  const fetchDecisions = async () => {
    try {
      const res = await fetch('/api/decisions');
      if (res.ok) {
        const data = await res.json();
        setDecisions(data.decisions || []);
      } else {
        setError('Failed to fetch decisions history.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Could not retrieve decisions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
    fetchThoughts();
  }, []);

  const handleStartReview = (record: DecisionRecord) => {
    setReviewingId(record.id);
    setOutcomeStatus('success');
    setOutcomeNotes('');
  };

  const handleCancelReview = () => {
    setReviewingId(null);
  };

  const handleSaveReview = async (recordId: string) => {
    if (!outcomeNotes.trim()) {
      alert('Please write outcome notes.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/decisions/${recordId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: outcomeStatus,
          outcomeNotes: outcomeNotes.trim()
        })
      });

      if (res.ok) {
        // Reload decisions list
        await fetchDecisions();
        setReviewingId(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to record outcome.');
      }
    } catch (err) {
      console.error('Error reviewing decision:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProgress = async (recordId: string) => {
    const note = progressNoteText[recordId] || '';
    if (!note.trim()) {
      alert('Please write progress notes.');
      return;
    }

    setIsSubmittingProgress((prev) => ({ ...prev, [recordId]: true }));
    try {
      const res = await fetch(`/api/decisions/${recordId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      });

      if (res.ok) {
        // Reload decisions list
        await fetchDecisions();
        setProgressNoteText((prev) => ({ ...prev, [recordId]: '' }));
        setExpandedProgressId(null);
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to log progress.');
      }
    } catch (err) {
      console.error('Error logging decision progress:', err);
    } finally {
      setIsSubmittingProgress((prev) => ({ ...prev, [recordId]: false }));
    }
  };

  // Stats computation
  const totalDecisions = decisions.length;
  const pendingDecisions = decisions.filter((d) => d.status === 'pending');
  const activeDecisions = pendingDecisions.filter((d) => Date.now() <= d.expectedOutcomeDate);
  const overdueDecisions = pendingDecisions.filter((d) => Date.now() > d.expectedOutcomeDate);
  const completedDecisions = decisions.filter((d) => d.status !== 'pending');
  
  const successCount = completedDecisions.filter((d) => d.status === 'success').length;
  const failedCount = completedDecisions.filter((d) => d.status === 'failed').length;
  const trashCount = completedDecisions.filter((d) => d.status === 'trash').length;

  const resolvedCount = successCount + failedCount;
  const successRate = resolvedCount > 0 ? Math.round((successCount / resolvedCount) * 100) : 0;

  // Extract unique created dates for exact-day filtering
  const uniqueCreatedDates = Array.from(
    new Set(
      decisions.map((d) => new Date(d.createdAt).toISOString().split('T')[0])
    )
  ).sort((a, b) => b.localeCompare(a));

  // Helper to filter and sort arrays
  const getFilteredAndSortedDecisions = (list: DecisionRecord[]) => {
    let result = [...list];

    // Filter by Status (mostly relevant for completed historical ledger)
    if (filterStatus !== 'all') {
      result = result.filter((d) => d.status === filterStatus);
    }

    // Filter by Created Date (Exact Day)
    if (filterCreatedDate !== 'all') {
      result = result.filter((d) => {
        const dDate = new Date(d.createdAt).toISOString().split('T')[0];
        return dDate === filterCreatedDate;
      });
    }

    // Filter by Target date (deadlines on or before chosen input date)
    if (filterTargetDate) {
      const filterTargetTimestamp = new Date(filterTargetDate).getTime();
      result = result.filter((d) => d.expectedOutcomeDate <= filterTargetTimestamp);
    }

    // Apply Sorting order
    result.sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.createdAt - a.createdAt;
      } else {
        return a.createdAt - b.createdAt;
      }
    });

    return result;
  };

  const displayPendingDecisions = getFilteredAndSortedDecisions(pendingDecisions);
  const displayCompletedDecisions = getFilteredAndSortedDecisions(completedDecisions);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/10">
              <GitMerge className="w-5.5 h-5.5" />
            </div>
            Decision Ledger
          </h1>
          <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed max-w-xl">
            Track key decisions, catalog expected metrics, and review retrospectively to build cognitive self-awareness and decision success rates.
          </p>
        </div>

        {/* Tab Switcher & Log Action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex bg-zinc-950/60 p-1.5 rounded-xl border border-zinc-900">
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ledger'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" /> Decision Ledger
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lessons')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'lessons'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Lessons Vault
            </button>
          </div>

          {activeTab === 'ledger' && (
            <button
              type="button"
              onClick={() => setShowManualForm(!showManualForm)}
              className="text-xs px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/10 flex items-center gap-1.5"
            >
              Log New Decision
            </button>
          )}
        </div>
      </div>

      {error && activeTab === 'ledger' && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Manual Decision Form */}
      {showManualForm && activeTab === 'ledger' && (
        <div className="glass-panel border border-zinc-900/60 p-6 rounded-2xl relative overflow-hidden bg-zinc-950/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-2xl rounded-full" />
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            🎯 Log a Decision Tracker Manually
          </h2>
          <form onSubmit={handleCreateManualDecision} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">
                    Link to which Thought? (Required context)
                  </label>
                  <select
                    value={selectedThoughtId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedThoughtId(id);
                      const th = thoughtsList.find((t) => t.id === id);
                      setManualContent(th?.content || '');
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="" disabled>-- Select a parent thought --</option>
                    {thoughtsList.map((t) => (
                      <option key={t.id} value={t.id}>
                        💭 {t.content.length > 55 ? `${t.content.slice(0, 55)}...` : t.content}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">
                    Decision Context / Note
                  </label>
                  <textarea
                    placeholder="Explain what choice or commitment you are making..."
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    rows={2}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">
                    Success Metric (How will you evaluate success?)
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Production build bundle drops by 20%..."
                    value={manualMetric}
                    onChange={(e) => setManualMetric(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1.5 flex justify-between items-center">
                    <span>Expected Outcome Date</span>
                    <span className="text-[9px] text-zinc-500 font-normal normal-case">Or choose timeline preset</span>
                  </label>
                  
                  {/* Preset Buttons */}
                  <div className="flex gap-2 mb-2">
                    {[
                      { label: '7 Days', days: 7 },
                      { label: '30 Days', days: 30 },
                      { label: '90 Days', days: 90 },
                    ].map((preset) => {
                      // Calculate if current manualDate matches this preset
                      const targetDate = new Date();
                      targetDate.setDate(targetDate.getDate() + preset.days);
                      const isSelected = manualDate === targetDate.toISOString().split('T')[0];
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + preset.days);
                            setManualDate(d.toISOString().split('T')[0]);
                          }}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                              : 'bg-zinc-950 border-zinc-900 text-zinc-505 hover:text-zinc-300'
                          }`}
                        >
                          +{preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      onClick={(e) => {
                        try {
                          // Force browser native calendar picker overlay to display
                          (e.target as any).showPicker();
                        } catch (err) {
                          // Fallback for older browsers
                        }
                      }}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent select-none cursor-pointer"
                    />
                    <Calendar className="w-4 h-4 text-zinc-550 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="text-xs px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingManual}
                className="text-xs px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                {isCreatingManual && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Log Decision
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lessons Vault Tab */}
      {activeTab === 'lessons' && <LessonsVault />}

      {/* Decision Ledger Tab */}
      {activeTab === 'ledger' && (
        loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-xs">Loading ledger analytics...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Success Rate */}
            <div className="glass-panel border border-zinc-900/60 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-xl rounded-full" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Success Rate
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">{successRate}%</span>
                <span className="text-[10px] text-zinc-500">
                  of {resolvedCount} resolved
                </span>
              </div>
            </div>

            {/* Total Tracked */}
            <div className="glass-panel border border-zinc-900/60 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-xl rounded-full" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Total Tracked
                </span>
                <GitMerge className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">{totalDecisions}</span>
                <span className="text-[10px] text-zinc-500">decisions total</span>
              </div>
            </div>

            {/* Active Trackers */}
            <div className="glass-panel border border-zinc-900/60 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-xl rounded-full" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Active Trackers
                </span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">{pendingDecisions.length}</span>
                <span className="text-[10px] text-zinc-500">pending outcome</span>
              </div>
            </div>

            {/* Outcome Due */}
            <div className="glass-panel border border-zinc-900/60 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-xl rounded-full" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Outcome Due
                </span>
                <AlertCircle className={`w-4 h-4 ${overdueDecisions.length > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`} />
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className={`text-3xl font-black ${overdueDecisions.length > 0 ? 'text-amber-400' : 'text-white'}`}>
                  {overdueDecisions.length}
                </span>
                <span className="text-[10px] text-zinc-500">review required</span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs Selector & Filter Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-2">
            <div className="flex gap-4">
              <button
                onClick={() => setLedgerTab('active')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer relative ${
                  ledgerTab === 'active' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                🎯 Active Trackers ({pendingDecisions.length})
                {ledgerTab === 'active' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setLedgerTab('historical')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer relative ${
                  ledgerTab === 'historical' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                📚 Historical Ledger ({completedDecisions.length})
                {ledgerTab === 'historical' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Controls Row */}
          <div className="w-full bg-zinc-950/20 border border-zinc-900 rounded-2xl p-3 flex flex-wrap items-center gap-3 text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-900/60 hover:border-zinc-805 rounded-xl px-3 py-1.5 transition-all">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Filter Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent border-none text-zinc-300 text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-zinc-950">All Outcomes</option>
                {ledgerTab === 'active' ? (
                  <option value="pending" className="bg-zinc-950">Pending</option>
                ) : (
                  <>
                    <option value="success" className="bg-zinc-950">Success</option>
                    <option value="failed" className="bg-zinc-950">Failed</option>
                    <option value="trash" className="bg-zinc-950">Trashed</option>
                  </>
                )}
              </select>
            </div>

            {/* Created Date Exact Filter */}
            <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-900/60 hover:border-zinc-805 rounded-xl px-3 py-1.5 transition-all">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Created:</span>
              <select
                value={filterCreatedDate}
                onChange={(e) => setFilterCreatedDate(e.target.value)}
                className="bg-transparent border-none text-zinc-300 text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-zinc-950">All Dates</option>
                {uniqueCreatedDates.map((dateStr) => (
                  <option key={dateStr} value={dateStr} className="bg-zinc-950">
                    {new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Outcome Deadline Filter */}
            <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-900/60 hover:border-zinc-805 rounded-xl px-3 py-1.5 transition-all">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Due By:</span>
              <input
                type="date"
                value={filterTargetDate}
                onChange={(e) => setFilterTargetDate(e.target.value)}
                onClick={(e) => {
                  try {
                    (e.target as any).showPicker();
                  } catch (err) {}
                }}
                className="bg-transparent border-none text-zinc-300 text-xs focus:outline-none cursor-pointer"
              />
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-900/60 hover:border-zinc-805 rounded-xl px-3 py-1.5 transition-all ml-auto">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="bg-transparent border-none text-zinc-300 text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="newest" className="bg-zinc-950">Newest First</option>
                <option value="oldest" className="bg-zinc-950">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Tab Render: Active Trackers */}
          {ledgerTab === 'active' && (
            <div className="space-y-4">
              {displayPendingDecisions.length === 0 ? (
                <div className="glass-panel border border-zinc-900/60 p-12 text-center rounded-2xl text-zinc-500 text-xs">
                  No active trackers match your selected criteria.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {displayPendingDecisions.map((d) => {
                    const daysLeft = Math.ceil((d.expectedOutcomeDate - Date.now()) / (1000 * 60 * 60 * 24));
                    const isOverdue = Date.now() > d.expectedOutcomeDate;
                    
                    // Parse intermediate AI Insights
                    let evolutionSummary = '';
                    let jarvisInsight = '';
                    if (d.evolutionInsight) {
                      try {
                        const parsed = JSON.parse(d.evolutionInsight);
                        evolutionSummary = parsed.summary || '';
                        jarvisInsight = parsed.insight || '';
                      } catch (err) {}
                    }

                    return (
                      <div key={d.id} className={`glass-panel border p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all duration-300 ${
                        isOverdue ? 'border-amber-500/20 bg-amber-950/5' : 'border-zinc-900/80 hover:border-zinc-800'
                      }`}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-3">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-semibold tracking-wide uppercase ${
                              isOverdue 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse' 
                                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25'
                            }`}>
                              {isOverdue ? '⚠️ Overdue Review' : '⏳ Tracking Active'}
                            </span>
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-semibold">
                              <Clock className="w-3 h-3 text-cyan-400" /> 
                              {isOverdue ? 'Review Required' : `${daysLeft} days left`}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Decision Note/Brief</span>
                            <h3 className="text-zinc-100 text-xs font-bold leading-relaxed mt-0.5">
                              {d.title}
                            </h3>
                            <span className="text-[10px] text-zinc-500 italic block mt-1">
                              Mapped to Thought: "{d.thoughtContent.length > 70 ? `${d.thoughtContent.slice(0, 70)}...` : d.thoughtContent}"
                            </span>
                          </div>

                          <div className="p-3 bg-black/30 rounded-xl border border-zinc-900 text-xs space-y-1">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Target Outcome</span>
                            <p className="text-zinc-300 italic">"{d.successMetric}"</p>
                          </div>

                          {/* Dynamic Progress Timeline Stack */}
                          {d.logs && d.logs.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                                Progress logs timeline ({d.logs.length})
                              </span>
                              <div className="relative border-l border-zinc-900 ml-1.5 pl-3.5 space-y-2.5">
                                {d.logs.map((log) => (
                                  <div key={log.id} className="relative text-xs">
                                    <span className="absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
                                    <div className="text-[10px] text-zinc-500">
                                      {new Date(log.createdAt).toLocaleDateString()}
                                    </div>
                                    <p className="text-zinc-300 font-medium leading-relaxed mt-0.5">{log.note}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* JARVIS Evolution Summary & Proactive Insights */}
                          {evolutionSummary && (
                            <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] space-y-3 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/[0.02] blur-xl rounded-full" />
                              <div className="space-y-1 relative">
                                <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-wider block">AI Progress Summary</span>
                                <p className="text-zinc-300 text-xs leading-relaxed">{evolutionSummary}</p>
                              </div>
                              <div className="space-y-1 border-t border-amber-500/10 pt-2.5 relative">
                                <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-wider block flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> JARVIS Insight
                                </span>
                                <p className="text-zinc-200 text-xs leading-relaxed font-semibold italic">"{jarvisInsight}"</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-zinc-900/60 pt-3.5 space-y-4">
                          {reviewingId !== d.id && expandedProgressId !== d.id && (
                            <div className="flex gap-2">
                              {/* Log Progress Button */}
                              <button
                                onClick={() => setExpandedProgressId(expandedProgressId === d.id ? null : d.id)}
                                className="flex-1 text-[10px] py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                {expandedProgressId === d.id ? 'Hide Update' : 'Log Progress'}
                              </button>

                              {/* Review & Close Button */}
                              <button
                                onClick={() => handleStartReview(d)}
                                className="flex-1 text-[10px] py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                Review & Close
                              </button>
                            </div>
                          )}

                          {/* Expandable Progress Log Input Form */}
                          {expandedProgressId === d.id && (
                            <div className="space-y-2 pt-1 animate-slideDown">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Add progress log</span>
                              <textarea
                                placeholder="Detail what actions you took, roadblocks experienced, or intermediate milestones met..."
                                value={progressNoteText[d.id] || ''}
                                onChange={(e) => setProgressNoteText({ ...progressNoteText, [d.id]: e.target.value })}
                                rows={2}
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setExpandedProgressId(null)}
                                  className="text-[9px] px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveProgress(d.id)}
                                  disabled={isSubmittingProgress[d.id]}
                                  className="text-[9px] px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  {isSubmittingProgress[d.id] && <Loader2 className="w-3 h-3 animate-spin" />}
                                  Log Update
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Close Review Status Panel */}
                          {reviewingId === d.id && (
                            <div className="space-y-4 pt-1 animate-slideDown">
                              <div>
                                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                                  Retrospective Close Status
                                </label>
                                <div className="flex gap-2">
                                  {([
                                    { label: 'success', color: 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400' },
                                    { label: 'failed', color: 'bg-rose-600/20 border-rose-500/40 text-rose-400' },
                                    { label: 'trash', color: 'bg-zinc-800 border-zinc-700 text-zinc-300' }
                                  ] as const).map((s) => (
                                    <button
                                      key={s.label}
                                      onClick={() => setOutcomeStatus(s.label)}
                                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer capitalize ${
                                        outcomeStatus === s.label
                                          ? `${s.color} shadow-md`
                                          : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-400'
                                      }`}
                                    >
                                      {s.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                                  Retrospective Journal (What actually happened?)
                                </label>
                                <textarea
                                  placeholder="Detail what happened, why it succeeded/failed, and lessons learned..."
                                  value={outcomeNotes}
                                  onChange={(e) => setOutcomeNotes(e.target.value)}
                                  rows={2}
                                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={handleCancelReview}
                                  className="text-[9px] px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveReview(d.id)}
                                  disabled={isSubmitting}
                                  className="text-[9px] px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                                  Log Retrospective
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab Render: Historical Ledger */}
          {ledgerTab === 'historical' && (
            <div className="space-y-4">
              {displayCompletedDecisions.length === 0 ? (
                <div className="glass-panel border border-zinc-900/60 p-12 text-center rounded-2xl text-zinc-500 text-xs">
                  No historical outcomes configured.
                </div>
              ) : (
                <div className="space-y-4">
                  {displayCompletedDecisions.map((d) => {
                    const isExpanded = expandedHistoryId === d.id;
                    const createdFormatted = new Date(d.createdAt).toLocaleString(undefined, {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                    const closedFormatted = d.reviewedAt
                      ? new Date(d.reviewedAt).toLocaleString(undefined, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                      : '';

                    return (
                      <div 
                        key={d.id} 
                        onClick={() => setExpandedHistoryId(isExpanded ? null : d.id)}
                        className="glass-panel border border-zinc-900/60 p-5 rounded-2xl space-y-4 hover:border-zinc-800 hover:bg-zinc-900/10 transition-all duration-300 cursor-pointer select-none"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="text-white text-xs font-bold truncate max-w-lg">
                              {d.title}
                            </h3>
                            <span 
                              className="text-[10px] text-zinc-500 italic block mt-0.5 cursor-help"
                              title={d.thoughtContent}
                            >
                              Mapped to Thought: "{d.thoughtContent.length > 70 ? `${d.thoughtContent.slice(0, 70)}...` : d.thoughtContent}" (hover to read full thought)
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border font-extrabold tracking-wider uppercase ${
                              d.status === 'success'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : d.status === 'failed'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}>
                              {d.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {d.status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                              {d.status === 'trash' && <HelpCircle className="w-3.5 h-3.5" />}
                              {d.status === 'trash' ? 'trashed' : d.status}
                            </span>
                            <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                              Logged: {d.reviewedAt ? new Date(d.reviewedAt).toLocaleDateString() : ''}
                            </span>
                            <div className="text-zinc-500 p-1 hover:text-white transition-colors">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Details Content */}
                        {isExpanded && (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="mt-4 pt-4 border-t border-zinc-900/60 space-y-4 animate-slideDown cursor-default select-text"
                          >
                            {/* Layman Labels and Details grid */}
                            <div className="grid md:grid-cols-2 gap-4 text-xs">
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Decision Note/Brief</span>
                                <p className="text-zinc-200 font-semibold leading-relaxed bg-black/10 p-2.5 rounded-xl border border-zinc-900/60">{d.title}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Target Outcome</span>
                                <p className="text-zinc-300 italic bg-black/10 p-2.5 rounded-xl border border-zinc-900/60">"{d.successMetric}"</p>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 text-xs">
                              {d.outcomeNotes && (
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Retrospective Review</span>
                                  <p className="text-zinc-300 leading-relaxed bg-black/10 p-2.5 rounded-xl border border-zinc-900/60">{d.outcomeNotes}</p>
                                </div>
                              )}
                              <div className="space-y-2 bg-black/10 p-2.5 rounded-xl border border-zinc-900/60 text-[11px] leading-relaxed">
                                <div>
                                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Logged Date & Time:</span>
                                  <span className="text-zinc-300 ml-1.5 font-medium">{createdFormatted}</span>
                                </div>
                                {d.reviewedAt && (
                                  <div>
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Closed Date & Time:</span>
                                    <span className="text-zinc-300 ml-1.5 font-medium">{closedFormatted}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Full mapped thought content */}
                            <div className="space-y-1 text-xs">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Full Mapped Thought Content</span>
                              <p className="text-zinc-400 font-medium italic border-l-2 border-zinc-700 pl-3 leading-relaxed bg-zinc-900/10 p-2 rounded">
                                "{d.thoughtContent}"
                              </p>
                            </div>

                            {/* Display Progress logs stack */}
                            {d.logs && d.logs.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-zinc-950/40">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                                  Evolution progress stack
                                </span>
                                <div className="relative border-l border-zinc-900 ml-1.5 pl-3.5 space-y-2">
                                  {d.logs.map((log) => (
                                    <div key={log.id} className="relative text-xs">
                                      <span className="absolute -left-[20px] top-1 w-2 h-2 rounded-full bg-zinc-900 border border-zinc-800" />
                                      <span className="text-[9px] text-zinc-500">{new Date(log.createdAt).toLocaleDateString()}</span>
                                      <p className="text-zinc-300 leading-relaxed mt-0.5">{log.note}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Final AI Synthesis Summary */}
                            {d.finalSynthesis && (
                              <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/[0.02] space-y-1">
                                <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-wider block flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI Resolution Synthesis
                                </span>
                                <p className="text-zinc-200 text-xs leading-relaxed italic">"{d.finalSynthesis}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ))}
    </div>
  );
}
