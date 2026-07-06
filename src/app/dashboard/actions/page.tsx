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
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Edit3,
  BookOpen,
  ListTodo,
  Info
} from 'lucide-react';
import {
  getCustomCategories,
  getCustomPriorities,
  getCustomStatuses,
  PriorityOption,
  StatusOption
} from '@/lib/customSettings';

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
  
  // Custom Settings Lists
  const [categories, setCategories] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<PriorityOption[]>([]);
  const [statuses, setStatuses] = useState<StatusOption[]>([]);

  // Filtering States
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown States for filter rows
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [priorityFilterOpen, setPriorityFilterOpen] = useState(false);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createPriorityOpen, setCreatePriorityOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editPriorityOpen, setEditPriorityOpen] = useState(false);
  const [editStatusOpen, setEditStatusOpen] = useState(false);

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

  // AI Breakdown Detail States
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [breakdownCache, setBreakdownCache] = useState<Record<string, { summary: string; actionPlan: string[]; references: string[]; subTasks: string[] }>>({});
  const [loadingBreakdownId, setLoadingBreakdownId] = useState<string | null>(null);
  const [selectedSubTasks, setSelectedSubTasks] = useState<Record<string, string[]>>({});
  const [promotedSubTasks, setPromotedSubTasks] = useState<Record<string, string[]>>({});
  const [isPromotingSubTasks, setIsPromotingSubTasks] = useState<string | null>(null);

  // Load custom configurations on mount & custom updates
  const loadCustomisations = () => {
    const cats = getCustomCategories();
    setCategories(cats);
    setPriorities(getCustomPriorities());
    setStatuses(getCustomStatuses());
    
    // Set dynamic default category if 'Work' isn't in categories
    if (cats.length > 0 && !cats.includes('Work')) {
      setCreateCategory(cats[0]);
      setEditCategory(cats[0]);
    }
  };

  useEffect(() => {
    fetchItems();
    loadCustomisations();

    const handleUpdate = () => {
      loadCustomisations();
    };
    window.addEventListener('customSettingsUpdated', handleUpdate);
    return () => {
      window.removeEventListener('customSettingsUpdated', handleUpdate);
    };
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

  const toggleExpandItem = async (item: ActionItem) => {
    if (expandedItemId === item.id) {
      setExpandedItemId(null);
      return;
    }

    setExpandedItemId(item.id);

    // Fetch breakdown if not already in cache
    if (!breakdownCache[item.id]) {
      setLoadingBreakdownId(item.id);
      try {
        const res = await fetch('/api/action-items/breakdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            description: item.description,
            category: item.category,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setBreakdownCache((prev) => ({
            ...prev,
            [item.id]: data,
          }));
        }
      } catch (err) {
        console.error('Failed to load task breakdown:', err);
      } finally {
        setLoadingBreakdownId(null);
      }
    }
  };

  const handleToggleSubTaskCheck = (taskId: string, subtask: string) => {
    setSelectedSubTasks((prev) => {
      const currentSelected = prev[taskId] || [];
      const isSelected = currentSelected.includes(subtask);
      const nextSelected = isSelected
        ? currentSelected.filter((s) => s !== subtask)
        : [...currentSelected, subtask];
      return {
        ...prev,
        [taskId]: nextSelected,
      };
    });
  };

  const handlePromoteSubTasks = async (item: ActionItem) => {
    const selected = selectedSubTasks[item.id] || [];
    if (selected.length === 0) return;

    setIsPromotingSubTasks(item.id);
    try {
      const createdTasks: ActionItem[] = [];
      for (const title of selected) {
        const res = await fetch('/api/action-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thoughtId: item.thoughtId || null,
            title,
            description: `Auto-promoted from sub-task of parent task: "${item.title}".`,
            priority: 'medium',
            category: item.category || 'Work',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          createdTasks.push(data.actionItem);
        }
      }

      // Prepend the new tasks to the items list
      setItems((prev) => [...createdTasks, ...prev]);

      // Remove promoted sub-tasks from the cached sub-tasks list for this item
      const currentCache = breakdownCache[item.id];
      if (currentCache) {
        const remainingSubTasks = currentCache.subTasks.filter((s) => !selected.includes(s));
        
        // Track overall excluded sub-tasks to fetch alternative ones
        const alreadyPromoted = promotedSubTasks[item.id] || [];
        const nextPromoted = [...alreadyPromoted, ...selected];
        setPromotedSubTasks((prev) => ({
          ...prev,
          [item.id]: nextPromoted,
        }));
        
        // Fetch fresh alternative sub-tasks to fill back up to 3!
        const res = await fetch('/api/action-items/breakdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            description: item.description,
            category: item.category,
            excludeSubTasks: nextPromoted,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Update the cache with fresh sub-tasks
          setBreakdownCache((prev) => ({
            ...prev,
            [item.id]: {
              ...currentCache,
              subTasks: data.subTasks || [],
            },
          }));
        } else {
          // If fallback, just store the remaining ones
          setBreakdownCache((prev) => ({
            ...prev,
            [item.id]: {
              ...currentCache,
              subTasks: remainingSubTasks,
            },
          }));
        }
      }

      // Clear selection for this task
      setSelectedSubTasks((prev) => ({
        ...prev,
        [item.id]: [],
      }));
    } catch (err) {
      console.error('Failed to promote sub-tasks:', err);
    } finally {
      setIsPromotingSubTasks(null);
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(q);
      const descMatch = (item.description || '').toLowerCase().includes(q);
      const catMatch = (item.category || 'Work').toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !catMatch) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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

      {/* Controls Row */}
      <div className="w-full bg-zinc-950/20 border border-zinc-900 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-[36px] pl-9 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setStatusFilterOpen(!statusFilterOpen);
                setPriorityFilterOpen(false);
                setCategoryFilterOpen(false);
              }}
              className="h-[36px] px-3.5 bg-zinc-905 border border-zinc-800 text-zinc-300 text-xs rounded-xl hover:text-white transition-all cursor-pointer flex items-center gap-1.5 min-w-[110px] justify-between capitalize"
            >
              <span className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-zinc-500" />
                <span>{filterStatus}</span>
              </span>
              <svg className="h-3 w-3 fill-none stroke-current text-zinc-400" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {statusFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStatusFilterOpen(false)} />
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[140px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 backdrop-blur-md">
                  {['active', 'completed', 'dismissed', 'all'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setFilterStatus(st);
                        setStatusFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer block capitalize ${
                        st === filterStatus 
                          ? 'bg-indigo-650/15 border-indigo-500/30 text-indigo-300 font-bold' 
                          : 'text-zinc-400 hover:bg-zinc-905 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Priority Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setPriorityFilterOpen(!priorityFilterOpen);
                setStatusFilterOpen(false);
                setCategoryFilterOpen(false);
              }}
              className="h-[36px] px-3.5 bg-zinc-905 border border-zinc-800 text-zinc-300 text-xs rounded-xl hover:text-white transition-all cursor-pointer flex items-center gap-1.5 min-w-[110px] justify-between capitalize"
            >
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
                <span>Priority: {filterPriority}</span>
              </span>
              <svg className="h-3 w-3 fill-none stroke-current text-zinc-400" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {priorityFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPriorityFilterOpen(false)} />
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[140px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 backdrop-blur-md">
                  {['all', 'high', 'medium', 'low'].map((pri) => (
                    <button
                      key={pri}
                      onClick={() => {
                        setFilterPriority(pri);
                        setPriorityFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer block capitalize ${
                        pri === filterPriority 
                          ? 'bg-indigo-650/15 border-indigo-500/30 text-indigo-300 font-bold' 
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

          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setCategoryFilterOpen(!categoryFilterOpen);
                setStatusFilterOpen(false);
                setPriorityFilterOpen(false);
              }}
              className="h-[36px] px-3.5 bg-zinc-905 border border-zinc-800 text-zinc-300 text-xs rounded-xl hover:text-white transition-all cursor-pointer flex items-center gap-1.5 min-w-[110px] justify-between capitalize"
            >
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-550" />
                <span>Category: {filterCategory}</span>
              </span>
              <svg className="h-3 w-3 fill-none stroke-current text-zinc-400" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {categoryFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCategoryFilterOpen(false)} />
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[150px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 backdrop-blur-md max-h-48 overflow-y-auto">
                  {['all', ...categories].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setFilterCategory(cat);
                        setCategoryFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer block capitalize ${
                        cat === filterCategory 
                          ? 'bg-indigo-650/15 border-indigo-500/30 text-indigo-300 font-bold' 
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
        </div>

        {/* Add Task Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 h-[36px] bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold rounded-xl border border-indigo-500/30 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all cursor-pointer shrink-0 w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
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
              {selectedIds.size === paginatedItems.length ? 'Deselect All' : 'Select All on Page'}
            </button>
            <span>Showing {paginatedItems.length} of {filteredItems.length} entries</span>
          </div>

          {paginatedItems.map((item) => {
            const isUpdating = updatingIds.has(item.id);
            const isOverdue = item.dueDate && item.dueDate < Date.now() && item.status !== 'completed' && item.status !== 'dismissed';
            const daysLeft = item.dueDate ? getDaysUntilDue(item.dueDate) : null;
            const isSelected = selectedIds.has(item.id);
            const taskSelectedSubs = selectedSubTasks[item.id] || [];

            return (
              <div
                key={item.id}
                onClick={() => toggleExpandItem(item)}
                className={`glass-panel rounded-xl border p-4 transition-all group cursor-pointer ${
                  expandedItemId === item.id ? 'z-30 relative' : 'z-10 relative'
                } ${
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(item.id);
                    }}
                    className="mt-1 cursor-pointer shrink-0 text-zinc-600 hover:text-indigo-400 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-700" />
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(item);
                          }}
                          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-zinc-650 hover:text-indigo-400 hover:bg-zinc-900/60 rounded transition-all cursor-pointer"
                          title="Edit manual task"
                        >
                          <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item.id);
                          }}
                          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-zinc-650 hover:text-rose-455 hover:bg-zinc-900/60 rounded transition-all cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Chevron Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandItem(item);
                          }}
                          className="p-1 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-900/60 rounded transition-all cursor-pointer"
                          title="View AI Breakdown"
                        >
                          {expandedItemId === item.id ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
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

                      {/* Source Thought / AI Summary */}
                      {(breakdownCache[item.id]?.summary || item.thoughtSummary) && (
                        <span className="inline-flex items-center gap-1.5 text-zinc-500 flex-wrap">
                          <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>{breakdownCache[item.id]?.summary || item.thoughtSummary}</span>
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

                    {/* Expandable AI Breakdown Drawer */}
                    {expandedItemId === item.id && (
                      <div className="mt-4 pt-4 border-t border-zinc-900/80 space-y-4 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                        {loadingBreakdownId === item.id ? (
                          <div className="flex flex-col items-center justify-center py-6 space-y-2">
                            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest animate-pulse">Consulting JARVIS Core...</span>
                          </div>
                        ) : breakdownCache[item.id] ? (
                          <div className="space-y-4 cursor-default">
                            {/* Two-Column Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Action plans */}
                              <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-900 space-y-2">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5" /> Potential Action Plan
                                </span>
                                <ul className="space-y-1.5 list-none">
                                  {breakdownCache[item.id].actionPlan.map((plan, idx) => (
                                    <li key={idx} className="text-zinc-300 text-xs flex items-start gap-1.5 leading-relaxed">
                                      <span className="text-indigo-400 shrink-0 font-bold font-mono">{idx + 1}.</span>
                                      <span>{plan}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Web references */}
                              <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-900 space-y-2">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                  <ArrowUpRight className="w-3.5 h-3.5" /> Helpful Web References
                                </span>
                                <div className="space-y-1.5">
                                  {breakdownCache[item.id].references.map((ref, idx) => (
                                    <div key={idx} className="flex items-start gap-1.5 text-zinc-300 text-xs leading-relaxed">
                                      <span className="text-zinc-600 shrink-0">•</span>
                                      <span className="underline decoration-indigo-500/40 hover:text-indigo-300 transition-colors cursor-pointer select-all">{ref}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Recommended Sub Tasks Checklists */}
                            <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-900 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                  <ListTodo className="w-3.5 h-3.5" /> Recommended Sub-tasks
                                </span>
                                {taskSelectedSubs.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePromoteSubTasks(item);
                                    }}
                                    disabled={isPromotingSubTasks === item.id}
                                    className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    {isPromotingSubTasks === item.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Plus className="w-3 h-3" />
                                    )}
                                    Add Selected ({taskSelectedSubs.length})
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {breakdownCache[item.id].subTasks.map((sub, idx) => {
                                  const isSubChecked = taskSelectedSubs.includes(sub);
                                  return (
                                    <div
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleSubTaskCheck(item.id, sub);
                                      }}
                                      title={sub}
                                      className={`flex items-center gap-2 p-2 bg-zinc-900/20 border rounded-md relative group/subtask transition-all hover:bg-zinc-805/45 cursor-pointer ${
                                        isSubChecked ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-zinc-900/60'
                                      }`}
                                    >
                                      <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-all ${
                                        isSubChecked ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-zinc-800'
                                      }`}>
                                        {isSubChecked && <svg className="w-2.5 h-2.5 fill-none stroke-current" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                                      </div>
                                      <span className={`text-[11px] truncate font-medium transition-all ${
                                        isSubChecked ? 'text-zinc-200' : 'text-zinc-405'
                                      }`}>{sub}</span>

                                      {/* Custom Floating CSS Tooltip (Floating Upwards) */}
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/subtask:block bg-zinc-950 text-zinc-100 text-[10px] p-2.5 rounded-lg border border-zinc-800 shadow-2xl max-w-[220px] z-[9999] pointer-events-none break-words leading-relaxed text-center font-normal">
                                        {sub}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-zinc-550 text-xs italic py-2">Failed to calculate task breakdown. Please try again.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/20 border border-zinc-900 rounded-2xl p-4 mt-6">
              <span className="text-xs text-zinc-500 font-medium">
                Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} tasks
              </span>
              
              <div className="flex items-center gap-4">
                {/* Custom Page Size Selector (Dropdown style) */}
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-[34px] bg-zinc-900 border border-zinc-805 text-zinc-350 text-xs rounded-xl px-3 pr-8 focus:outline-none transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2500%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2523a1a1aa%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center] bg-no-repeat bg-[size:18px] min-w-[110px]"
                  >
                    {[5, 10, 25, 50].map((size) => (
                      <option key={size} value={size}>{size} per page</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-1 bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-1 h-[34px]">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-800/60 text-zinc-400 disabled:opacity-20 disabled:hover:bg-zinc-900/60 transition-all cursor-pointer font-bold text-xs"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-zinc-400 px-2 min-w-[40px] text-center select-none font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-800/60 text-zinc-400 disabled:opacity-20 disabled:hover:bg-zinc-900/60 transition-all cursor-pointer font-bold text-xs"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          )}
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
              <div className="relative">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5 px-0.5">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setCreateCategoryOpen(!createCategoryOpen)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-left flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium text-xs">{createCategory || 'Select category'}</span>
                  <svg className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {createCategoryOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setCreateCategoryOpen(false)} />
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-zinc-950 border border-zinc-805 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-md max-h-48 overflow-y-auto">
                      {['Work', 'Personal', 'Fitness', 'Finance', 'Ideas', 'Others'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setCreateCategory(cat);
                            setCreateCategoryOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer block ${
                            cat === createCategory 
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
                <div className="relative">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5 px-0.5">
                    Priority
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreatePriorityOpen(!createPriorityOpen)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-left flex items-center justify-between cursor-pointer capitalize"
                  >
                    <span className="font-medium text-xs">{createPriority}</span>
                    <svg className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {createPriorityOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setCreatePriorityOpen(false)} />
                      <div className="absolute left-0 top-full mt-1.5 w-full bg-zinc-950 border border-zinc-805 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-md">
                        {['low', 'medium', 'high'].map((pri) => (
                          <button
                            key={pri}
                            type="button"
                            onClick={() => {
                              setCreatePriority(pri as any);
                              setCreatePriorityOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer block capitalize ${
                              pri === createPriority 
                                ? 'bg-indigo-600/20 text-indigo-300 font-bold' 
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
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold transition-all flex items-center gap-1 shadow-lg shadow-indigo-500/10 cursor-pointer"
              >
                {isCreatingTask && <Loader2 className="w-3 h-3 animate-spin" />}
                Create Task
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
              <div className="relative">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5 px-0.5">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setEditCategoryOpen(!editCategoryOpen)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-left flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium text-xs">{editCategory || 'Select category'}</span>
                  <svg className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {editCategoryOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setEditCategoryOpen(false)} />
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-zinc-950 border border-zinc-805 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-md max-h-48 overflow-y-auto">
                      {['Work', 'Personal', 'Fitness', 'Finance', 'Ideas', 'Others'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setEditCategory(cat);
                            setEditCategoryOpen(false);
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
                <div className="relative">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5 px-0.5">
                    Priority
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditPriorityOpen(!editPriorityOpen)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-left flex items-center justify-between cursor-pointer capitalize"
                  >
                    <span className="font-medium text-xs">{editPriority}</span>
                    <svg className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {editPriorityOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setEditPriorityOpen(false)} />
                      <div className="absolute left-0 top-full mt-1.5 w-full bg-zinc-950 border border-zinc-805 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-md">
                        {['low', 'medium', 'high'].map((pri) => (
                          <button
                            key={pri}
                            type="button"
                            onClick={() => {
                              setEditPriority(pri as any);
                              setEditPriorityOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer block capitalize ${
                              pri === editPriority 
                                ? 'bg-indigo-600/20 text-indigo-300 font-bold' 
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
              <div className="relative">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5 px-0.5">
                  Status
                </label>
                <button
                  type="button"
                  onClick={() => setEditStatusOpen(!editStatusOpen)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-left flex items-center justify-between cursor-pointer capitalize"
                >
                  <span className="font-medium text-xs">{editStatus.replace('_', ' ')}</span>
                  <svg className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {editStatusOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setEditStatusOpen(false)} />
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-zinc-950 border border-zinc-805 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-md">
                      {['pending', 'in_progress', 'completed', 'dismissed'].map((stat) => (
                        <button
                          key={stat}
                          type="button"
                          onClick={() => {
                            setEditStatus(stat as any);
                            setEditStatusOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer block capitalize ${
                            stat === editStatus 
                              ? 'bg-indigo-600/20 text-indigo-300 font-bold' 
                              : 'text-zinc-400 hover:bg-zinc-905 hover:text-white'
                          }`}
                        >
                          {stat.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </>
                )}
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

