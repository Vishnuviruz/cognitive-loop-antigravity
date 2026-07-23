'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Sparkles, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Send,
  Loader2,
  Calendar,
  AlertCircle,
  Tag,
  ArrowRight,
  TrendingUp,
  Brain,
  MessageSquare,
  GitMerge,
  Edit3,
  Trash2,
  X,
  ArrowUpRight,
  CheckSquare,
  CheckCircle2
} from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';
import Link from 'next/link';
import { getCustomCategories, getCustomTags, getCustomPriorities, getCustomStatuses } from '@/lib/customSettings';

interface Connection {
  relationshipId: string;
  thoughtId: string;
  summary: string;
  category: string;
  score: number;
}

interface Decision {
  id: string;
  thoughtId: string;
  expectedOutcomeDate: number;
  successMetric: string;
  status: 'pending' | 'success' | 'failed' | 'neutral';
  outcomeNotes: string | null;
  reviewedAt: number | null;
  createdAt: number;
}

interface TimelineActionItem {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
}

interface SuggestedTask {
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface SuggestedDecision {
  title: string;
  successMetric: string;
}

interface Thought {
  id: string;
  content: string;
  summary: string;
  category: string;
  sentiment: string;
  tags: string[];
  connections: Connection[];
  jarvisInsight?: string | null;
  suggestedTasks?: SuggestedTask[];
  suggestedDecisions?: SuggestedDecision[];
  decision?: Decision | null;
  decisions?: Decision[] | null;
  actionItems?: TimelineActionItem[];
  createdAt: number;
}

interface Loop {
  id: string;
  theme: string;
  description: string;
  thoughtIds: string[];
  createdAt: number;
}

export default function DashboardPage() {
  const [thoughtsList, setThoughtsList] = useState<Thought[]>([]);
  const [loopsList, setLoopsList] = useState<Loop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inputText, setInputText] = useState('');
  
