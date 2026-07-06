'use client';

import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Loader2, 
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
  Search,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Check,
  X,
  Sliders,
  Layers,
  Settings,
  ChevronDown,
  ChevronUp,
  Briefcase,
  AlertCircle,
  Lightbulb,
  Target,
  RotateCcw,
  BookOpen,
  GitPullRequest,
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import { ClusterControls } from './ClusterControls';

interface Connection {
  relationshipId: string;
  thoughtId: string;
  summary: string;
  category: string;
  score: number;
}

interface Thought {
  id: string;
  content: string;
  summary: string;
  category: string;
  tags?: string[];
  createdAt: number;
  connections: Connection[];
}

export default function ConnectionsPage() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThoughtId, setActiveThoughtId] = useState<string | null>(null);
  
  // Selection state for click-based node details
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Custom states for Sprint 1
  const [isClustered, setIsClustered] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // default to 5 to match ClusterControls
  const [searchQuery, setSearchQuery] = useState('');
  const [focusDropdownOpen, setFocusDropdownOpen] = useState(false);
  const [focusSearch, setFocusSearch] = useState('');
  
  // Task creation states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskSuccessMessage, setTaskSuccessMessage] = useState('');
  
  // Modal states
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [newLinkScore, setNewLinkScore] = useState(0.8);
  const [newLinkDescription, setNewLinkDescription] = useState('');
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  
  // Editing states
  const [isEditingActiveThought, setIsEditingActiveThought] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editContent, setEditContent] = useState('');
  
  // Collapsible display states
  const [parentExpanded, setParentExpanded] = useState(false);
  const [childExpanded, setChildExpanded] = useState(false);
  
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [editRelScore, setEditRelScore] = useState(0.8);

  // Floating Tooltip coordinates & state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredNodeCoords, setHoveredNodeCoords] = useState<{ x: number; y: number; rectWidth: number; rectHeight: number } | null>(null);
  const [hoveredType, setHoveredType] = useState<'graph' | 'list' | null>(null);
  
  // Custom delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Mobile active tab state ('map' | 'details')
  const [activeTab, setActiveTab] = useState<'map' | 'details'>('map');


  useEffect(() => {
    fetchThoughts();
  }, []);

  useEffect(() => {
    setHoveredNodeId(null);
    setHoveredType(null);
  }, [selectedNodeId, activeThoughtId]);

  const fetchThoughts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/thoughts');
      if (res.ok) {
        const data = await res.json();
        setThoughts(data.thoughts || []);
        // Set default active node to the one with the max connections
        if (data.thoughts && data.thoughts.length > 0 && !activeThoughtId) {
          let defaultId = data.thoughts[0].id;
          let maxConnections = -1;
          data.thoughts.forEach((t: any) => {
            const count = t.connections?.length || 0;
            if (count > maxConnections) {
              maxConnections = count;
              defaultId = t.id;
            }
          });
          setActiveThoughtId(defaultId);
        }
      }
    } catch (err) {
      console.error('Error loading thoughts for map:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Idea': return <Lightbulb className="w-3.5 h-3.5 text-violet-400" />;
      case 'Goal': return <Target className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Reflection': return <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Learning': return <BookOpen className="w-3.5 h-3.5 text-amber-400" />;
      case 'Decision': return <GitPullRequest className="w-3.5 h-3.5 text-fuchsia-400" />;
      case 'Problem': return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'Opportunity': return <TrendingUp className="w-3.5 h-3.5 text-teal-400" />;
      default: return <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Idea': return '#a78bfa'; // violet-400
      case 'Goal': return '#34d399'; // emerald-400
      case 'Reflection': return '#22d3ee'; // cyan-400
      case 'Learning': return '#fbbf24'; // amber-400
      case 'Decision': return '#e879f9'; // fuchsia-400
      case 'Problem': return '#f87171'; // rose-400
      case 'Opportunity': return '#2dd4bf'; // teal-400
      default: return '#9ca3af'; // zinc-400
    }
  };

  const handleUpdateThought = async (id: string) => {
    try {
      const res = await fetch(`/api/thoughts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editCategory,
          summary: editSummary,
          content: editContent,
        }),
      });
      if (res.ok) {
        setIsEditingActiveThought(false);
        await fetchThoughts();
      }
    } catch (err) {
      console.error('Failed to update thought:', err);
    }
  };

  const triggerDeleteConfirm = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const res = await fetch(`/api/thoughts/${deleteTargetId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const remaining = thoughts.filter(t => t.id !== deleteTargetId);
        setThoughts(remaining);
        setIsEditingActiveThought(false);
        setSelectedNodeId(null);
        if (remaining.length > 0) {
          const withConnections = remaining.filter(t => (t.connections?.length || 0) > 0);
          if (withConnections.length > 0) {
            setActiveThoughtId(withConnections[0].id);
          } else {
            setActiveThoughtId(remaining[0].id);
          }
        } else {
          setActiveThoughtId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete thought:', err);
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
    }
  };

  const handleCreateRelationship = async () => {
    if (!selectedSourceId || !selectedTargetId) return;
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thoughtId1: selectedSourceId,
          thoughtId2: selectedTargetId,
          score: newLinkScore,
          description: newLinkDescription.trim(),
        }),
      });
      if (res.ok) {
        setShowCreateLinkModal(false);
        setSelectedTargetId('');
        setNewLinkScore(0.8);
        setNewLinkDescription('');
        await fetchThoughts();
      }
    } catch (err) {
      console.error('Failed to create relationship:', err);
    }
  };

  const handleDeleteRelationship = async (relId: string) => {
    if (!confirm('Are you sure you want to remove this connection?')) return;
    try {
      const res = await fetch(`/api/relationships?id=${relId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchThoughts();
        setSelectedNodeId(null);
      }
    } catch (err) {
      console.error('Failed to delete relationship:', err);
    }
  };

  const handleUpdateRelationshipScore = async (relId: string) => {
    try {
      const res = await fetch('/api/relationships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: relId,
          score: editRelScore,
        }),
      });
      if (res.ok) {
        setEditingRelationshipId(null);
        await fetchThoughts();
      }
    } catch (err) {
      console.error('Failed to update relationship score:', err);
    }
  };

  // Create Task linked to a thought
  const handleCreateTask = async (thoughtId: string) => {
    if (!taskTitle.trim()) return;
    try {
      const res = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thoughtId,
          title: taskTitle,
          priority: taskPriority,
        }),
      });
      if (res.ok) {
        setTaskSuccessMessage('Task created successfully! Check Action Center.');
        setTaskTitle('');
        setTimeout(() => setTaskSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Failed to create action item:', err);
    }
  };

  // Find active thought record
  const activeThought = thoughts.find((t) => t.id === activeThoughtId);

  // Sync edit fields and reset collapse states when active thought changes
  useEffect(() => {
    if (activeThought) {
      setEditCategory(activeThought.category);
      setEditSummary(activeThought.summary);
      setEditContent(activeThought.content);
    }
    setParentExpanded(false);
    setChildExpanded(false);
  }, [activeThoughtId, thoughts]);

  // Reset child card expansion when selected child changes
  useEffect(() => {
    setChildExpanded(false);
  }, [selectedNodeId]);

  // Connected nodes mapping
  const connectedNodes = activeThought
    ? activeThought.connections.map((c) => {
        const fullThought = thoughts.find((t) => t.id === c.thoughtId);
        return {
          ...c,
          fullThought,
        };
      }).filter(c => c.fullThought !== undefined)
    : [];

  // Filter outer nodes by search query
  const filteredConnectedNodes = connectedNodes.filter(node => 
    node.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group into clusters if isClustered is true
  const clusters: { [category: string]: typeof filteredConnectedNodes } = {};
  if (isClustered) {
    filteredConnectedNodes.forEach(node => {
      if (!clusters[node.category]) {
        clusters[node.category] = [];
      }
      clusters[node.category].push(node);
    });
  }

  // Paginated nodes for unclustered view
  const totalItems = filteredConnectedNodes.length;
  const paginatedNodes = isClustered 
    ? filteredConnectedNodes // in clustered view, we cluster all filtered nodes
    : filteredConnectedNodes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Find currently selected child node detail
  const selectedConnection = activeThought?.connections.find(c => c.thoughtId === selectedNodeId);
  const selectedNodeThought = thoughts.find(t => t.id === selectedNodeId);

  // Live AI synthesis state variables
  const [consolidatedAnalysis, setConsolidatedAnalysis] = useState<{ header: string; detail: string } | null>(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<{ connection: string; how: string; why: string; outcome: string; actionPlan: string } | null>(null);
  const [loadingConsolidated, setLoadingConsolidated] = useState(false);
  const [loadingDetailed, setLoadingDetailed] = useState(false);

  // Asynchronous Fetch for State A (Consolidated Connection Summary)
  useEffect(() => {
    if (!activeThoughtId) {
      setConsolidatedAnalysis(null);
      return;
    }
    const fetchConsolidated = async () => {
      setLoadingConsolidated(true);
      try {
        const res = await fetch('/api/relationships/synthesis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: activeThoughtId }),
        });
        if (res.ok) {
          const data = await res.json();
          setConsolidatedAnalysis(data);
        }
      } catch (err) {
        console.error('Error fetching consolidated synthesis:', err);
      } finally {
        setLoadingConsolidated(false);
      }
    };
    fetchConsolidated();
  }, [activeThoughtId, thoughts]);

  // Asynchronous Fetch for State B (Detailed Connection Analysis)
  useEffect(() => {
    if (!activeThoughtId || !selectedNodeId) {
      setDetailedAnalysis(null);
      return;
    }
    const fetchDetailed = async () => {
      setLoadingDetailed(true);
      try {
        const res = await fetch('/api/relationships/synthesis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: activeThoughtId, childId: selectedNodeId }),
        });
        if (res.ok) {
          const data = await res.json();
          setDetailedAnalysis(data);
        }
      } catch (err) {
        console.error('Error fetching detailed synthesis:', err);
      } finally {
        setLoadingDetailed(false);
      }
    };
    fetchDetailed();
  }, [activeThoughtId, selectedNodeId]);

  // Handle single node click (selection)
  const handleNodeClick = (thoughtId: string) => {
    setSelectedNodeId(thoughtId);
  };

  // Handle double click (re-center)
  const handleNodeDoubleClick = (thoughtId: string) => {
    setActiveThoughtId(thoughtId);
    setSelectedNodeId(null);
    setIsEditingActiveThought(false);
  };

  // Width & height of the SVG viewport
  const width = 600;
  const height = 450;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 150; // Radius of main orbits

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white text-glow-indigo flex items-center gap-2">
            <Network className="w-8 h-8 text-indigo-400" /> Organic Mind Map
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Explore connections, select related thoughts to inspect, and double-click outer nodes to re-center.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              setSelectedSourceId(activeThoughtId || '');
              setShowCreateLinkModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-550/20 hover:shadow-indigo-500/30 cursor-pointer border border-indigo-400/20 w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Add Connection
            <span className="ml-1.5 text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono font-bold">
              {Math.round(thoughts.reduce((acc, t) => acc + (t.connections?.length || 0), 0) / 2)}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 glass-panel rounded-2xl border-zinc-800/80">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-2" />
          <span className="text-zinc-500 text-sm">Rendering mind map...</span>
        </div>
      ) : thoughts.length === 0 ? (
        <div className="py-20 text-center glass-panel border-dashed rounded-2xl p-8 border-zinc-800">
          <Network className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-300">No connections mapped</h3>
          <p className="text-zinc-500 text-xs max-w-sm mx-auto mt-1">
            Capture at least two thoughts that share related words, technologies or goals to generate links.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mobile Segmented Tab Switcher */}
          <div className="flex lg:hidden bg-zinc-950/60 p-1 rounded-xl border border-zinc-900 w-full max-w-sm mx-auto select-none">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'map'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Network className="w-3.5 h-3.5" /> Node Map
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'details'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Connection Overview
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Visual Graph View (Left 7 Columns) */}
            <div 
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredNodeCoords({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  rectWidth: rect.width,
                  rectHeight: rect.height,
                });
              }}
              onMouseLeave={() => {
                setHoveredNodeId(null);
                setHoveredType(null);
              }}
              className={`lg:col-span-7 glass-panel rounded-2xl p-6 border-zinc-800/80 flex flex-col items-center justify-center relative overflow-hidden select-none bg-zinc-950/20 shadow-xl ${
                activeTab === 'map' ? 'flex animate-fadeIn' : 'hidden lg:flex'
              }`}
            >
            <div className="absolute top-0 left-0 w-[150px] h-[150px] rounded-full bg-indigo-500/5 blur-[50px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[150px] h-[150px] rounded-full bg-cyan-500/5 blur-[50px] pointer-events-none" />

            {/* Active Focus Parent Thought Selector */}
            <div className="w-full relative mb-4 z-40">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5 px-1">
                Select Active Focus Parent Thought
              </label>
              
              {/* Selector Button */}
              <button
                type="button"
                onClick={() => setFocusDropdownOpen(!focusDropdownOpen)}
                className="w-full h-[40px] bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-4 text-left text-xs text-white placeholder-zinc-550 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all flex items-center justify-between cursor-pointer"
              >
                <span className="truncate pr-2 font-semibold flex items-center gap-2">
                  {activeThought ? (
                    <>
                      <span className="flex items-center gap-1.5 bg-zinc-950/60 px-2 py-0.5 rounded-lg border border-zinc-800/60 shrink-0">
                        {getCategoryIcon(activeThought.category)}
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide hidden sm:inline">{activeThought.category}</span>
                      </span>
                      <span className="truncate">{activeThought.summary}</span>
                    </>
                  ) : (
                    '-- Select a parent thought --'
                  )}
                </span>
                <svg className="h-3 w-3 fill-none stroke-current text-zinc-400 shrink-0 ml-2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Popover */}
              {focusDropdownOpen && (
                <>
                  {/* Click-out backdrop */}
                  <div className="fixed inset-0 z-30" onClick={() => setFocusDropdownOpen(false)} />
                  
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2.5 space-y-2.5 flex flex-col backdrop-blur-md">
                    {/* Search box inside dropdown */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Search thoughts..."
                        value={focusSearch}
                        onChange={(e) => setFocusSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800/80 rounded-lg text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Scrollable results list */}
                    <div className="overflow-y-auto flex-1 space-y-1 pr-1 max-h-52">
                      {thoughts
                        .filter(t => (t.connections?.length || 0) > 0)
                        .filter(t => 
                          t.summary.toLowerCase().includes(focusSearch.toLowerCase()) || 
                          t.category.toLowerCase().includes(focusSearch.toLowerCase())
                        )
                        .map(t => {
                          const connCount = t.connections?.length || 0;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setActiveThoughtId(t.id);
                                setSelectedNodeId(null);
                                setFocusDropdownOpen(false);
                                setFocusSearch('');
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                                t.id === activeThoughtId
                                  ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-300 font-semibold'
                                  : 'bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400'
                              }`}
                            >
                              <span className="truncate pr-4 flex items-center gap-2">
                                <span className="flex items-center gap-1.5 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800 shrink-0">
                                  {getCategoryIcon(t.category)}
                                  <span className="text-[9px] text-zinc-450 font-bold uppercase tracking-wide hidden sm:inline">{t.category}</span>
                                </span>
                                <span className="truncate font-medium">{t.summary}</span>
                              </span>
                              <span 
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 border border-indigo-500/20 bg-indigo-600/10 text-indigo-300`}
                              >
                                {connCount} links
                              </span>
                            </button>
                          );
                        })
                      }
                      {thoughts
                        .filter(t => (t.connections?.length || 0) > 0)
                        .filter(t => 
                          t.summary.toLowerCase().includes(focusSearch.toLowerCase()) || 
                          t.category.toLowerCase().includes(focusSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="text-center text-zinc-650 text-xs py-6">No thoughts with connections found</div>
                        )
                      }
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter and Control bar */}
            <div className="w-full bg-zinc-950/40 border border-zinc-900 rounded-2xl p-3.5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
              <div className="relative w-full md:w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search connections..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-[36px] pl-9 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all"
                />
              </div>

              <div className="flex w-full md:w-auto justify-start md:justify-end">
                <ClusterControls
                  totalItems={totalItems}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={(page) => setCurrentPage(page)}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  onClusterToggle={(enabled) => {
                    setIsClustered(enabled);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="w-full flex flex-wrap justify-between items-center gap-1 text-[10px] text-zinc-500 mb-2 px-2">
              <span className="flex items-center gap-1 min-w-0"><Info className="w-3 h-3 text-indigo-400 shrink-0" /> <span className="hidden sm:inline">Click once to select details • </span>Double click to re-center</span>
              <span className="font-semibold text-zinc-400 shrink-0">{filteredConnectedNodes.length} connections found</span>
            </div>

             <div className="w-full overflow-x-auto overflow-y-hidden border border-zinc-900 rounded-2xl bg-zinc-950/20 flex items-center justify-center p-2 scrollbar-thin">
              <svg 
                viewBox={`0 0 ${width} ${height}`} 
                className="w-full h-auto min-w-[500px] sm:min-w-[650px] max-w-full transition-all"
              >
                {/* Outer Glow filter for nodes */}
                <defs>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

              {/* Draw lines and nodes */}
              {activeThought && (
                <>
                  {/* Unclustered View: draw direct lines and nodes */}
                  {!isClustered && paginatedNodes.map((node, index) => {
                    const angle = (2 * Math.PI * index) / paginatedNodes.length;
                    const nodeX = centerX + radius * Math.cos(angle);
                    const nodeY = centerY + radius * Math.sin(angle);
                    const strokeColor = getCategoryColor(node.category);
                    const isSelected = selectedNodeId === node.thoughtId;

                    return (
                      <g key={`unclustered-${node.relationshipId}`}>
                        {/* Connecting Line */}
                        <line
                          x1={centerX}
                          y1={centerY}
                          x2={nodeX}
                          y2={nodeY}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? '4' : '2'}
                          strokeOpacity={isSelected ? '0.9' : '0.4'}
                          strokeDasharray={isSelected ? 'none' : '4,4'}
                          className="transition-all duration-300"
                        />
                        {/* Interactive hotspot line */}
                        <line
                          x1={centerX}
                          y1={centerY}
                          x2={nodeX}
                          y2={nodeY}
                          stroke="transparent"
                          strokeWidth="10"
                          className="cursor-pointer"
                        />
                        {/* Orbiting Thought Node */}
                        <g 
                          className="cursor-pointer"
                          onClick={() => handleNodeClick(node.thoughtId)}
                          onDoubleClick={() => handleNodeDoubleClick(node.thoughtId)}
                          onMouseEnter={() => {
                            setHoveredNodeId(node.thoughtId);
                            setHoveredType('graph');
                          }}
                          onMouseLeave={() => {
                            setHoveredNodeId(null);
                            setHoveredType(null);
                          }}
                        >
                          {/* Selected glow ring indicator */}
                          {isSelected && (
                            <circle
                              cx={nodeX}
                              cy={nodeY}
                              r={24}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth="3"
                              strokeOpacity="0.8"
                              className="animate-pulse"
                            />
                          )}
                          {/* Main Node body */}
                          <circle
                            cx={nodeX}
                            cy={nodeY}
                            r={isSelected ? 18 : 14}
                            fill="#0d0c15"
                            stroke={strokeColor}
                            strokeWidth="3"
                            className="transition-all duration-300"
                          />
                          {/* Score indicator badge */}
                          <circle
                            cx={nodeX + 11}
                            cy={nodeY - 11}
                            r={8}
                            fill="#6366f1"
                          />
                          <text
                            x={nodeX + 11}
                            y={nodeY - 8}
                            textAnchor="middle"
                            fill="white"
                            fontSize="8px"
                            fontWeight="bold"
                          >
                            {(node.score * 100).toFixed(0)}
                          </text>
                          {/* Text Label */}
                          <text
                            x={nodeX}
                            y={nodeY + (nodeY > centerY ? 32 : -24)}
                            textAnchor="middle"
                            fill={isSelected ? '#ffffff' : '#9ca3af'}
                            fontSize="10px"
                            fontWeight="600"
                            className="pointer-events-none select-none transition-all"
                          >
                            {node.summary.length > 20 
                              ? `${node.summary.substring(0, 18)}...` 
                              : node.summary}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Clustered View: draw category hubs and orbiting child nodes */}
                  {isClustered && Object.keys(clusters).map((categoryName, catIdx, catList) => {
                    const catAngle = (2 * Math.PI * catIdx) / catList.length;
                    const hubRadius = 115;
                    const hubX = centerX + hubRadius * Math.cos(catAngle);
                    const hubY = centerY + hubRadius * Math.sin(catAngle);
                    const hubColor = getCategoryColor(categoryName);
                    const catThoughts = clusters[categoryName];

                    return (
                      <g key={`cluster-hub-${categoryName}`}>
                        {/* Line from Center to Category Hub */}
                        <line
                          x1={centerX}
                          y1={centerY}
                          x2={hubX}
                          y2={hubY}
                          stroke={hubColor}
                          strokeWidth="3"
                          strokeOpacity="0.5"
                        />

                        {/* Hub Node */}
                        <circle
                          cx={hubX}
                          cy={hubY}
                          r={22}
                          fill="#08070d"
                          stroke={hubColor}
                          strokeWidth="3"
                          filter="url(#glow)"
                        />
                        <text
                          x={hubX}
                          y={hubY - 3}
                          textAnchor="middle"
                          fill="white"
                          fontSize="9px"
                          fontWeight="bold"
                        >
                          {categoryName}
                        </text>
                        <text
                          x={hubX}
                          y={hubY + 9}
                          textAnchor="middle"
                          fill={hubColor}
                          fontSize="8px"
                          fontWeight="bold"
                        >
                          ({catThoughts.length})
                        </text>

                        {/* Draw children orbiting around this hub */}
                        {catThoughts.map((node, nodeIdx) => {
                          const childAngle = (2 * Math.PI * nodeIdx) / catThoughts.length;
                          const childOrbitRadius = 45;
                          const childX = hubX + childOrbitRadius * Math.cos(childAngle);
                          const childY = hubY + childOrbitRadius * Math.sin(childAngle);
                          const isSelected = selectedNodeId === node.thoughtId;

                          return (
                            <g key={`cluster-child-${node.relationshipId}`}>
                              {/* Connection line from hub to child */}
                              <line
                                x1={hubX}
                                y1={hubY}
                                x2={childX}
                                y2={childY}
                                stroke={hubColor}
                                strokeWidth="1.5"
                                strokeOpacity="0.4"
                                strokeDasharray="2,2"
                              />

                              {/* Child Node */}
                              <g
                                className="cursor-pointer"
                                onClick={() => handleNodeClick(node.thoughtId)}
                                onDoubleClick={() => handleNodeDoubleClick(node.thoughtId)}
                                onMouseEnter={() => {
                                  setHoveredNodeId(node.thoughtId);
                                  setHoveredType('graph');
                                }}
                                onMouseLeave={() => {
                                  setHoveredNodeId(null);
                                  setHoveredType(null);
                                }}
                              >
                                <circle
                                  cx={childX}
                                  cy={childY}
                                  r={isSelected ? 14 : 9}
                                  fill="#0d0c15"
                                  stroke={hubColor}
                                  strokeWidth="2"
                                  className="transition-all duration-300"
                                />
                                {/* Label for child node */}
                                <text
                                  x={childX}
                                  y={childY + (childY > hubY ? 18 : -14)}
                                  textAnchor="middle"
                                  fill={isSelected ? '#ffffff' : '#9ca3af'}
                                  fontSize="8px"
                                  fontWeight="500"
                                  className="pointer-events-none select-none transition-all"
                                >
                                  {node.summary.length > 12 
                                    ? `${node.summary.substring(0, 10)}...` 
                                    : node.summary}
                                </text>
                              </g>
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                </>
              )}

              {/* Draw Center active node */}
              {activeThought && (
                <g 
                  className="cursor-pointer" 
                  onClick={() => setSelectedNodeId(null)}
                  onMouseEnter={() => {
                    setHoveredNodeId(activeThought.id);
                    setHoveredType('graph');
                  }}
                  onMouseLeave={() => {
                    setHoveredNodeId(null);
                    setHoveredType(null);
                  }}
                >
                  {/* Outer pulsating backdrop halo */}
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={36}
                    fill={getCategoryColor(activeThought.category)}
                    opacity="0.1"
                    className="animate-pulse"
                  />
                  {/* Node stroke */}
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={28}
                    fill="#08070d"
                    stroke={getCategoryColor(activeThought.category)}
                    strokeWidth="4"
                    filter="url(#glow)"
                  />
                  <text
                    x={centerX}
                    y={centerY + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10px"
                    fontWeight="bold"
                  >
                    Parent
                  </text>
                  <text
                    x={centerX}
                    y={centerY + 46}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10px"
                    fontWeight="bold"
                    className="text-glow-indigo"
                  >
                    Active Thought
                  </text>
                </g>
              )}
            </svg>
            </div>

            {/* Floating Rich Tooltip Overlay for Nodes */}
            {hoveredNodeId && hoveredNodeCoords && hoveredType === 'graph' && (
              <div 
                style={{ 
                  position: 'absolute', 
                  left: hoveredNodeCoords.x + 280 > (hoveredNodeCoords.rectWidth || 500)
                    ? Math.max(10, hoveredNodeCoords.x - 280 - 15)
                    : hoveredNodeCoords.x + 15, 
                  top: hoveredNodeCoords.y + 200 > (hoveredNodeCoords.rectHeight || 500)
                    ? Math.max(10, hoveredNodeCoords.y - 200 - 15)
                    : hoveredNodeCoords.y + 15,
                  pointerEvents: 'none'
                }}
                className="z-50 w-64 p-3 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl text-[10px] text-zinc-400 select-text animate-fadeIn space-y-1.5 backdrop-blur-md"
              >
                {(() => {
                  const node = thoughts.find(t => t.id === hoveredNodeId);
                  if (!node) return null;
                  const rel = activeThought?.connections?.find(c => c.thoughtId === node.id);
                  const score = rel ? `${(rel.score * 100).toFixed(0)}%` : null;
                  const tagsParsed = Array.isArray(node.tags) ? node.tags : [];
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                          style={{ 
                            backgroundColor: `${getCategoryColor(node.category)}20`,
                            color: getCategoryColor(node.category),
                            border: `1px solid ${getCategoryColor(node.category)}30`
                          }}
                        >
                          {node.category}
                        </span>
                        {score && (
                          <span className="text-[9px] text-indigo-400 font-bold font-mono">
                            Score: {score}
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-white text-[10.5px] leading-snug">{node.summary}</h5>
                      <p className="line-clamp-3 text-zinc-450 leading-relaxed text-[10px]">{node.content}</p>
                      {tagsParsed.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {tagsParsed.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            {/* Mobile View: Selected Thought Details Block (Visible only on mobile below map) */}
            {selectedNodeId && (
              <div className="lg:hidden w-full mt-6 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4.5 space-y-4">
                {(() => {
                  const node = thoughts.find(t => t.id === selectedNodeId);
                  if (!node) return null;
                  const rel = activeThought?.connections?.find(c => c.thoughtId === node.id);
                  const score = rel ? `${(rel.score * 100).toFixed(0)}%` : null;
                  const tagsParsed = Array.isArray(node.tags) ? node.tags : [];
                  
                  return (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                            style={{ 
                              backgroundColor: `${getCategoryColor(node.category)}20`,
                              color: getCategoryColor(node.category),
                              border: `1px solid ${getCategoryColor(node.category)}30`
                            }}
                          >
                            {node.category}
                          </span>
                          {score && (
                            <span className="text-[10px] text-indigo-400 font-extrabold font-mono">
                              {score} Match
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setActiveThoughtId(node.id);
                              setSelectedNodeId(null);
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Re-center Map
                          </button>
                          <button
                            onClick={() => setSelectedNodeId(null)}
                            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-white text-xs sm:text-sm">{node.summary}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed max-h-32 overflow-y-auto pr-1 bg-black/10 p-2.5 rounded-xl border border-zinc-900">{node.content}</p>

                      {tagsParsed.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tagsParsed.map((tag) => (
                            <span key={tag} className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded-lg">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Node Inspector Details (Right 5 Columns) */}
          <div className={`lg:col-span-5 ${activeTab === 'details' ? 'block animate-fadeIn' : 'hidden lg:block'}`}>
            
            {/* Connection Overview Card (Unified details layout) */}
            {activeThought && (
              <div 
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredNodeCoords({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    rectWidth: rect.width,
                    rectHeight: rect.height,
                  });
                }}
                onMouseLeave={() => {
                  setHoveredNodeId(null);
                  setHoveredType(null);
                }}
                className="glass-panel rounded-2xl p-6 border-zinc-800/80 shadow-md space-y-4 relative"
              >
                
                {/* Header operations */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('map')}
                      className="lg:hidden flex items-center gap-1 px-2.5 py-1 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer text-[10px] uppercase font-bold"
                    >
                      <Network className="w-3.5 h-3.5" /> Map
                    </button>
                    <span>Connection Overview</span>
                  </h3>

                  {/* Actions (Only when no child is selected) */}
                  {!selectedNodeThought && (
                    <div className="flex items-center gap-2">
                      {!isEditingActiveThought ? (
                        <>
                          <button
                            onClick={() => setIsEditingActiveThought(true)}
                            className="p-1 hover:bg-zinc-800/60 rounded text-zinc-400 hover:text-white transition-colors"
                            title="Edit Thought"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => triggerDeleteConfirm(activeThought.id)}
                            className="p-1 hover:bg-red-950/40 rounded text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete Thought"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUpdateThought(activeThought.id)}
                            className="p-1 hover:bg-emerald-950/40 rounded text-emerald-400 transition-colors"
                            title="Save Changes"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setIsEditingActiveThought(false)}
                            className="p-1 hover:bg-zinc-800/60 rounded text-zinc-400 hover:text-white transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Parent Focus Node display */}
                {/* Parent Focus Node block */}
                 <div className="space-y-3.5">
                   
                   {/* Parent metadata with collapsible toggle */}
                   <div className="bg-zinc-900/30 border border-zinc-900 p-3 rounded-xl space-y-2">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <span 
                           className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                           style={{ 
                             backgroundColor: `${getCategoryColor(activeThought.category)}20`,
                             color: getCategoryColor(activeThought.category),
                             border: `1px solid ${getCategoryColor(activeThought.category)}30`
                           }}
                         >
                           Parent Focus Node
                         </span>
                         <span className="text-[10px] text-zinc-500 font-medium">
                           Active Thought
                         </span>
                       </div>
                       
                       {!isEditingActiveThought && (
                         <button
                           onClick={() => setParentExpanded(!parentExpanded)}
                           className="p-1 hover:bg-zinc-800/60 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                           title={parentExpanded ? "Collapse Description" : "Expand Description"}
                         >
                           {parentExpanded ? (
                             <ChevronUp className="w-4 h-4" />
                           ) : (
                             <ChevronDown className="w-4 h-4" />
                           )}
                         </button>
                       )}
                     </div>

                     {isEditingActiveThought ? (
                       <div className="space-y-3 text-xs">
                         <div>
                           <label className="text-zinc-500 font-bold block mb-1">Category</label>
                           <select
                             value={editCategory}
                             onChange={(e) => setEditCategory(e.target.value)}
                             className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                           >
                             {['Idea', 'Goal', 'Reflection', 'Learning', 'Decision', 'Problem', 'Opportunity'].map(cat => (
                               <option key={cat} value={cat}>{cat}</option>
                             ))}
                           </select>
                         </div>

                         <div>
                           <label className="text-zinc-500 font-bold block mb-1">Summary</label>
                           <input
                             type="text"
                             value={editSummary}
                             onChange={(e) => setEditSummary(e.target.value)}
                             className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                           />
                         </div>

                         <div>
                           <label className="text-zinc-500 font-bold block mb-1">Content Details</label>
                           <textarea
                             value={editContent}
                             onChange={(e) => setEditContent(e.target.value)}
                             rows={4}
                             className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500 resize-none"
                           />
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-1">
                         <h4 className="text-xs font-bold text-white leading-snug select-text">
                           {activeThought.summary}
                         </h4>
                         {parentExpanded && (
                           <p className="text-zinc-400 text-[11px] leading-relaxed max-h-[120px] overflow-y-auto pr-1 bg-black/30 p-2.5 rounded-lg border border-zinc-800/80 select-text animate-fadeIn mt-2">
                             {activeThought.content}
                           </p>
                         )}
                       </div>
                     )}
                   </div>

                   <div className="border-t border-zinc-900" />

                   {/* Dynamic States inside card */}
                   {!selectedNodeThought ? (
                     // STATE A: Consolidated Overview (No child selected)
                     <div className="space-y-4 text-xs animate-fadeIn">
                       
                       {/* Connected children list as inline tags */}
                       <div className="space-y-2">
                         <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">
                           Connected Child Thoughts ({connectedNodes.length})
                         </label>
                         <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                           {connectedNodes.map((node) => (
                             <button
                               key={node.thoughtId}
                               type="button"
                               onClick={() => handleNodeClick(node.thoughtId)}
                               onMouseEnter={() => {
                                 setHoveredNodeId(node.thoughtId);
                                 setHoveredType('list');
                               }}
                               onMouseLeave={() => {
                                 setHoveredNodeId(null);
                                 setHoveredType(null);
                               }}
                               className="px-2.5 py-1.5 bg-zinc-900/40 hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800/60 focus:outline-none focus:ring-0 rounded-xl text-[10.5px] text-zinc-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer max-w-[220px] truncate"
                             >
                               <span 
                                 className="w-1.5 h-1.5 rounded-full shrink-0" 
                                 style={{ backgroundColor: getCategoryColor(node.fullThought?.category || '') }}
                               />
                               <span className="truncate font-semibold text-left">
                                 [{node.fullThought?.category}] {node.fullThought?.summary}
                               </span>
                               <span className="text-[9px] font-mono text-indigo-400 font-bold bg-indigo-950/20 px-1 py-0.5 rounded border border-indigo-900/10 shrink-0">
                                 {(node.score * 100).toFixed(0)}%
                               </span>
                             </button>
                           ))}
                         </div>
                       </div>

                       {/* Consolidated Connection Summary (Label outside scroll box to prevent overlap) */}
                       <div className="space-y-2 bg-indigo-950/15 border border-indigo-900/20 p-4 rounded-xl flex flex-col justify-start relative">
                         <label className="text-[9px] font-bold text-indigo-450 uppercase tracking-wider flex items-center gap-1.5 border-b border-indigo-900/30 pb-2 mb-1">
                           <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Consolidated Connection Summary
                         </label>
                         
                         {loadingConsolidated ? (
                           <div className="flex items-center justify-center py-6 gap-2">
                             <Loader2 className="w-4 h-4 animate-spin text-indigo-450" />
                             <span className="text-zinc-500 text-[10px]">Analyzing connection patterns...</span>
                           </div>
                         ) : consolidatedAnalysis ? (
                           <div className="max-h-[150px] overflow-y-auto pr-1 select-text space-y-2 pt-1">
                             <p className="text-zinc-200 font-semibold text-[11px] leading-relaxed">
                               {consolidatedAnalysis.header}
                             </p>
                             <p className="text-zinc-400 text-[11px] leading-relaxed">
                               {consolidatedAnalysis.detail}
                             </p>
                           </div>
                         ) : (
                           <p className="text-zinc-500 text-[11px]">No connection analysis available.</p>
                         )}
                       </div>
                     </div>
                   ) : (
                     // STATE B: Single Selected Child Details
                     <div className="space-y-4 text-xs animate-fadeIn">
                       
                       {/* Back button and Selected Child box */}
                       <div className="space-y-2">
                         <div className="flex justify-between items-center">
                           <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                             Selected Child Node
                           </label>
                           <button
                             onClick={() => setSelectedNodeId(null)}
                             className="text-[10px] text-indigo-450 hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
                           >
                             ‹ Back to Consolidated Summary
                           </button>
                         </div>

                         <div className="bg-emerald-950/10 border border-emerald-900/25 p-3 rounded-xl space-y-1.5">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-950/30 text-emerald-400 border border-emerald-900/30">
                                 {selectedNodeThought.category}
                               </span>
                               {selectedConnection && (
                                 <span className="text-[10px] text-zinc-400 font-mono">
                                   Match: <strong className="text-indigo-400 font-bold">{(selectedConnection.score * 100).toFixed(0)}%</strong>
                                 </span>
                               )}
                             </div>
                             
                             <button
                               onClick={() => setChildExpanded(!childExpanded)}
                               className="p-1 hover:bg-zinc-800/60 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                               title={childExpanded ? "Collapse Description" : "Expand Description"}
                             >
                               {childExpanded ? (
                                 <ChevronUp className="w-3.5 h-3.5" />
                               ) : (
                                 <ChevronDown className="w-3.5 h-3.5" />
                               )}
                             </button>
                           </div>
                           
                           <p className="text-zinc-200 font-semibold select-text">{selectedNodeThought.summary}</p>
                           {childExpanded && (
                             <p className="text-zinc-400 text-[11px] leading-relaxed select-text max-h-[120px] overflow-y-auto pr-1 bg-black/30 p-2.5 rounded-lg border border-zinc-800/80 mt-1 animate-fadeIn">
                               {selectedNodeThought.content}
                             </p>
                           )}
                         </div>
                       </div>

                       {/* Detailed Connection Summary Breakdown (Label outside scroll box to prevent overlap) */}
                       <div className="space-y-2 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/85 flex flex-col justify-start relative">
                         <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-2 mb-1">
                           <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Detailed Connection Analysis
                         </label>
                         
                         {loadingDetailed ? (
                           <div className="flex items-center justify-center py-10 gap-2">
                             <Loader2 className="w-4 h-4 animate-spin text-indigo-450" />
                             <span className="text-zinc-500 text-[10px]">JARVIS is analyzing thought linkages...</span>
                           </div>
                         ) : detailedAnalysis ? (
                           <div className="max-h-[220px] overflow-y-auto pr-1 select-text pt-1">
                             <div className="space-y-2.5 bg-black/10 p-3 rounded-lg border border-zinc-900/45 select-text">
                               <p className="text-zinc-250 text-[11px] leading-relaxed">
                                 <strong>What is the connection?</strong> {detailedAnalysis.connection}
                               </p>
                               <p className="text-zinc-300 text-[11px] leading-relaxed">
                                 <strong>How?</strong> {detailedAnalysis.how}
                               </p>
                               <p className="text-zinc-300 text-[11px] leading-relaxed">
                                 <strong>Why?</strong> {detailedAnalysis.why}
                               </p>
                               <p className="text-zinc-350 text-[11px] leading-relaxed">
                                 <strong>What is the potential outcome?</strong> {detailedAnalysis.outcome}
                               </p>
                               <p className="text-indigo-300 text-[11px] leading-relaxed pt-1.5 border-t border-zinc-900">
                                 <strong>Action Plan:</strong> {detailedAnalysis.actionPlan}
                               </p>
                             </div>
                           </div>
                         ) : (
                           <p className="text-zinc-500 text-[11px]">No detailed analysis available.</p>
                         )}
                       </div>
                     </div>
                   )}

                   <div className="border-t border-zinc-900 pt-2" />

                   {/* Derive Task & Sync to Action Center Form (ALWAYS present by default in State A and State B) */}
                   <div className="space-y-2 bg-indigo-950/10 border border-indigo-900/20 p-3.5 rounded-xl text-xs">
                     <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                       <Briefcase className="w-3.5 h-3.5" /> Derive Task & Sync to Action Center
                     </label>
                     
                     <div className="flex flex-col gap-2">
                       <input
                         type="text"
                         placeholder={selectedNodeThought ? "Task title for this connection..." : "Task title for this parent focus..."}
                         value={taskTitle}
                         onChange={(e) => setTaskTitle(e.target.value)}
                         className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
                       />
                       <div className="flex gap-2">
                         <select
                           value={taskPriority}
                           onChange={(e) => setTaskPriority(e.target.value as any)}
                           className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                         >
                           <option value="high">🔥 High Priority</option>
                           <option value="medium">⚡ Medium Priority</option>
                           <option value="low">💤 Low Priority</option>
                         </select>
                         <button
                           onClick={() => handleCreateTask(selectedNodeThought ? selectedNodeThought.id : activeThought.id)}
                           disabled={!taskTitle.trim()}
                           className="px-5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-indigo-500/20"
                         >
                           Add Task
                         </button>
                       </div>
                     </div>

                     {taskSuccessMessage && (
                       <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                         <Check className="w-3.5 h-3.5" /> {taskSuccessMessage}
                       </div>
                     )}
                    </div>

                  </div>

                  {/* Floating Rich Tooltip Overlay for List */}
                  {hoveredNodeId && hoveredNodeCoords && hoveredType === 'list' && (
                    <div 
                      style={{ 
                        position: 'absolute', 
                        left: hoveredNodeCoords.x + 280 > (hoveredNodeCoords.rectWidth || 400)
                          ? Math.max(10, hoveredNodeCoords.x - 280 - 15)
                          : hoveredNodeCoords.x + 15, 
                        top: hoveredNodeCoords.y + 200 > (hoveredNodeCoords.rectHeight || 400)
                          ? Math.max(10, hoveredNodeCoords.y - 200 - 15)
                          : hoveredNodeCoords.y + 15,
                        pointerEvents: 'none'
                      }}
                      className="z-50 w-64 p-3 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl text-[10px] text-zinc-400 select-text animate-fadeIn space-y-1.5 backdrop-blur-md"
                    >
                      {(() => {
                        const node = thoughts.find(t => t.id === hoveredNodeId);
                        if (!node) return null;
                        const rel = activeThought?.connections?.find(c => c.thoughtId === node.id);
                        const score = rel ? `${(rel.score * 100).toFixed(0)}%` : null;
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <span 
                                className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                                style={{ 
                                  backgroundColor: `${getCategoryColor(node.category)}20`,
                                  color: getCategoryColor(node.category),
                                  border: `1px solid ${getCategoryColor(node.category)}30`
                                }}
                              >
                                {node.category}
                              </span>
                              {score && (
                                <span className="text-[9px] text-indigo-400 font-bold font-mono">
                                  Match: {score}
                                </span>
                              )}
                            </div>
                            <h5 className="font-bold text-white text-[10.5px] leading-snug">{node.summary}</h5>
                            <p className="line-clamp-4 leading-relaxed text-[10px] text-zinc-450">{node.content}</p>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  </div>
                )}

          </div>

          </div>
        </div>
      )}

      {/* Create Link Modal */}
      {showCreateLinkModal && activeThought && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl border-zinc-800 p-6 space-y-6 shadow-2xl relative">
            
            <button
              onClick={() => setShowCreateLinkModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800/60 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-indigo-400" /> Add Connection Link
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Connect a parent source thought to a target child thought.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Source Thought Selector */}
              <div className="space-y-1 relative">
                <label className="text-zinc-500 font-bold block">Source Thought</label>
                
                {/* Custom Combobox Trigger */}
                <button
                  type="button"
                  onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
                  className="w-full h-[38px] bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-3 text-left text-xs text-white placeholder-zinc-550 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate pr-2">
                    {selectedSourceId 
                      ? (() => {
                          const t = thoughts.find(th => th.id === selectedSourceId);
                          return t ? `[${t.category}] ${t.summary}` : '-- Choose a source thought --';
                        })()
                      : '-- Choose a source thought --'
                    }
                  </span>
                  <svg className="h-3 w-3 fill-none stroke-current text-zinc-400 shrink-0" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Combobox Dropdown Popover */}
                {sourceDropdownOpen && (
                  <>
                    {/* Click-out backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setSourceDropdownOpen(false)} />
                    
                    <div className="absolute left-0 top-full mt-1.5 z-50 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 space-y-2 max-h-60 flex flex-col backdrop-blur-md">
                      {/* Search box inside dropdown */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search source thoughts..."
                          value={sourceSearch}
                          onChange={(e) => setSourceSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800/80 rounded-lg text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Scrollable results list */}
                      <div className="overflow-y-auto flex-1 space-y-1 pr-1 max-h-40">
                        {thoughts
                          .filter(t => 
                            t.summary.toLowerCase().includes(sourceSearch.toLowerCase()) || 
                            t.category.toLowerCase().includes(sourceSearch.toLowerCase())
                          )
                          .map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedSourceId(t.id);
                                // If target was selected to this, clear it
                                if (selectedTargetId === t.id) {
                                  setSelectedTargetId('');
                                }
                                setSourceDropdownOpen(false);
                                setSourceSearch('');
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                                t.id === selectedSourceId
                                  ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-300 font-semibold'
                                  : 'bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400'
                              }`}
                            >
                              <span className="truncate pr-2">[{t.category}] {t.summary}</span>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Target Thought Selector */}
              <div className="space-y-1 relative">
                <label className="text-zinc-500 font-bold block">Target Thought</label>
                
                {/* Custom Combobox Trigger */}
                <button
                  type="button"
                  onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
                  disabled={!selectedSourceId}
                  className="w-full h-[38px] bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-3 text-left text-xs text-white placeholder-zinc-550 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500 transition-all flex items-center justify-between disabled:opacity-40 cursor-pointer"
                >
                  <span className="truncate pr-2">
                    {selectedTargetId 
                      ? (() => {
                          const t = thoughts.find(th => th.id === selectedTargetId);
                          return t ? `[${t.category}] ${t.summary}` : '-- Choose a thought --';
                        })()
                      : selectedSourceId 
                        ? '-- Choose a thought to connect --'
                        : '-- Select a source thought first --'
                    }
                  </span>
                  <svg className="h-3 w-3 fill-none stroke-current text-zinc-400 shrink-0" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Combobox Dropdown Popover */}
                {targetDropdownOpen && selectedSourceId && (
                  <>
                    {/* Click-out backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setTargetDropdownOpen(false)} />
                    
                    <div className="absolute left-0 top-full mt-1.5 z-50 w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 space-y-2 max-h-60 flex flex-col backdrop-blur-md">
                      {/* Search box inside dropdown */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search thoughts..."
                          value={targetSearch}
                          onChange={(e) => setTargetSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800/80 rounded-lg text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Scrollable results list */}
                      <div className="overflow-y-auto flex-1 space-y-1 pr-1 max-h-40">
                        {thoughts
                          .filter(t => t.id !== selectedSourceId && !(thoughts.find(th => th.id === selectedSourceId)?.connections || []).some(c => c.thoughtId === t.id))
                          .filter(t => 
                            t.summary.toLowerCase().includes(targetSearch.toLowerCase()) || 
                            t.category.toLowerCase().includes(targetSearch.toLowerCase())
                          )
                          .map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedTargetId(t.id);
                                setTargetDropdownOpen(false);
                                setTargetSearch('');
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                                t.id === selectedTargetId
                                  ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-300 font-semibold'
                                  : 'bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400'
                              }`}
                            >
                              <span className="truncate pr-2">[{t.category}] {t.summary}</span>
                            </button>
                          ))
                        }
                        {thoughts
                          .filter(t => t.id !== selectedSourceId && !(thoughts.find(th => th.id === selectedSourceId)?.connections || []).some(c => c.thoughtId === t.id))
                          .filter(t => 
                            t.summary.toLowerCase().includes(targetSearch.toLowerCase()) || 
                            t.category.toLowerCase().includes(targetSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="text-center text-zinc-600 text-xs py-4">No thoughts found</div>
                          )
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Connection Description (Optional) */}
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-bold block">Connection Description (Optional)</label>
                <textarea
                  placeholder="Explain why these thoughts are connected, how they impact each other..."
                  value={newLinkDescription}
                  onChange={(e) => setNewLinkDescription(e.target.value)}
                  rows={2}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Match Strength / Score Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-zinc-500 font-bold">Connection Match Score</label>
                  <span className="font-mono font-bold text-indigo-400">{(newLinkScore * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={newLinkScore}
                  onChange={(e) => setNewLinkScore(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreateLinkModal(false)}
                className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRelationship}
                disabled={!selectedTargetId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-indigo-500/20 cursor-pointer"
              >
                Create Connection
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
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteTargetId(null);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-950/20 text-red-500 border border-red-900/35 rounded-xl shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-md font-bold text-white leading-tight">
                  Delete Thought?
                </h3>
                <p className="text-xs text-zinc-450 leading-relaxed">
                  Are you sure you want to delete this thought? This will permanently delete it and remove all its connection links. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-2 text-xs">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTargetId(null);
                }}
                className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 rounded-xl font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-red-500/20 cursor-pointer"
              >
                Delete Thought
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
