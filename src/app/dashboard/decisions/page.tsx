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
  FileText
} from 'lucide-react';

interface DecisionRecord {
  id: string;
  thoughtId: string;
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
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
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
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            Decision note
                          </span>
                          <h3 className="text-white text-sm font-semibold mt-0.5 leading-relaxed">
                            {d.thoughtSummary}
                          </h3>
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
                          {d.thoughtSummary}
                        </h3>
                        <p className="text-zinc-400 text-xs italic leading-relaxed line-clamp-3 bg-black/20 p-2.5 rounded border border-zinc-950">
                          Success: "{d.successMetric}"
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-900/60 pt-3">
                        <span>Expected: {new Date(d.expectedOutcomeDate).toLocaleDateString()}</span>
                        <button 
                          onClick={() => handleStartReview(d)}
                          className="text-[9px] text-fuchsia-400 hover:text-fuchsia-300 font-semibold flex items-center gap-0.5"
                        >
                          Review Now <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
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
                        <h3 className="text-white text-xs font-bold truncate max-w-lg">
                          {d.thoughtSummary}
                        </h3>
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
      )}
    </div>
  );
}
