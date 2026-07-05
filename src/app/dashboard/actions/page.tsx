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
  Tag,
  Square,
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
  category?: string | null;
}

export default function ActionsPage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Selection/Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Manual Creation States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPriority, setCreatePriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [createCategory, setCreateCategory] = useState('Work');
  const [createDueDate, setCreateDueDate] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Manual Editing States
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editCategory, setEditCategory] = useState('Work');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'in_progress' | 'completed' | 'dismissed'>('pending');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  // Selection & Bulk Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleBulkStatus = async (newStatus: 'pending' | 'in_progress' | 'completed' | 'dismissed') => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/action-items/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );
      await fetchItems();
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed bulk status update:', err);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkCategory = async (cat: string) => {
    if (selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/action-items/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: cat }),
          })
        )
      );
      await fetchItems();
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed bulk category update:', err);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected tasks?`)) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/action-items/${id}`, { method: 'DELETE' })
        )
      );
      await fetchItems();
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed bulk delete:', err);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Manual CRUD Handlers
  const handleCreateTask = async () => {
    if (!createTitle.trim()) {
      alert('Title is required');
      return;
    }
    setIsCreatingTask(true);
    try {
      const res = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDesc.trim(),
          priority: createPriority,
          category: createCategory,
          dueDate: createDueDate ? new Date(createDueDate).getTime() : null,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setCreateTitle('');
        setCreateDesc('');
        setCreatePriority('medium');
        setCreateCategory('Work');
        setCreateDueDate('');
        await fetchItems();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create task');
      }
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleStartEdit = (item: ActionItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDesc(item.description || '');
    setEditPriority(item.priority);
    setEditCategory(item.category || 'Work');
    setEditDueDate(item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '');
    setEditStatus(item.status);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editTitle.trim()) {
      alert('Title is required');
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/action-items/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          priority: editPriority,
          category: editCategory,
          dueDate: editDueDate ? new Date(editDueDate).getTime() : null,
          status: editStatus,
        }),
      });
      if (res.ok) {
        setEditingItem(null);
        await fetchItems();
      } else {
        alert('Failed to save changes');
      }
    } catch (err) {
      console.error('Error editing task:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filter logic
  const filteredItems = items.filter((item) => {
    if (filterStatus === 'active' && (item.status === 'completed' || item.status === 'dismissed')) return false;
    if (filterStatus === 'completed' && item.status !== 'completed') return false;
    if (filterStatus === 'dismissed' && item.status !== 'dismissed') return false;
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
    if (filterCategory !== 'all' && (item.category || 'Work') !== filterCategory) return false;
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
    <div className="max-w-5xl mx-auto space-y-8 select-none">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white text-glow-indigo">
            Action Center
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            JARVIS-extracted tasks from your thoughts. Every idea becomes an actionable step.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
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

      {/* Filter and controls header bar */}
      <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full">
            {/* Status Filter */}
            <div className="space-y-1.5 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-zinc-505 text-xs px-1">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase tracking-wider text-[9px] text-zinc-500">Status</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {['active', 'completed', 'dismissed', 'all'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer capitalize whitespace-nowrap ${
                      filterStatus === status
                        ? 'bg-indigo-650/15 border-indigo-500/30 text-indigo-300'
                        : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-1.5 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-zinc-505 text-xs px-1">
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase tracking-wider text-[9px] text-zinc-500">Priority</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {['all', 'high', 'medium', 'low'].map((priority) => (
                  <button
                    key={priority}
                    onClick={() => setFilterPriority(priority)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer capitalize whitespace-nowrap ${
                      filterPriority === priority
                        ? 'bg-indigo-650/15 border-indigo-500/30 text-indigo-300'
                        : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-zinc-505 text-xs px-1">
                <Tag className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase tracking-wider text-[9px] text-zinc-500">Category</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {['all', 'Work', 'Personal', 'Fitness', 'Finance', 'Ideas', 'Others'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer capitalize whitespace-nowrap ${
                      filterCategory === cat
                        ? 'bg-indigo-650/15 border-indigo-500/30 text-indigo-300'
                        : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedIds.size > 0 && (
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fadeIn">
            <span className="text-xs text-indigo-300 font-semibold">
              {selectedIds.size} tasks selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatus(e.target.value as any);
                    e.target.value = '';
                  }
                }}
                disabled={isBulkUpdating}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="">-- Bulk Update Status --</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="dismissed">Dismissed</option>
              </select>

              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkCategory(e.target.value);
                    e.target.value = '';
                  }
                }}
                disabled={isBulkUpdating}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="">-- Bulk Update Category --</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Fitness">Fitness</option>
                <option value="Finance">Finance</option>
                <option value="Ideas">Ideas</option>
                <option value="Others">Others</option>
              </select>

              <button
                onClick={handleBulkDelete}
                disabled={isBulkUpdating}
                className="px-3 py-1 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            </div>
          </div>
        )}
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
          <div className="flex justify-between items-center px-1 text-[10px] text-zinc-500">
            <button 
              onClick={handleToggleSelectAll}
              className="hover:text-zinc-350 cursor-pointer font-bold"
            >
              {selectedIds.size === filteredItems.length ? 'Deselect All' : 'Select All on Page'}
            </button>
            <span>Showing {filteredItems.length} entries</span>
          </div>

          {filteredItems.map((item) => {
            const isUpdating = updatingIds.has(item.id);
            const isOverdue = item.dueDate && item.dueDate < Date.now() && item.status !== 'completed' && item.status !== 'dismissed';
            const daysLeft = item.dueDate ? getDaysUntilDue(item.dueDate) : null;
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`glass-panel rounded-xl border p-4 transition-all group ${
                  item.status === 'completed'
                    ? 'border-emerald-500/10 bg-emerald-950/5'
                    : item.status === 'dismissed'
                    ? 'border-zinc-800/50 opacity-60'
                    : isOverdue
                    ? 'border-amber-500/25 bg-amber-950/5'
                    : 'border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Bulk Select Checkbox */}
                  <button
                    onClick={() => handleToggleSelect(item.id)}
                    className="mt-1 cursor-pointer shrink-0 text-zinc-600 hover:text-indigo-400 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-700" />
                    )}
                  </button>

                  {/* Status Toggle */}
                  <button
                    onClick={() => updateItem(item.id, { status: cycleStatus(item.status) })}
                    disabled={isUpdating}
                    className="mt-1 cursor-pointer hover:scale-110 transition-transform disabled:opacity-50 shrink-0"
                    title={`Status: ${item.status}. Click to cycle.`}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    ) : (
                      getStatusIcon(item.status)
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2 select-text">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`text-sm font-semibold leading-relaxed ${
                        item.status === 'completed' ? 'text-zinc-500 line-through' : 'text-white'
                      }`}>
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0 select-none">
                        {/* Priority Badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border capitalize ${getPriorityBadge(item.priority)}`}>
                          {getPriorityIcon(item.priority)}
                          {item.priority}
                        </span>
                        
                        {/* Edit Button */}
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-zinc-650 hover:text-indigo-400 hover:bg-zinc-900/60 rounded transition-all cursor-pointer"
                          title="Edit manual task"
                        >
                          <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-zinc-650 hover:text-rose-455 hover:bg-zinc-900/60 rounded transition-all cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-zinc-400 text-xs leading-relaxed font-normal">{item.description}</p>
                    )}

                    {/* Meta Row */}
                    <div className="flex flex-wrap items-center gap-3 text-[10px] select-none">
                      {/* Category Label */}
                      <span className="inline-flex items-center gap-1 bg-zinc-900/80 px-2 py-0.5 rounded text-zinc-400 border border-zinc-800">
                        <Tag className="w-2.5 h-2.5 text-zinc-500" />
                        <span>{item.category || 'Work'}</span>
                      </span>

                      {/* Source Thought */}
                      {item.thoughtSummary && (
                        <span className="inline-flex items-center gap-1 text-zinc-500 max-w-[240px] truncate">
                          <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="truncate">{item.thoughtSummary}</span>
                        </span>
                      )}

                      {/* Due Date */}
                      {item.dueDate && (
                        <span className={`inline-flex items-center gap-1 font-medium ${
                          isOverdue ? 'text-amber-450' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-400/80' : 'text-zinc-500'
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Manual Task Modal Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          
          <div className="relative w-full max-w-md bg-[#0d0c15] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-400" /> Create Manual Task
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Category selector */}
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                  Category
                </label>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {['Work', 'Personal', 'Fitness', 'Finance', 'Ideas', 'Others'].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Title input */}
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Description input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Description & Details (Optional)
                  </label>
                  <span className="text-[9px] text-indigo-400 font-bold italic">JARVIS auto-fills summary if left empty!</span>
                </div>
                <textarea
                  placeholder="Detail the steps, context, or guidelines. If left blank, JARVIS will synthesise a helpful reflection for it."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Priority & Due Date side-by-side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                    Priority
                  </label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-900">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={isCreatingTask}
                className="px-4 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-lg shadow-indigo-500/10 cursor-pointer"
              >
                {isCreatingTask && <Loader2 className="w-3 h-3 animate-spin" />}
                Generate Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Manual Task Modal Dialog */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
          
          <div className="relative w-full max-w-md bg-[#0d0c15] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-400" /> Edit Task Entry
              </h3>
              <button 
                onClick={() => setEditingItem(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {['Work', 'Personal', 'Fitness', 'Finance', 'Ideas', 'Others'].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                  Description Details
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Priority & Due Date side-by-side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-900">
              <button
                onClick={() => setEditingItem(null)}
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
                <p className="text-xs text-zinc-455 leading-relaxed">
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