  const [loadingThoughts, setLoadingThoughts] = useState(true);
  const [loadingLoops, setLoadingLoops] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecalculatingLoops, setIsRecalculatingLoops] = useState(false);
  const [expandedThoughtId, setExpandedThoughtId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Decision Tracking State variables
  const [trackingThoughtId, setTrackingThoughtId] = useState<string | null>(null);
  const [expectedOutcomeDate, setExpectedOutcomeDate] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [successMetric, setSuccessMetric] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Decision Review State variables
  const [reviewingDecisionId, setReviewingDecisionId] = useState<string | null>(null);
  const [outcomeStatus, setOutcomeStatus] = useState<'success' | 'failed' | 'neutral'>('success');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // User Profile
  const [userProfile, setUserProfile] = useState<{ name?: string | null; email: string } | null>(null);

  // Thought Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; // Display 5 thoughts per page to keep page compact

  // Thought Editing
  const [editingThought, setEditingThought] = useState<Thought | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [newCustomTag, setNewCustomTag] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Thought-to-Action Creation States
  const [thoughtTaskTitle, setThoughtTaskTitle] = useState('');
  const [thoughtTaskPriority, setThoughtTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isCreatingThoughtTask, setIsCreatingThoughtTask] = useState<string | null>(null);
  const [createTaskPriorityOpen, setCreateTaskPriorityOpen] = useState(false);

  // Suggested Tasks Promotion States
  const [selectedSuggestedTasks, setSelectedSuggestedTasks] = useState<Record<string, string[]>>({});
  const [isPromotingSuggested, setIsPromotingSuggested] = useState<string | null>(null);

  // Suggested Decisions Promotion States
  const [selectedSuggestedDecisions, setSelectedSuggestedDecisions] = useState<Record<string, string[]>>({});
  const [isPromotingSuggestedDecision, setIsPromotingSuggestedDecision] = useState<string | null>(null);

  // Thought Deletion
  const [deleteThoughtId, setDeleteThoughtId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const categories = [
    { value: 'all', label: 'All Entries' },
    ...customCategories.map(cat => ({ value: cat, label: cat }))
  ];

  const getFirstName = () => {
    if (!userProfile?.name) return 'Explorer';
    return userProfile.name.trim().split(/\s+/)[0];
  };

  const personalizeDescription = (desc: string) => {
    const firstName = getFirstName();
    return desc
      .replace(/\bthe user\b/gi, `Hey ${firstName}, you`)
      .replace(/\buser\b/gi, `Hey ${firstName}, you`);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'idea':
      case 'ideas': 
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'goal':
      case 'goals': 
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'reflection':
      case 'reflections': 
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'learning':
      case 'learnings': 
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'decision':
      case 'decisions': 
        return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
      case 'problem':
      case 'problems': 
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'opportunity':
      case 'opportunities': 
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'work':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'personal':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'fitness':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'finance':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: 
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return 'bg-emerald-500';
      case 'Negative': return 'bg-rose-500';
      default: return 'bg-zinc-500';
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data.user);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    fetchProfile();
    setCustomCategories(getCustomCategories());

    const handleUpdate = () => {
      setCustomCategories(getCustomCategories());
    };
    window.addEventListener('customSettingsUpdated', handleUpdate);
    return () => {
      window.removeEventListener('customSettingsUpdated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchThoughts();
    fetchLoops();
  }, [searchQuery, selectedCategory]);

  const fetchThoughts = async () => {
    setLoadingThoughts(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const res = await fetch(`/api/thoughts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setThoughtsList(data.thoughts || []);
      }
    } catch (err) {
      console.error('Error loading thoughts:', err);
    } finally {
      setLoadingThoughts(false);
    }
  };

  const fetchLoops = async () => {
    setLoadingLoops(true);
    try {
      const res = await fetch('/api/analysis/loops');
      if (res.ok) {
        const data = await res.json();
        setLoopsList(data.loops || []);
      }
    } catch (err) {
      console.error('Error loading loops:', err);
    } finally {
      setLoadingLoops(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setErrorMsg('');
    setIsProcessing(true);
    const content = inputText;
    setInputText('');

    try {
      const res = await fetch('/api/thoughts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content,
          customCategories: getCustomCategories(),
          customTags: getCustomTags(),
          customPriorities: getCustomPriorities().map(p => p.level),
          customStatuses: getCustomStatuses().map(s => s.name)
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'Failed to analyze thought.');
        setInputText(content); // Restore input
      } else {
        // Prepend to list
        setThoughtsList((prev) => [data.thought, ...prev]);
        fetchLoops(); // Reload loops in background
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to save thought.');
      setInputText(content);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAudioSubmit = async (audioBlob: Blob, localTranscript?: string) => {
    setErrorMsg('');
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      if (localTranscript) {
        formData.append('content', localTranscript);
      }
      formData.append('customCategories', JSON.stringify(getCustomCategories()));
      formData.append('customTags', JSON.stringify(getCustomTags()));
      formData.append('customPriorities', JSON.stringify(getCustomPriorities().map(p => p.level)));
      formData.append('customStatuses', JSON.stringify(getCustomStatuses().map(s => s.name)));

      const res = await fetch('/api/thoughts', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'Failed to transcribe audio.');
      } else {
        setThoughtsList((prev) => [data.thought, ...prev]);
        fetchLoops(); // Reload loops
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to send voice thought.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecalculateLoops = async () => {
    setIsRecalculatingLoops(true);
    try {
      const res = await fetch('/api/analysis/loops', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLoopsList(data.loops || []);
      }
    } catch (err) {
      console.error('Failed to recalculate loops:', err);
    } finally {
      setIsRecalculatingLoops(false);
    }
  };

  const handleStartTrack = (thoughtObj: Thought) => {
    setTrackingThoughtId(thoughtObj.id);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const dateString = nextWeek.toISOString().split('T')[0];
    setExpectedOutcomeDate(dateString);
    setDecisionTitle(thoughtObj.content || '');
    setSuccessMetric('');
  };

  const handleCancelTrack = () => {
    setTrackingThoughtId(null);
  };

  const handleSaveTrack = async (thoughtId: string) => {
    if (!decisionTitle.trim() || !expectedOutcomeDate || !successMetric.trim()) {
      alert('Please fill out all fields.');
      return;
    }
    
    setIsSubmittingDecision(true);
    try {
      const outcomeTimestamp = new Date(expectedOutcomeDate).getTime();
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thoughtId,
          title: decisionTitle.trim(),
          expectedOutcomeDate: outcomeTimestamp,
          successMetric: successMetric.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Fetch thoughts list to update decisions state cleanly
        await fetchThoughts();
        setTrackingThoughtId(null);
      } else {
        alert(data.message || 'Failed to save decision tracker.');
      }
    } catch (err) {
      console.error('Error saving decision tracker:', err);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleStartReview = (decision: Decision) => {
    setReviewingDecisionId(decision.id);
    setOutcomeStatus('success');
    setOutcomeNotes('');
  };

  const handleCancelReview = () => {
    setReviewingDecisionId(null);
  };

  const handleSaveReview = async (decisionId: string, thoughtId: string) => {
    if (!outcomeNotes.trim()) {
      alert('Please log retrospective outcome notes.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/decisions/${decisionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: outcomeStatus,
          outcomeNotes: outcomeNotes.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setThoughtsList((prev) =>
          prev.map((t) => (t.id === thoughtId ? { ...t, decision: data.decision } : t))
        );
        setReviewingDecisionId(null);
      } else {
        alert(data.message || 'Failed to save outcome review.');
      }
    } catch (err) {
      console.error('Error saving outcome review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCreateActionItemForThought = async (thoughtId: string, category: string) => {
    if (!thoughtTaskTitle.trim()) return;
    setIsCreatingThoughtTask(thoughtId);
    try {
      const res = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thoughtId,
          title: thoughtTaskTitle.trim(),
          priority: thoughtTaskPriority,
          description: null,
          category: category || 'Work',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setThoughtsList((prev) =>
          prev.map((t) => {
            if (t.id === thoughtId) {
              const currentActions = t.actionItems || [];
              return {
                ...t,
                actionItems: [...currentActions, data.actionItem],
              };
            }
            return t;
          })
        );
        setThoughtTaskTitle('');
        setThoughtTaskPriority('medium');
      }
    } catch (err) {
      console.error('Error creating action item from thought:', err);
    } finally {
      setIsCreatingThoughtTask(null);
    }
  };

  const handleToggleSuggestedTaskCheck = (thoughtId: string, taskTitle: string) => {
    setSelectedSuggestedTasks((prev) => {
      const currentSelected = prev[thoughtId] || [];
      const isSelected = currentSelected.includes(taskTitle);
      const nextSelected = isSelected
        ? currentSelected.filter((t) => t !== taskTitle)
        : [...currentSelected, taskTitle];
      return {
        ...prev,
        [thoughtId]: nextSelected,
      };
    });
  };

  const handlePromoteSuggestedTasks = async (thought: Thought) => {
    const selected = selectedSuggestedTasks[thought.id] || [];
    if (selected.length === 0) return;

    setIsPromotingSuggested(thought.id);
    try {
      const createdTasks: TimelineActionItem[] = [];
      for (const title of selected) {
        const suggested = thought.suggestedTasks?.find((s) => s.title === title);
        const res = await fetch('/api/action-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thoughtId: thought.id,
            title: suggested?.title || title,
            description: suggested?.description || `AI-suggested task promoted from thought: "${thought.summary}".`,
            priority: suggested?.priority || 'medium',
            category: thought.category || 'General',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          createdTasks.push({
            id: data.actionItem.id,
            title: data.actionItem.title,
            priority: data.actionItem.priority,
            status: data.actionItem.status,
          });
        }
      }

      const remainingSuggested = thought.suggestedTasks?.filter((s) => !selected.includes(s.title)) || [];

      setThoughtsList((prev) =>
        prev.map((t) => {
          if (t.id === thought.id) {
            return {
              ...t,
              suggestedTasks: remainingSuggested,
              actionItems: [...(t.actionItems || []), ...createdTasks],
            };
          }
          return t;
        })
      );

      await fetch(`/api/thoughts/${thought.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestedTasks: remainingSuggested,
        }),
      });

      setSelectedSuggestedTasks((prev) => ({
        ...prev,
        [thought.id]: [],
      }));
    } catch (err) {
      console.error('Failed to promote suggested tasks:', err);
    } finally {
      setIsPromotingSuggested(null);
    }
  };

  const handleToggleSuggestedDecisionCheck = (thoughtId: string, decisionTitle: string) => {
    setSelectedSuggestedDecisions((prev) => {
      const currentSelected = prev[thoughtId] || [];
      const isSelected = currentSelected.includes(decisionTitle);
      const nextSelected = isSelected
        ? currentSelected.filter((t) => t !== decisionTitle)
        : [...currentSelected, decisionTitle];
      return {
        ...prev,
        [thoughtId]: nextSelected,
      };
    });
  };

  const handlePromoteSuggestedDecisions = async (thought: Thought) => {
    const selected = selectedSuggestedDecisions[thought.id] || [];
    if (selected.length === 0) return;

    setIsPromotingSuggestedDecision(thought.id);
    try {
      const createdDecisions: any[] = [];
      for (const title of selected) {
        const suggested = thought.suggestedDecisions?.find((s) => s.title === title);
        const successMetric = suggested?.successMetric || `AI-suggested outcome metric from thought: "${thought.summary}".`;
        
        const res = await fetch('/api/decisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thoughtId: thought.id,
            title,
            successMetric,
            expectedOutcomeDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // default 7 days
          }),
        });

        if (res.ok) {
          const data = await res.json();
          createdDecisions.push(data.decision);
        }
      }

      const remainingSuggested = thought.suggestedDecisions?.filter((s) => !selected.includes(s.title)) || [];

      setThoughtsList((prev) =>
        prev.map((t) => {
          if (t.id === thought.id) {
            return {
              ...t,
              suggestedDecisions: remainingSuggested,
              decisions: [...(t.decisions || []), ...createdDecisions],
            };
          }
          return t;
        })
      );

      await fetch(`/api/thoughts/${thought.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestedDecisions: remainingSuggested,
        }),
      });

      setSelectedSuggestedDecisions((prev) => ({
        ...prev,
        [thought.id]: [],
      }));
    } catch (err) {
      console.error('Failed to promote suggested decisions:', err);
    } finally {
      setIsPromotingSuggestedDecision(null);
    }
  };

  const toggleExpandThought = (id: string) => {
    setExpandedThoughtId((prev) => (prev === id ? null : id));
  };

  // Thought CRUD Handlers
  const handleDeleteThought = async (id: string) => {
    try {
      const res = await fetch(`/api/thoughts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setThoughtsList((prev) => prev.filter((t) => t.id !== id));
        fetchLoops(); // Reload loops in background
      } else {
        alert('Failed to delete thought.');
      }
    } catch (err) {
      console.error('Error deleting thought:', err);
    }
  };

  const handleStartEdit = (t: Thought) => {
    setEditingThought(t);
    setEditContent(t.content);
    setEditSummary(t.summary);
    setEditCategory(t.category);
    setEditTags(t.tags || []);
    setNewCustomTag('');
  };

  const handleSaveEdit = async () => {
    if (!editingThought) return;
    if (!editSummary.trim() || !editContent.trim()) {
      alert('Content and summary cannot be empty.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/thoughts/${editingThought.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent.trim(),
          summary: editSummary.trim(),
          category: editCategory,
          tags: editTags,
        }),
      });

      if (res.ok) {
        setThoughtsList((prev) =>
          prev.map((t) =>
            t.id === editingThought.id
              ? {
                  ...t,
                  content: editContent.trim(),
                  summary: editSummary.trim(),
                  category: editCategory,
                  tags: editTags,
                }
              : t
          )
        );
        setEditingThought(null);
        fetchLoops(); // Recalculate loops in background
      } else {
        alert('Failed to save changes.');
      }
    } catch (err) {
      console.error('Error saving thought edit:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddTag = () => {
    const tag = newCustomTag.trim().toLowerCase();
    if (tag && !editTags.includes(tag)) {
      setEditTags((prev) => [...prev, tag]);
    }
    setNewCustomTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Get most recent connections for display (limit to 3)
  const recentConnections = thoughtsList
    .flatMap((t) => t.connections.map((c) => ({
      fromId: t.id,
      fromSummary: t.summary,
      toId: c.thoughtId,
      toSummary: c.summary,
      score: c.score,
      key: `${t.id}-${c.thoughtId}`
    })))
    // Deduplicate symmetrical connections
    .filter((v, i, a) => a.findIndex(t => 
      (t.fromId === v.fromId && t.toId === v.toId) || 
      (t.fromId === v.toId && t.toId === v.fromId)
    ) === i)
    .slice(0, 3);

  const paginatedThoughts = thoughtsList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(thoughtsList.length / pageSize) || 1;

  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-glow-indigo">
            Thought Capture & Timeline
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Capture notes, voice memos, ideas and witness them connect organically.
          </p>
        </div>
      </div>

      {/* Capture Section */}
      <div className="glass-panel rounded-2xl p-4 md:p-6 relative overflow-hidden border-zinc-800/80 shadow-xl">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-indigo-500/5 blur-[50px] pointer-events-none" />
        
        <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" /> Capture what you are thinking
        </h2>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleTextSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="I just realized there is an opportunity to build a semantic knowledge graph app..."
              disabled={isProcessing}
              rows={3}
              className="block w-full rounded-xl glass-input p-4 text-sm placeholder-zinc-600 focus:ring-1 focus:ring-indigo-500 text-white resize-none"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {inputText.trim() && (
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center pt-2">
            <VoiceRecorder onRecordingComplete={handleAudioSubmit} isProcessing={isProcessing} />
          </div>
        </form>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Recurring Loops Card */}
        <div className="glass-panel rounded-2xl p-6 lg:col-span-12 flex flex-col justify-between border-zinc-800/80 shadow-md min-w-0 overflow-hidden">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-md font-bold text-zinc-200 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" /> Cognitive Loop Patterns
              </h2>
              <button
                onClick={handleRecalculateLoops}
                disabled={isRecalculatingLoops || loadingLoops || thoughtsList.length < 3}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {isRecalculatingLoops ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Recalculate Loops
                  </>
                )}
              </button>
            </div>

            {loadingLoops ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-600 mb-2" />
                <span className="text-xs text-zinc-500">Checking for thinking patterns...</span>
              </div>
            ) : loopsList.length === 0 ? (
              <div className="py-6 px-4 rounded-xl border border-dashed border-zinc-800 text-center">
                <p className="text-zinc-500 text-xs">
                  {thoughtsList.length < 3
                    ? 'Capture at least 3 thoughts so the loop engine can detect recurring cycles.'
                    : 'No cognitive loops detected. Keep logging thoughts to identify themes.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {loopsList.map((l) => (
                  <div key={l.id} className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-900 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-indigo-300">{l.theme}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                        {l.thoughtIds.length} references
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs leading-relaxed">{personalizeDescription(l.description)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Filter and Search Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs placeholder-zinc-600 focus:ring-1 focus:ring-indigo-500 text-white"
              placeholder="Search thoughts, summaries or tags..."
            />
          </div>

          {/* Category Filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none shrink-0">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedCategory(c.value)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === c.value
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500 px-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Timeline</span>
            <span className="text-zinc-600">•</span>
            <span>{thoughtsList.length} entries found</span>
          </div>

          {loadingThoughts && thoughtsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
              <span className="text-zinc-500 text-sm">Synchronizing timeline...</span>
            </div>
          ) : thoughtsList.length === 0 ? (
            <div className="py-20 text-center glass-panel border-dashed rounded-2xl p-8 border-zinc-800">
              <Brain className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-zinc-300">Your second brain is empty</h3>
              <p className="text-zinc-500 text-xs max-w-sm mx-auto mt-1">
                Start capturing ideas using the text box above or click the voice button to record notes.
              </p>
            </div>
          ) : (
            <div className="relative border-l border-zinc-900 pl-4 md:pl-6 ml-2 space-y-6">
              {paginatedThoughts.map((t) => {
                const isExpanded = expandedThoughtId === t.id;
                return (
                  <div key={t.id} className="relative group">
                    {/* Time indicator bullet */}
                    <div className="absolute -left-[21px] md:-left-[29px] top-4 w-3.5 h-3.5 rounded-full bg-[#050409] border border-zinc-800 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 group-hover:bg-indigo-400 transition-colors" />
                    </div>

                    {/* Thought Card */}
                    <div 
                      onClick={() => toggleExpandThought(t.id)}
                      className={`glass-panel glass-panel-hover rounded-xl p-4 transition-all duration-300 border-zinc-900/80 cursor-pointer ${
                        isExpanded ? 'bg-zinc-950/20 border-zinc-800/80 shadow-lg' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                        {/* Meta: date & category & tags */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold tracking-wide ${getCategoryColor(t.category)}`}>
                            {t.category}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          {t.tags && t.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pl-2 border-l border-zinc-800">
                              {t.tags.map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/60 text-zinc-400 border border-zinc-800/40 font-medium">
                                  <Tag className="w-2.5 h-2.5" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Sentiment indicator & Actions */}
                        <div className="flex items-center gap-3 justify-between sm:justify-end w-full sm:w-auto border-t border-zinc-900/40 sm:border-0 pt-2 sm:pt-0">
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            <span className={`w-2 h-2 rounded-full ${getSentimentColor(t.sentiment)}`} />
                            <span>{t.sentiment} sentiment</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(t);
                              }}
                              className="p-1 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-900/60 rounded-lg transition-colors cursor-pointer"
                              title="Edit Thought"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteThoughtId(t.id);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900/60 rounded-lg transition-colors cursor-pointer"
                              title="Delete Thought"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-zinc-200 text-sm font-semibold leading-relaxed">
                          {t.summary}
                        </p>
                        <button className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-zinc-900/60 space-y-4 cursor-default" onClick={(e) => e.stopPropagation()}>
                          {/* Original Content */}
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                              My original thought
                            </span>
                            <p className="text-zinc-300 text-xs leading-relaxed bg-black/20 p-3 rounded-lg border border-zinc-900/80 white-space-pre-wrap select-text">
                              {t.content}
                            </p>
                          </div>

                          {/* JARVIS Proactive Insight */}
                          {t.jarvisInsight && (
                            <div className="bg-indigo-955/10 border border-indigo-500/20 rounded-lg p-3.5 relative overflow-hidden group/jarvis">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-xl rounded-full pointer-events-none" />
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                                  Jarvis Proactive insight
                                </span>
                              </div>
                              <p className="text-zinc-200 text-xs leading-relaxed italic select-text">
                                "{t.jarvisInsight}"
                              </p>
                            </div>
                          )}                          {/* Associated Decisions List Section */}
                          <div className="space-y-3 mt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider flex items-center gap-1.5">
                                <GitMerge className="w-3.5 h-3.5" /> Current decisions for this thought
                              </span>
                              <Link 
                                href="/dashboard/decisions" 
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-zinc-505 hover:text-fuchsia-400 transition-colors flex items-center gap-0.5 font-bold cursor-pointer"
                              >
                                Go to Decisions Ledger <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            </div>                            {t.decisions && t.decisions.length > 0 ? (
                              <div className="space-y-1.5">
                                {t.decisions.map((dec: any) => (
                                  <div 
                                    key={dec.id}
                                    className="flex flex-col gap-1.5 bg-zinc-900/30 border border-zinc-900 p-2.5 rounded-lg hover:border-zinc-800 transition-all text-xs"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="truncate font-semibold text-zinc-200">
                                        👉 {dec.title}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase shrink-0 ${
                                        dec.status === 'pending'
                                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                          : dec.status === 'success'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                      }`}>
                                        {dec.status}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 pl-4 space-y-0.5">
                                      <p>Expectation: <span className="text-zinc-300 italic">"{dec.successMetric}"</span></p>
                                      {dec.outcomeNotes && (
                                        <p className="text-zinc-500">Journal: {dec.outcomeNotes}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-zinc-600 text-xs italic pl-1">No tracked decisions for this thought</p>
                            )}

                            {/* Create Decision Tracker Block - Always Available (like Quick Add Action Item) */}
                            <div className="bg-zinc-900/10 border border-zinc-900 rounded-xl p-3.5 space-y-3 mt-2" onClick={(e) => e.stopPropagation()}>
                              {trackingThoughtId !== t.id ? (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block">
                                      ⚡ Track New Decision
                                    </span>
                                    <p className="text-zinc-505 text-[10px] leading-relaxed mt-0.5">
                                      Log custom success criteria and expected dates to track outcome accuracy.
                                    </p>
                                  </div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleStartTrack(t); }}
                                    className="text-[10px] px-3.5 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold transition-all shadow-md shadow-fuchsia-500/10 cursor-pointer shrink-0"
                                  >
                                    Track Decision
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider block">
                                    Configure Decision Tracker
                                  </span>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-[9px] text-zinc-505 font-bold uppercase tracking-wider block mb-1">
                                        Decision Title / Note (What is the commitment?)
                                      </label>
                                      <textarea 
                                        placeholder="E.g. Switch platform frontend to Next.js..."
                                        value={decisionTitle}
                                        onChange={(e) => setDecisionTitle(e.target.value)}
                                        rows={2}
                                        className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-zinc-505 font-bold uppercase tracking-wider block mb-1.5 flex justify-between items-center">
                                        <span>Expected Outcome Review Date</span>
                                        <span className="text-[8px] text-zinc-650 font-normal">Timeline presets:</span>
                                      </label>
                                      
                                      {/* Preset Timeline Buttons */}
                                      <div className="flex gap-2 mb-2">
                                        {[
                                          { label: '7 Days', days: 7 },
                                          { label: '30 Days', days: 30 },
                                          { label: '90 Days', days: 90 },
                                        ].map((preset) => {
                                          const targetDate = new Date();
                                          targetDate.setDate(targetDate.getDate() + preset.days);
                                          const isSelected = expectedOutcomeDate === targetDate.toISOString().split('T')[0];
                                          return (
                                            <button
                                              key={preset.label}
                                              type="button"
                                              onClick={() => {
                                                const d = new Date();
                                                d.setDate(d.getDate() + preset.days);
                                                setExpectedOutcomeDate(d.toISOString().split('T')[0]);
                                              }}
                                              className={`flex-1 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                                                isSelected
                                                  ? 'bg-fuchsia-600/20 border-fuchsia-500/40 text-fuchsia-300'
                                                  : 'bg-zinc-950 border-zinc-900 text-zinc-505 hover:text-zinc-350'
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
                                          value={expectedOutcomeDate}
                                          onChange={(e) => setExpectedOutcomeDate(e.target.value)}
                                          onClick={(e) => {
                                            try {
                                              (e.target as any).showPicker();
                                            } catch (err) {}
                                          }}
                                          className="w-full text-xs px-3 py-2 pr-9 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500 select-none cursor-pointer"
                                        />
                                        <Calendar className="w-3.5 h-3.5 text-zinc-550 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-zinc-505 font-bold uppercase tracking-wider block mb-1">
                                        Success Metric (What does success look like?)
                                      </label>
                                      <textarea 
                                        placeholder="E.g. Conversion rate increases by 5%, or page loads in under 300ms..."
                                        value={successMetric}
                                        onChange={(e) => setSuccessMetric(e.target.value)}
                                        rows={2}
                                        className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-955 border border-zinc-800 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={handleCancelTrack}
                                        className="text-[10px] px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-405 hover:text-white transition-all cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button 
                                        onClick={() => handleSaveTrack(t.id)}
                                        disabled={isSubmittingDecision}
                                        className="text-[10px] px-3 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        {isSubmittingDecision && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Activate Tracker
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Associated Action Items */}
                          <div className="space-y-3 mt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckSquare className="w-3.5 h-3.5" /> Current action items for this thought
                              </span>
                              <Link 
                                href="/dashboard/actions" 
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-zinc-505 hover:text-indigo-404 transition-colors flex items-center gap-0.5 font-bold cursor-pointer"
                              >
                                Go to Action Center <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            </div>

                            {t.actionItems && t.actionItems.length > 0 ? (
                              <div className="space-y-1.5">
                                {t.actionItems.map((action) => {
                                  const getPriorityStyle = (p: string) => {
                                    switch (p) {
                                      case 'high': return 'text-rose-455 bg-rose-500/10 border-rose-500/20';
                                      case 'medium': return 'text-amber-455 bg-amber-500/10 border-amber-500/20';
                                      default: return 'text-emerald-455 bg-emerald-500/10 border-emerald-500/20';
                                    }
                                  };
                                  
                                  return (
                                    <div 
                                      key={action.id}
                                      className="flex items-center justify-between bg-zinc-900/30 border border-zinc-900 p-2.5 rounded-lg hover:border-zinc-805 transition-all text-xs"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 pr-4">
                                        {action.status === 'completed' && (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-450 shrink-0" />
                                        )}
                                        <span className={`truncate font-semibold ${action.status === 'completed' ? 'line-through text-zinc-505' : 'text-zinc-200'}`}>
                                          {action.title}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase shrink-0 ${getPriorityStyle(action.priority)}`}>
                                          {action.priority}
                                        </span>
                                        <Link 
                                          href="/dashboard/actions" 
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-1 text-zinc-505 hover:text-white rounded transition-colors"
                                          title="View in Action Center"
                                        >
                                          <ArrowUpRight className="w-3.5 h-3.5" />
                                        </Link>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-zinc-600 text-xs italic pl-1">No available tasks</p>
                            )}

                            {/* Create Action Item from Thought Block */}
                            <div className="bg-zinc-900/10 border border-zinc-900 rounded-xl p-3.5 space-y-3 mt-2" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block">
                                ⚡ Quick Add Action Item
                              </span>
                              <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  placeholder="Task title for this thought..."
                                  value={expandedThoughtId === t.id ? thoughtTaskTitle : ''}
                                  onChange={(e) => {
                                    setExpandedThoughtId(t.id);
                                    setThoughtTaskTitle(e.target.value);
                                  }}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                                />
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedThoughtId(t.id);
                                        setCreateTaskPriorityOpen(!createTaskPriorityOpen);
                                      }}
                                      className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-between capitalize"
                                    >
                                      <span>{thoughtTaskPriority} Priority</span>
                                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                                    </button>
                                    {createTaskPriorityOpen && expandedThoughtId === t.id && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={() => setCreateTaskPriorityOpen(false)} />
                                        <div className="absolute left-0 bottom-full mb-1.5 z-50 w-full bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl py-1 animate-fadeIn">
                                          {['low', 'medium', 'high'].map((pri) => (
                                            <button
                                              key={pri}
                                              type="button"
                                              onClick={() => {
                                                setThoughtTaskPriority(pri as any);
                                                setCreateTaskPriorityOpen(false);
                                              }}
                                              className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer block capitalize ${
                                                pri === thoughtTaskPriority
                                                  ? 'bg-indigo-650/15 text-indigo-305 font-bold'
                                                  : 'text-zinc-400 hover:bg-zinc-905 hover:text-white'
                                              }`}
                                            >
                                              {pri}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleCreateActionItemForThought(t.id, t.category)}
                                    disabled={isCreatingThoughtTask === t.id || !thoughtTaskTitle.trim()}
                                    className="h-8 px-4 bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5"
                                  >
                                    {isCreatingThoughtTask === t.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Add Task
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Jarvis Curated Tasks */}
                          {t.suggestedTasks && t.suggestedTasks.length > 0 && (
                            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Jarvis Curated tasks
                                </span>
                                {(selectedSuggestedTasks[t.id] || []).length > 0 && (
                                  <button
                                    onClick={() => handlePromoteSuggestedTasks(t)}
                                    disabled={isPromotingSuggested === t.id}
                                    className="text-[10px] px-3 py-1 rounded bg-indigo-650 hover:bg-indigo-600 text-white font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    {isPromotingSuggested === t.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Plus className="w-3 h-3" />
                                    )}
                                    Add Tasks ({(selectedSuggestedTasks[t.id] || []).length})
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {t.suggestedTasks.map((s, idx) => {
                                  const isChecked = (selectedSuggestedTasks[t.id] || []).includes(s.title);
                                  const getPriorityStyle = (p: string) => {
                                    switch (p) {
                                      case 'high': return 'text-rose-455 bg-rose-500/10 border-rose-500/20';
                                      case 'medium': return 'text-amber-455 bg-amber-500/10 border-amber-500/20';
                                      default: return 'text-emerald-455 bg-emerald-500/10 border-emerald-500/20';
                                    }
                                  };

                                  return (
                                    <div
                                      key={`${s.title}-${idx}`}
                                      onClick={() => handleToggleSuggestedTaskCheck(t.id, s.title)}
                                      className={`flex items-start gap-2.5 p-3 rounded-lg border bg-zinc-900/10 transition-all cursor-pointer select-none hover:bg-zinc-900/30 ${
                                        isChecked 
                                          ? 'border-indigo-500/30 bg-indigo-950/5' 
                                          : 'border-zinc-900/85 hover:border-zinc-800'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}} // Handled by outer div click
                                        className="mt-1 h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-zinc-200 text-xs font-semibold leading-relaxed truncate">{s.title}</p>
                                          {s.priority && (
                                            <span className={`px-1.5 py-0.2 rounded text-[7px] font-extrabold border uppercase shrink-0 ${getPriorityStyle(s.priority)}`}>
                                              {s.priority}
                                            </span>
                                          )}
                                        </div>
                                        {s.description && (
                                          <p className="text-[10px] text-zinc-500 leading-normal mt-0.5">{s.description}</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Jarvis Curated Decisions */}
                          {t.suggestedDecisions && t.suggestedDecisions.length > 0 && (
                            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Jarvis Curated Decisions
                                </span>
                                {(selectedSuggestedDecisions[t.id] || []).length > 0 && (
                                  <button
                                    onClick={() => handlePromoteSuggestedDecisions(t)}
                                    disabled={isPromotingSuggestedDecision === t.id}
                                    className="text-[10px] px-3 py-1 rounded bg-indigo-650 hover:bg-indigo-600 text-white font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    {isPromotingSuggestedDecision === t.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Plus className="w-3 h-3" />
                                    )}
                                    Track Decisions ({(selectedSuggestedDecisions[t.id] || []).length})
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {t.suggestedDecisions.map((s, idx) => {
                                  const isChecked = (selectedSuggestedDecisions[t.id] || []).includes(s.title);

                                  return (
                                    <div
                                      key={`${s.title}-${idx}`}
                                      onClick={() => handleToggleSuggestedDecisionCheck(t.id, s.title)}
                                      className={`flex items-start gap-2.5 p-3 rounded-lg border bg-zinc-900/10 transition-all cursor-pointer select-none hover:bg-zinc-900/30 ${
                                        isChecked 
                                          ? 'border-indigo-500/30 bg-indigo-950/5' 
                                          : 'border-zinc-900/85 hover:border-zinc-800'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}} // Handled by outer div click
                                        className="mt-1 h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-zinc-200 text-xs font-semibold leading-relaxed">{s.title}</p>
                                        {s.successMetric && (
                                          <div className="mt-1.5 p-2 bg-black/20 rounded-md border border-zinc-900/40 text-[10px] text-zinc-400 italic">
                                            <span className="font-bold text-[8px] text-zinc-500 uppercase block tracking-wider mb-0.5">Success Metric</span>
                                            "{s.successMetric}"
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Tags */}
                          {t.tags && t.tags.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                                Tags
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {t.tags.map((tag) => (
                                  <span key={tag} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                                    <Tag className="w-2.5 h-2.5" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Connected Thoughts */}
                          {t.connections && t.connections.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-wider block mb-2">
                                Organic Mind Connections
                              </span>
                              <div className="space-y-2">
                                {t.connections.map((c) => (
                                  <div 
                                    key={c.relationshipId}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandThought(c.thoughtId);
                                    }}
                                    className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-955/5 hover:bg-indigo-955/15 border border-indigo-955/20 hover:border-indigo-500/20 cursor-pointer transition-all text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 pr-4">
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${getCategoryColor(c.category)}`}>
                                        {c.category}
                                      </span>
                                      <p className="text-zinc-300 truncate font-medium">{c.summary}</p>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1">
                                      <span className="font-bold text-indigo-400 font-mono text-[10px]">
                                        {(c.score * 100).toFixed(0)}%
                                      </span>
                                      <span className="text-[9px] text-zinc-500">match</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Thought Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-900 px-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 hover:text-white disabled:opacity-20 transition-all cursor-pointer font-bold"
              >
                ‹ Previous
              </button>
              <span className="text-xs text-zinc-500 font-medium">
                Page {currentPage} of {totalPages} ({thoughtsList.length} entries)
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 hover:text-white disabled:opacity-20 transition-all cursor-pointer font-bold"
              >
                Next ›
              </button>
            </div>
          )}

          {/* Edit Thought Modal */}
          {editingThought && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingThought(null)} />
              
              <div className="relative w-full max-w-lg bg-[#0d0c15] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto z-10">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-indigo-400" /> Edit Entry
                  </h3>
                  <button 
                    onClick={() => setEditingThought(null)}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Category */}
                  <div className="relative">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                      Category
                    </label>
                    
                    <button
                      type="button"
                      onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-left flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium text-xs">{editCategory || 'Select category'}</span>
                      <svg className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {categoryDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setCategoryDropdownOpen(false)} />
                        <div className="absolute left-0 top-full mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-md max-h-48 overflow-y-auto">
                          {getCustomCategories().map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setEditCategory(cat);
                                setCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer block ${
                                cat === editCategory 
                                  ? 'bg-indigo-600/20 text-indigo-300 font-bold' 
                                  : 'text-zinc-400 hover:bg-zinc-905 hover:text-white'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Summary */}
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                      Summary (Timeline view title)
                    </label>
                    <input
                      type="text"
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                      Content Detail
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  {/* Custom Tags management */}
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                      Custom Tags & Labels
                    </label>
                    
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Add new custom tag..."
                        value={newCustomTag}
                        onChange={(e) => setNewCustomTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-zinc-900 rounded-lg bg-black/20">
                      {editTags.length === 0 ? (
                        <span className="text-zinc-600 text-[10px] italic p-1">No custom tags added yet.</span>
                      ) : (
                        editTags.map((tag) => (
                          <span 
                            key={tag} 
                            className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800"
                          >
                            <span>#{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="text-zinc-500 hover:text-rose-400 font-bold text-xs"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-900">
                  <button
                    onClick={() => setEditingThought(null)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    className="px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-lg shadow-indigo-500/10 cursor-pointer"
                  >
                    {isSavingEdit && <Loader2 className="w-3 h-3 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Thought Confirmation Warning dialog */}
          {showDeleteConfirm && deleteThoughtId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowDeleteConfirm(false); setDeleteThoughtId(null); }} />
              
              <div className="relative w-full max-w-md bg-[#0d0c15] border border-red-500/15 rounded-2xl p-6 shadow-2xl space-y-4 z-10">
                <div className="flex items-center gap-3 text-red-400 border-b border-zinc-900 pb-3">
                  <AlertCircle className="w-6 h-6 animate-pulse" />
                  <h3 className="text-md font-bold text-white">Delete Entry Confirmation</h3>
                </div>
                
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Are you absolutely sure you want to delete this thought? Any connections mapped to this entry will be removed permanently. This action cannot be undone.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteThoughtId(null); }}
                    className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (deleteThoughtId) {
                        await handleDeleteThought(deleteThoughtId);
                        setShowDeleteConfirm(false);
                        setDeleteThoughtId(null);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-red-650 hover:bg-red-600 active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-red-500/10 cursor-pointer"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
