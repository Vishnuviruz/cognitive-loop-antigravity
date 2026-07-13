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
} from 'lucide-react';
import { LessonsVault } from './LessonsVault';

interface DecisionRecord {
  id: string;
  thoughtId: string;
  title: string;
  expectedOutcomeDate: number;
  successMetric: string;
  status: 'pending' | 'success' | 'failed' | 'neutral';
  outcomeNotes: string | null;
  reviewedAt: number | null;
  createdAt: number;
  thoughtContent: string;
  thoughtSummary: string;
}

export default function DecisionLedgerPage() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Retroactive Outcome logging states (inline inside lists)
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [outcomeStatus, setOutcomeStatus] = useState<'success' | 'failed' | 'neutral'>('success');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab switching: 'ledger' | 'lessons'
  const [activeTab, setActiveTab] = useState<'ledger' | 'lessons'>('ledger');

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

  // Stats computation
  const totalDecisions = decisions.length;
  const pendingDecisions = decisions.filter((d) => d.status === 'pending');
  const activeDecisions = pendingDecisions.filter((d) => Date.now() <= d.expectedOutcomeDate);
  
  const overdueDecisions = pendingDecisions.filter((d) => Date.now() > d.expectedOutcomeDate);
  const completedDecisions = decisions.filter((d) => d.status !== 'pending');
  
  const successCount = completedDecisions.filter((d) => d.status === 'success').length;
  const failedCount = completedDecisions.filter((d) => d.status === 'failed').length;
  const neutralCount = completedDecisions.filter((d) => d.status === 'neutral').length;

  // Success rate is success / (success + failed)
  const resolvedCount = successCount + failedCount;
  const successRate = resolvedCount > 0 ? Math.round((successCount / resolvedCount) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-fuchsia-600/10 text-fuchsia-400 border border-fuchsia-500/10">
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
                  ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30'
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
                  ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30'
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
              className="text-xs px-4 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold transition-all cursor-pointer shadow-md shadow-fuchsia-500/10 flex items-center gap-1.5"
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
          <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 blur-2xl rounded-full" />
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
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500 focus:border-transparent"
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
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-fuchsia-500 focus:border-transparent"
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
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-fuchsia-500 focus:border-transparent"
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
                              ? 'bg-fuchsia-600/20 border-fuchsia-500/40 text-fuchsia-300'
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
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500 focus:border-transparent select-none cursor-pointer"
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
                className="text-xs px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
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
            <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
            <span className="text-xs">Loading ledger analytics...</span>
          </div>
        ) : (
        <>
          {/* Stats Analytics Grid */}
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
              <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/5 blur-xl rounded-full" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Total Tracked
                </span>
                <GitMerge className="w-4 h-4 text-fuchsia-400" />
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
                <span className="text-3xl font-black text-white">{activeDecisions.length}</span>
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

          {/* Ledger Lists */}
          <div className="space-y-8">
            {/* Section 1: Outcome Review Due */}
            {overdueDecisions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                    ⚠️ Outcome Review Due
                  </h2>
                </div>
                <div className="grid gap-4">
                  {overdueDecisions.map((d) => (
                    <div key={d.id} className="glass-panel border border-amber-500/20 bg-amber-950/5 p-5 rounded-xl space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                            Decision note
                          </span>
                          <h3 className="text-white text-sm font-semibold mt-0.5 leading-relaxed">
                            {d.title}
                          </h3>
                          <span className="text-[10px] text-zinc-500 italic block mt-1">
                            Mapped to Thought: "{d.thoughtContent.length > 70 ? `${d.thoughtContent.slice(0, 70)}...` : d.thoughtContent}"
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-semibold whitespace-nowrap">
                          Past Due
                        </span>
                      </div>

                      <div className="p-3 bg-black/25 rounded-lg border border-zinc-900/80 text-xs">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                          Success Metric
                        </span>
                        <p className="text-zinc-300 italic">"{d.successMetric}"</p>
                      </div>

                      {reviewingId !== d.id ? (
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Due since: {new Date(d.expectedOutcomeDate).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => handleStartReview(d)}
                            className="text-xs px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all cursor-pointer shadow-md shadow-amber-500/10"
                          >
                            Log Outcome
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-2 border-t border-zinc-900/60">
                          <div>
                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                              Retrospective Status
                            </label>
                            <div className="flex gap-2">
                              {(['success', 'failed', 'neutral'] as const).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setOutcomeStatus(s)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer capitalize ${
                                    outcomeStatus === s
                                      ? s === 'success'
                                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400 shadow-md'
                                        : s === 'failed'
                                          ? 'bg-rose-600/20 border-rose-500/40 text-rose-400 shadow-md'
                                          : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                                      : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-400'
                                  }`}
                                >
                                  {s}
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
                              className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleCancelReview}
                              className="text-[10px] px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveReview(d.id)}
                              disabled={isSubmitting}
                              className="text-[10px] px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all cursor-pointer flex items-center gap-1"
                            >
                              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                              Log Outcome
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Active Trackers */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-fuchsia-500 rounded-full" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  🎯 Active Trackers ({activeDecisions.length})
                </h2>
              </div>

              {activeDecisions.length === 0 ? (
                <div className="glass-panel border border-zinc-900/60 p-8 text-center rounded-xl text-xs text-zinc-500">
                  No active trackers configured. Log a decision note on your timeline to activate tracking.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {activeDecisions.map((d) => (
                    <div key={d.id} className="glass-panel border border-zinc-900/60 p-5 rounded-xl flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-semibold tracking-wide">
                            ⏳ Tracking Active
                          </span>
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3 text-cyan-400" /> {Math.ceil((d.expectedOutcomeDate - Date.now()) / (1000 * 60 * 60 * 24))} days left
                          </span>
                        </div>
                        <h3 className="text-zinc-200 text-xs font-bold leading-relaxed truncate">
                          {d.title}
                        </h3>
                        <span className="text-[10px] text-zinc-500 italic block">
                          Mapped to Thought: "{d.thoughtContent.length > 70 ? `${d.thoughtContent.slice(0, 70)}...` : d.thoughtContent}"
                        </span>
                        <p className="text-zinc-400 text-xs italic leading-relaxed line-clamp-3 bg-black/20 p-2.5 rounded border border-zinc-950">
                          Success: "{d.successMetric}"
                        </p>
                      </div>

                      {reviewingId !== d.id ? (
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-900/60 pt-3">
                          <span>Expected: {new Date(d.expectedOutcomeDate).toLocaleDateString()}</span>
                          <button 
                            onClick={() => handleStartReview(d)}
                            className="text-[9px] text-fuchsia-400 hover:text-fuchsia-300 font-semibold flex items-center gap-0.5"
                          >
                            Review Now <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-2 border-t border-zinc-900/60">
                          <div>
                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                              Retrospective Status
                            </label>
                            <div className="flex gap-2">
                              {(['success', 'failed', 'neutral'] as const).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setOutcomeStatus(s)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer capitalize ${
                                    outcomeStatus === s
                                      ? s === 'success'
                                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400 shadow-md'
                                        : s === 'failed'
                                          ? 'bg-rose-600/20 border-rose-500/40 text-rose-400 shadow-md'
                                          : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                                      : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-400'
                                  }`}
                                >
                                  {s}
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
                              className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleCancelReview}
                              className="text-[10px] px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveReview(d.id)}
                              disabled={isSubmitting}
                              className="text-[10px] px-3 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold transition-all cursor-pointer flex items-center gap-1"
                            >
                              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                              Log Outcome
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Historical Ledger */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-zinc-700 rounded-full" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  📚 Historical Ledger ({completedDecisions.length})
                </h2>
              </div>

              {completedDecisions.length === 0 ? (
                <div className="glass-panel border border-zinc-900/60 p-8 text-center rounded-xl text-xs text-zinc-500">
                  No historical outcomes logged yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {completedDecisions.map((d) => (
                    <div key={d.id} className="glass-panel border border-zinc-900/60 p-5 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-white text-xs font-bold truncate max-w-lg">
                            {d.title}
                          </h3>
                          <span className="text-[10px] text-zinc-500 italic block mt-0.5">
                            Mapped to Thought: "{d.thoughtContent.length > 70 ? `${d.thoughtContent.slice(0, 70)}...` : d.thoughtContent}"
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border font-extrabold tracking-wider uppercase ${
                            d.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : d.status === 'failed'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            {d.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {d.status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                            {d.status === 'neutral' && <HelpCircle className="w-3.5 h-3.5" />}
                            {d.status}
                          </span>
                          <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                            Logged: {d.reviewedAt ? new Date(d.reviewedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-xs pt-2 border-t border-zinc-950/40">
                        <div className="space-y-1">
                          <p className="text-zinc-500 font-bold text-[9px] uppercase tracking-wider">Expected Metric:</p>
                          <p className="text-zinc-300 italic bg-black/10 p-2 rounded">"{d.successMetric}"</p>
                        </div>
                        {d.outcomeNotes && (
                          <div className="space-y-1">
                            <p className="text-zinc-500 font-bold text-[9px] uppercase tracking-wider">Retrospective Journal:</p>
                            <p className="text-zinc-300 leading-relaxed font-mono bg-black/10 p-2 rounded">{d.outcomeNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
        )
      )}
    </div>
  );
}
