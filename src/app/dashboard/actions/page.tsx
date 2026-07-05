'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Circle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  Plus,
  Loader2,
  Sparkles,
  XCircle,
  Filter,
  BarChart3,
  Trash2,
  Play,
  X,
  AlertCircle,
} from 'lucide-react';

interface ActionItem {
  id: string;
  thoughtId: string;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  dueDate: number | null;
  completedAt: number | null;
  createdAt: number;
  thoughtSummary?: string;
}

export default function ActionsPage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/action-items');
      if (res.ok) {
        const data = await res.json();
        setItems(data.actionItems || []);
      }
    } catch (err) {
      console.error('Failed to fetch action items:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (id: string, updates: Partial<ActionItem>) => {
    setUpdatingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/action-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        // Update local state
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            const updated = { ...item, ...updates };
            if (updates.status === 'completed') updated.completedAt = Date.now();
            if (updates.status && updates.status !== 'completed') updated.completedAt = null;
            return updated;
          })
        );
      }
    } catch (err) {
      console.error('Failed to update action item:', err);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/action-items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete action item:', err);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId) deleteItem(deleteTargetId);
  };

  // Filter logic
  const filteredItems = items.filter((item) => {
    if (filterStatus === 'active' && (item.status === 'completed' || item.status === 'dismissed')) return false;
    if (filterStatus === 'completed' && item.status !== 'completed') return false;
    if (filterStatus === 'dismissed' && item.status !== 'dismissed') return false;
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
    return true;
  });

  // Stats
  const totalActive = items.filter((i) => i.status === 'pending' || i.status === 'in_progress').length;
  const totalCompleted = items.filter((i) => i.status === 'completed').length;
  const totalHigh = items.filter((i) => i.priority === 'high' && i.status !== 'completed' && i.status !== 'dismissed').length;
  const overdue = items.filter((i) => i.dueDate && i.dueDate < Date.now() && i.status !== 'completed' && i.status !== 'dismissed').length;

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <ArrowUpCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'medium': return <ArrowRightCircle className="w-3.5 h-3.5 text-amber-400" />;
      case 'low': return <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Circle className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'low': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Circle className="w-4 h-4 text-zinc-500" />;
      case 'in_progress': return <Play className="w-4 h-4 text-indigo-400" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'dismissed': return <XCircle className="w-4 h-4 text-zinc-600" />;
      default: return <Circle className="w-4 h-4 text-zinc-500" />;
    }
  };

  const cycleStatus = (currentStatus: string): ActionItem['status'] => {
    switch (currentStatus) {
      case 'pending': return 'in_progress';
      case 'in_progress': return 'completed';
      case 'completed': return 'pending';
      case 'dismissed': return 'pending';
      default: return 'pending';
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysUntilDue = (dueDate: number) => {
    const diff = dueDate - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white text-glow-indigo">
          Action Center
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          JARVIS-extracted tasks from your thoughts. Every idea becomes an actionable step.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Tasks', value: totalActive, icon: CheckSquare, color: 'text-indigo-400', bgGlow: 'bg-indigo-500/5' },
          { label: 'Completed', value: totalCompleted, icon: CheckCircle2, color: 'text-emerald-400', bgGlow: 'bg-emerald-500/5' },
          { label: 'High Priority', value: totalHigh, icon: AlertTriangle, color: 'text-rose-400', bgGlow: 'bg-rose-500/5' },
          { label: 'Overdue', value: overdue, icon: Clock, color: overdue > 0 ? 'text-amber-400' : 'text-zinc-600', bgGlow: overdue > 0 ? 'bg-amber-500/5' : 'bg-zinc-500/5' },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel rounded-xl p-4 border border-zinc-800/80 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-[80px] h-[80px] rounded-full ${stat.bgGlow} blur-[30px] pointer-events-none`} />
            <div className="flex items-center gap-3 relative">
              <div className={`w-10 h-10 rounded-lg bg-zinc-900/50 border border-zinc-800 flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="space-y-4">
        {/* Status Filter */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs px-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Status filter:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {['active', 'completed', 'dismissed', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer capitalize whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-indigo-600/25 border-indigo-500/40 text-indigo-300 shadow-sm'
                    : 'bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:text-zinc-350'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs px-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Priority filter:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {['all', 'high', 'medium', 'low'].map((priority) => (
              <button
                key={priority}
                onClick={() => setFilterPriority(priority)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer capitalize whitespace-nowrap ${
                  filterPriority === priority
                    ? 'bg-indigo-600/25 border-indigo-500/40 text-indigo-300 shadow-sm'
                    : 'bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:text-zinc-350'
                }`}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Items List */}
      {filteredItems.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-zinc-800/80 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <CheckSquare className="w-8 h-8" />
          </div>
          <h3 className="text-md font-bold text-zinc-200 mb-2">
            {filterStatus === 'active' ? 'All clear!' : 'No items found'}
          </h3>
          <p className="text-zinc-500 text-xs max-w-sm mx-auto leading-relaxed">
            {filterStatus === 'active'
              ? 'No active action items. Log new thoughts and JARVIS will automatically extract tasks for you.'
              : 'No items match the current filters. Try adjusting your filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isUpdating = updatingIds.has(item.id);
            const isOverdue = item.dueDate && item.dueDate < Date.now() && item.status !== 'completed' && item.status !== 'dismissed';
            const daysLeft = item.dueDate ? getDaysUntilDue(item.dueDate) : null;

            return (
              <div
                key={item.id}
                className={`glass-panel rounded-xl border p-4 transition-all group ${
                  item.status === 'completed'
                    ? 'border-emerald-500/10 bg-emerald-950/5'
                    : item.status === 'dismissed'
                    ? 'border-zinc-800/50 opacity-60'
                    : isOverdue
                    ? 'border-amber-500/20 bg-amber-950/5'
                    : 'border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Status Toggle */}
                  <button
                    onClick={() => updateItem(item.id, { status: cycleStatus(item.status) })}
                    disabled={isUpdating}
                    className="mt-0.5 cursor-pointer hover:scale-110 transition-transform disabled:opacity-50"
                    title={`Status: ${item.status}. Click to cycle.`}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    ) : (
                      getStatusIcon(item.status)
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`text-sm font-semibold ${
                        item.status === 'completed' ? 'text-zinc-500 line-through' : 'text-white'
                      }`}>
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Priority Badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getPriorityBadge(item.priority)}`}>
                          {getPriorityIcon(item.priority)}
                          {item.priority}
                        </span>
                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-zinc-400 text-xs leading-relaxed">{item.description}</p>
                    )}

                    {/* Meta Row */}
                    <div className="flex flex-wrap items-center gap-3 text-[10px]">
                      {/* Source Thought */}
                      {item.thoughtSummary && (
                        <span className="inline-flex items-center gap-1 text-zinc-500">
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span className="max-w-[200px] truncate">{item.thoughtSummary}</span>
                        </span>
                      )}

                      {/* Due Date */}
                      {item.dueDate && (
                        <span className={`inline-flex items-center gap-1 font-medium ${
                          isOverdue ? 'text-amber-400' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-400/70' : 'text-zinc-500'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {isOverdue
                            ? `Overdue by ${Math.abs(daysLeft!)} days`
                            : `Due ${formatDate(item.dueDate)}${daysLeft !== null ? ` (${daysLeft}d)` : ''}`}
                        </span>
                      )}

                      {/* Created */}
                      <span className="text-zinc-600">
                        Created {formatDate(item.createdAt)}
                      </span>

                      {/* Completed Date */}
                      {item.completedAt && (
                        <span className="text-emerald-500/70 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Done {formatDate(item.completedAt)}
                        </span>
                      )}
                    </div>

                    {/* Quick Actions — always visible on mobile, hover-reveal on desktop */}
                    {item.status !== 'completed' && item.status !== 'dismissed' && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => updateItem(item.id, { status: 'in_progress' })}
                            disabled={isUpdating}
                            className="text-[10px] px-2 py-1 rounded border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer"
                          >
                            Start Working
                          </button>
                        )}
                        <button
                          onClick={() => updateItem(item.id, { status: 'completed' })}
                          disabled={isUpdating}
                          className="text-[10px] px-2 py-1 rounded border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => updateItem(item.id, { status: 'dismissed' })}
                          disabled={isUpdating}
                          className="text-[10px] px-2 py-1 rounded border border-zinc-700 text-zinc-500 hover:bg-zinc-800/50 transition-all cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-sm w-full rounded-2xl border-zinc-800 p-6 space-y-6 shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-950/20 text-red-500 border border-red-900/35 rounded-xl shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-md font-bold text-white leading-tight">Delete Task?</h3>
                <p className="text-xs text-zinc-450 leading-relaxed">
                  Are you sure you want to delete this action item? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 text-xs">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }}
                className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 rounded-xl font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-red-500/20 cursor-pointer"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

