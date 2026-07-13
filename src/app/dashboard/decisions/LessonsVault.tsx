'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  Lightbulb,
  GitMerge,
  Cpu,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface LessonRecord {
  id: string;
  lesson: string;
  isSuccessful: number; // 1 = success, 0 = failure/neutral
  createdAt: number;
  decisionId: string | null;
  entityId: string | null;
  successMetric: string | null;
  decisionStatus: string | null;
  thoughtSummary: string | null;
  entityName: string | null;
  entityType: string | null;
}

const entityTypeIcon = (type: string | null) => {
  switch (type) {
    case 'Technology': return <Cpu className="w-3 h-3" />;
    case 'Project': return <GitMerge className="w-3 h-3" />;
    case 'Goal': return <Sparkles className="w-3 h-3" />;
    case 'Person': return <HelpCircle className="w-3 h-3" />;
    default: return <Lightbulb className="w-3 h-3" />;
  }
};

export function LessonsVault() {
  const [lessonsList, setLessonsList] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const res = await fetch('/api/lessons');
        if (res.ok) {
          const data = await res.json();
          setLessonsList(data.lessons || []);
        } else {
          setError('Failed to load lessons.');
        }
      } catch (err) {
        console.error(err);
        setError('Network error while fetching lessons.');
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
        <span className="text-xs">Loading your Lessons Vault...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs">
        {error}
      </div>
    );
  }

  if (lessonsList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-zinc-500">
        <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
          <BookOpen className="w-7 h-7 text-fuchsia-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">Vault is empty</p>
          <p className="text-zinc-500 text-xs mt-1 max-w-xs">
            Once you log the outcome of a tracked decision, JARVIS will extract a reusable lesson
            and store it here as procedural wisdom.
          </p>
        </div>
      </div>
    );
  }

  const successCount = lessonsList.filter((l) => l.isSuccessful === 1).length;
  const failureCount = lessonsList.length - successCount;

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel rounded-xl p-4 border border-zinc-900/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-fuchsia-500/5 blur-xl rounded-full" />
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Lessons</p>
          <p className="text-2xl font-black text-white mt-2">{lessonsList.length}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-zinc-900/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-xl rounded-full" />
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">From Wins</p>
          <p className="text-2xl font-black text-emerald-400 mt-2">{successCount}</p>
        </div>
        <div className="glass-panel rounded-xl p-4 border border-zinc-900/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 blur-xl rounded-full" />
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">From Losses</p>
          <p className="text-2xl font-black text-rose-400 mt-2">{failureCount}</p>
        </div>
      </div>

      {/* Lessons list */}
      <div className="space-y-3">
        {lessonsList.map((l) => (
          <div
            key={l.id}
            className="glass-panel rounded-2xl border border-zinc-900/60 p-5 relative overflow-hidden group hover:border-zinc-700/60 transition-all"
          >
            {/* Background glow */}
            <div
              className={`absolute top-0 right-0 w-32 h-32 blur-2xl rounded-full pointer-events-none ${
                l.isSuccessful === 1 ? 'bg-emerald-500/5' : 'bg-rose-500/5'
              }`}
            />

            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              {/* Outcome badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  l.isSuccessful === 1
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {l.isSuccessful === 1 ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {l.isSuccessful === 1 ? 'From a Win' : 'From a Loss'}
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-zinc-600 shrink-0">
                {new Date(l.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Lesson text */}
            <p className="text-sm text-zinc-200 leading-relaxed font-medium mb-4">{l.lesson}</p>

            {/* Context footer */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-900/60">
              {l.thoughtSummary && (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 bg-zinc-900/40 px-2.5 py-1 rounded-full border border-zinc-800/60">
                  <GitMerge className="w-2.5 h-2.5 text-fuchsia-500" />
                  <span className="max-w-[200px] truncate">{l.thoughtSummary}</span>
                </div>
              )}
              {l.entityName && (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-900/40 px-2.5 py-1 rounded-full border border-zinc-800/60">
                  <span className="text-indigo-400">{entityTypeIcon(l.entityType)}</span>
                  {l.entityName}
                </div>
              )}
              {l.successMetric && (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 bg-zinc-900/40 px-2.5 py-1 rounded-full border border-zinc-800/60 max-w-xs truncate">
                  <Lightbulb className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  <span className="truncate">{l.successMetric}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
