'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Tag, 
  Layers, 
  AlertOctagon, 
  Plus, 
  Trash2,
  Sliders,
  CheckCircle,
  User,
  Activity,
  TrendingUp,
  Lightbulb,
  Bookmark
} from 'lucide-react';
import {
  getCustomCategories,
  saveCustomCategories,
  getCustomTags,
  saveCustomTags,
  getCustomPriorities,
  saveCustomPriorities,
  getCustomStatuses,
  saveCustomStatuses,
  PriorityOption,
  StatusOption
} from '@/lib/customSettings';

export default function SettingsPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<PriorityOption[]>([]);
  const [statuses, setStatuses] = useState<StatusOption[]>([]);

  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newPriorityLevel, setNewPriorityLevel] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusDesc, setNewStatusDesc] = useState('');

  // Load custom values on mount
  useEffect(() => {
    setCategories(getCustomCategories());
    setTags(getCustomTags());
    setPriorities(getCustomPriorities());
    setStatuses(getCustomStatuses());
  }, []);

  const getCategoryIcon = (catName: string) => {
    switch (catName.toLowerCase()) {
      case 'work': return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
      case 'personal': return <User className="w-3.5 h-3.5 text-emerald-400" />;
      case 'fitness': return <Activity className="w-3.5 h-3.5 text-rose-455" />;
      case 'finance': return <TrendingUp className="w-3.5 h-3.5 text-amber-400" />;
      case 'ideas': return <Lightbulb className="w-3.5 h-3.5 text-violet-400" />;
      default: return <Bookmark className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = newCategory.trim();
    if (cat && !categories.some(c => c.toLowerCase() === cat.toLowerCase())) {
      const updated = [...categories, cat];
      setCategories(updated);
      saveCustomCategories(updated);
      setNewCategory('');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    if (categories.length > 1) {
      const updated = categories.filter(c => c !== cat);
      setCategories(updated);
      saveCustomCategories(updated);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTag.trim();
    if (tag && !tags.some(t => t.toLowerCase() === tag.toLowerCase())) {
      const updated = [...tags, tag];
      setTags(updated);
      saveCustomTags(updated);
      setNewTag('');
    }
  };

  const handleDeleteTag = (tag: string) => {
    const updated = tags.filter(t => t !== tag);
    setTags(updated);
    saveCustomTags(updated);
  };

  const handleAddPriority = (e: React.FormEvent) => {
    e.preventDefault();
    const lvl = newPriorityLevel.trim();
    if (lvl && !priorities.some(p => p.level.toLowerCase() === lvl.toLowerCase())) {
      const updated = [...priorities, {
        level: lvl,
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        custom: true
      }];
      setPriorities(updated);
      saveCustomPriorities(updated);
      setNewPriorityLevel('');
    }
  };

  const handleDeletePriority = (lvl: string) => {
    const updated = priorities.filter(p => p.level !== lvl);
    setPriorities(updated);
    saveCustomPriorities(updated);
  };

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newStatusName.trim();
    if (name && !statuses.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      const updated = [...statuses, {
        name,
        desc: newStatusDesc.trim() || 'Custom workflow stage option',
        custom: true
      }];
      setStatuses(updated);
      saveCustomStatuses(updated);
      setNewStatusName('');
      setNewStatusDesc('');
    }
  };

  const handleDeleteStatus = (name: string) => {
    const updated = statuses.filter(s => s.name !== name);
    setStatuses(updated);
    saveCustomStatuses(updated);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 select-none">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white text-glow-indigo flex items-center gap-3">
          <Settings className="w-8 h-8 text-indigo-400" /> Settings & Customisation
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Manage your cognitive workflow configurations, custom tags, thought categories, and task priorities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories Box */}
        <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
            <h2 className="text-md font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" /> Thought Categories
            </h2>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-semibold px-2 py-0.5 rounded-lg border border-indigo-500/25">
              {categories.length} Total
            </span>
          </div>

          <p className="text-zinc-500 text-xs leading-relaxed">
            Categories classify thoughts on your timeline and organize action items into distinct workflow streams.
          </p>

          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="Add new category (e.g. Health)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 bg-zinc-905 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div 
                key={cat} 
                className="flex items-center justify-between bg-zinc-905 border border-zinc-800/60 p-2.5 rounded-xl hover:bg-zinc-900/70 transition-all group"
              >
                <div className="flex items-center gap-2">
                  {getCategoryIcon(cat)}
                  <span className="text-xs font-semibold text-zinc-300 capitalize">{cat}</span>
                </div>
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  disabled={categories.length <= 1}
                  className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-455 rounded transition-all cursor-pointer disabled:opacity-0"
                  title="Remove category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tags Box */}
        <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
            <h2 className="text-md font-bold text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-400" /> Custom Tags & Labels
            </h2>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-semibold px-2 py-0.5 rounded-lg border border-indigo-500/25">
              {tags.length} Total
            </span>
          </div>

          <p className="text-zinc-500 text-xs leading-relaxed">
            Custom tags enable ad-hoc categorisation of thoughts. Attach tags in the edit timeline dialog.
          </p>

          <form onSubmit={handleAddTag} className="flex gap-2">
            <input
              type="text"
              placeholder="Create tag (e.g. saas-mvp)"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="flex-1 bg-zinc-905 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1">
            {tags.map((tag) => (
              <span 
                key={tag} 
                className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-350 text-[11px] font-medium px-2.5 py-1 rounded-xl transition-all hover:bg-zinc-800 hover:text-white"
              >
                <span>#{tag}</span>
                <button
                  onClick={() => handleDeleteTag(tag)}
                  className="text-zinc-550 hover:text-rose-455 transition-colors cursor-pointer"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Priority customiser */}
        <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
            <h2 className="text-md font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-indigo-400" /> Priorities Customisation
            </h2>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-semibold px-2 py-0.5 rounded-lg border border-indigo-500/25">
              {priorities.length} Levels
            </span>
          </div>

          <p className="text-zinc-500 text-xs leading-relaxed">
            Priorities highlight critical action items. Add custom priority flags to tailor your workspace classification.
          </p>

          <form onSubmit={handleAddPriority} className="flex gap-2">
            <input
              type="text"
              placeholder="Add Priority level (e.g. Critical)"
              value={newPriorityLevel}
              onChange={(e) => setNewPriorityLevel(e.target.value)}
              className="flex-1 bg-zinc-905 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {priorities.map((p) => (
              <div 
                key={p.level}
                className="flex items-center justify-between bg-zinc-905 border border-zinc-800/60 p-2.5 rounded-xl group"
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${p.color}`}>
                    {p.level}
                  </span>
                </div>
                {p.custom ? (
                  <button
                    onClick={() => handleDeletePriority(p.level)}
                    className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-zinc-505 hover:text-rose-455 rounded transition-all cursor-pointer"
                    title="Remove custom priority"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-[9px] text-zinc-650 font-semibold italic">System</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status customiser */}
        <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
            <h2 className="text-md font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" /> Workflow Stages & Status
            </h2>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-semibold px-2 py-0.5 rounded-lg border border-indigo-500/25">
              {statuses.length} Stages
            </span>
          </div>

          <p className="text-zinc-500 text-xs leading-relaxed">
            Create or delete status choices to cycle action items across custom project management stages.
          </p>

          <form onSubmit={handleAddStatus} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Stage name (e.g. Blocked)"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                className="flex-1 bg-zinc-905 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Stage description (optional)"
              value={newStatusDesc}
              onChange={(e) => setNewStatusDesc(e.target.value)}
              className="w-full bg-zinc-905 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
            />
          </form>

          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {statuses.map((s) => (
              <div 
                key={s.name} 
                className="flex items-start justify-between bg-zinc-905 border border-zinc-800/60 p-2.5 rounded-xl group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-xs font-bold text-zinc-200">{s.name}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal">{s.desc}</p>
                </div>
                {s.custom ? (
                  <button
                    onClick={() => handleDeleteStatus(s.name)}
                    className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-zinc-505 hover:text-rose-455 rounded transition-all cursor-pointer"
                    title="Remove custom status"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-[9px] text-zinc-650 font-semibold italic shrink-0">System</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
