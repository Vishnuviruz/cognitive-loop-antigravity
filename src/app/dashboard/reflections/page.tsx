'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Loader2, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ChevronRight
} from 'lucide-react';

interface Reflection {
  id: string;
  type: string; // 'weekly' | 'monthly'
  content: string;
  growthInsights: string;
  createdAt: number;
}

export default function ReflectionsPage() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null);

  useEffect(() => {
    fetchReflections();
  }, []);

  const fetchReflections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analysis/reflections');
      if (res.ok) {
        const data = await res.json();
        setReflections(data.reflections || []);
        if (data.reflections && data.reflections.length > 0) {
          setSelectedReflection(data.reflections[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching reflections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (type: 'weekly' | 'monthly') => {
    setErrorMsg('');
    setSuccessMsg('');
    setGeneratingType(type);

    try {
      const res = await fetch('/api/analysis/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || `Failed to generate ${type} reflection.`);
      } else {
        setSuccessMsg(`Your ${type} reflection has been successfully compiled!`);
        // Add new reflection to list and select it
        setReflections((prev) => [data.reflection, ...prev]);
        setSelectedReflection(data.reflection);
      }
    } catch (err) {
      setErrorMsg('A network error occurred. Please try again.');
    } finally {
      setGeneratingType(null);
    }
  };

  // Utility to parse markdown-like bullets safely in basic React
  const renderBullets = (bulletsText: string) => {
    return bulletsText
      .split('\n')
      .map((line) => line.trim().replace(/^[-*+]\s*/, ''))
      .filter((line) => line.length > 0)
      .map((bullet, index) => (
        <li key={index} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
          <span>{bullet}</span>
        </li>
      ));
  };

  // Format paragraphs safely
  const renderParagraphs = (text: string) => {
    return text
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((paragraph, index) => (
        <p key={index} className="text-zinc-300 text-xs leading-relaxed white-space-pre-wrap">
          {paragraph}
        </p>
      ));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white text-glow-indigo">
          Reflection Engine
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Synthesize entries, review loops, discover growth metrics, and examine your cognitive logs.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Sidebar Trigger Panel & List (Left 4 Columns) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Generator Controls */}
          <div className="glass-panel rounded-2xl p-5 border-zinc-800/80 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Compile Reflection
            </h3>
            
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              Synthesize past thoughts into structured digests. Requires at least 3 thoughts logged in the timeframe.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => handleGenerate('weekly')}
                disabled={generatingType !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {generatingType === 'weekly' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Compiling...
                  </>
                ) : (
                  <>
                    <span>Generate Weekly digest</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <button
                onClick={() => handleGenerate('monthly')}
                disabled={generatingType !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {generatingType === 'monthly' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Compiling...
                  </>
                ) : (
                  <>
                    <span>Generate Monthly digest</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Past Reflections Index */}
          <div className="glass-panel rounded-2xl p-5 border-zinc-800/80 shadow-md space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" /> Past Reflections
            </h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
              </div>
            ) : reflections.length === 0 ? (
              <div className="text-center text-zinc-600 py-4 text-xs">
                No past reflections found. Click compile above to generate one.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {reflections.map((r) => {
                  const isSelected = selectedReflection?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReflection(r)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                          : 'bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          r.type === 'weekly' 
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}>
                          {r.type}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold truncate text-zinc-300 mt-1">
                        {r.type === 'weekly' ? 'Weekly Growth Letter' : 'Monthly Growth Letter'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Detailed View Card (Right 8 Columns) */}
        <div className="lg:col-span-8">
          {selectedReflection ? (
            <div className="glass-panel rounded-2xl p-6 md:p-8 border-zinc-800/80 shadow-xl space-y-6 relative overflow-hidden bg-zinc-950/20">
              <div className="absolute top-0 right-0 w-[250px] h-[250px] rounded-full bg-indigo-500/5 blur-[60px] pointer-events-none" />

              {/* Detail Header */}
              <div className="flex justify-between items-start pb-5 border-b border-zinc-900">
                <div className="space-y-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    selectedReflection.type === 'weekly' 
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  }`}>
                    {selectedReflection.type} reflection
                  </span>
                  <h2 className="text-xl font-bold text-white tracking-tight mt-2">
                    {selectedReflection.type === 'weekly' ? 'Weekly Growth Reflection' : 'Monthly Growth Reflection'}
                  </h2>
                </div>
                <div className="text-right text-[10px] text-zinc-500 font-medium flex items-center gap-1.5 mt-1">
                  <Calendar className="w-4 h-4 text-zinc-600" />
                  {new Date(selectedReflection.createdAt).toLocaleString([], { dateStyle: 'long' })}
                </div>
              </div>

              {/* Synthesized Letter */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Mind Synthesis Letter
                </h3>
                <div className="space-y-3.5 leading-relaxed pl-1">
                  {renderParagraphs(selectedReflection.content)}
                </div>
              </div>

              {/* Growth Recommendations */}
              <div className="pt-6 border-t border-zinc-900/60 space-y-3">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Weekly Recommendations & Growth Action Items
                </h3>
                <ul className="space-y-2.5 pl-1">
                  {renderBullets(selectedReflection.growthInsights)}
                </ul>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 glass-panel border-dashed rounded-2xl p-8 border-zinc-800 text-center">
              <Sparkles className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-zinc-300">No reflection selected</h3>
              <p className="text-zinc-500 text-xs max-w-sm mx-auto mt-1">
                Select an entry in the list to inspect it, or compile a new one from the generator panel.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
