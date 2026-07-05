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
  AlertCircle
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
  
  // Expandable arrow state
  const [isConnectionExpanded, setIsConnectionExpanded] = useState(false);
  
  // Task creation states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskSuccessMessage, setTaskSuccessMessage] = useState('');
  
  // Modal states
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [newLinkScore, setNewLinkScore] = useState(0.8);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  
  // Editing states
  const [isEditingActiveThought, setIsEditingActiveThought] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editContent, setEditContent] = useState('');
  
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [editRelScore, setEditRelScore] = useState(0.8);

  useEffect(() => {
    fetchThoughts();
  }, []);

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

  const handleDeleteThought = async (id: string) => {
    if (!confirm('Are you sure you want to delete this thought? This will permanently delete it and all its connections.')) return;
    try {
      const res = await fetch(`/api/thoughts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const remaining = thoughts.filter(t => t.id !== id);
        setThoughts(remaining);
        setIsEditingActiveThought(false);
        setSelectedNodeId(null);
        if (remaining.length > 0) {
          setActiveThoughtId(remaining[0].id);
        } else {
          setActiveThoughtId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete thought:', err);
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
        }),
      });
      if (res.ok) {
        setShowCreateLinkModal(false);
        setSelectedTargetId('');
        setNewLinkScore(0.8);
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

  // Sync edit fields when active thought changes
  useEffect(() => {
    if (activeThought) {
      setEditCategory(activeThought.category);
      setEditSummary(activeThought.summary);
      setEditContent(activeThought.content);
    }
  }, [activeThoughtId, thoughts]);

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

  // Calculate dynamic connections insight client-side
  const connectionInsight = activeThought && selectedNodeThought && selectedConnection
    ? (() => {
        const pCat = activeThought.category;
        const cCat = selectedNodeThought.category;
        const matchScore = (selectedConnection.score * 100).toFixed(0);

        let details = `This bridges a ${pCat.toLowerCase()} ("${activeThought.summary.substring(0, 30)}...") and a ${cCat.toLowerCase()} ("${selectedNodeThought.summary.substring(0, 30)}...") with a ${matchScore}% correlation.`;
        let why = `The local AI similarity engine linked these nodes because they share cross-cutting goals and related technical or planning terms.`;
        let outcome = 'Connecting these nodes helps expose implicit patterns. Fulfilling the connected thought will directly build progress towards the parent focus thought.';
        let derivation = 'Create an action item for this connection to define explicit tasks on your roadmap.';

        if (pCat === 'Idea' && cCat === 'Goal') {
          outcome = 'Linking this idea to this goal maps a dream to a clear objective. Achieving the goal validates the idea.';
          derivation = 'Convert the child goal into action-oriented milestones to begin prototype execution.';
        } else if (pCat === 'Problem' && cCat === 'Idea') {
          outcome = 'The child idea presents a potential solution to help resolve this active parent problem.';
          derivation = 'Draft a proof-of-concept testing plan to verify if the idea successfully addresses the problem constraints.';
        } else if (pCat === 'Decision' && cCat === 'Reflection') {
          outcome = 'This reflection provides critical retrospective journal data on a past decision outcome.';
          derivation = 'Review the decision log outcome notes and update retrospect status to completed.';
        }

        return { details, why, outcome, derivation };
      })()
    : null;

  // Handle single node click (selection)
  const handleNodeClick = (thoughtId: string) => {
    setSelectedNodeId(thoughtId);
    setIsConnectionExpanded(false); // Reset expand state when switching nodes
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedSourceId(activeThoughtId || '');
              setShowCreateLinkModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-indigo-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Connection
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Visual Graph View (Left 7 Columns) */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 border-zinc-800/80 flex flex-col items-center justify-center relative overflow-hidden select-none bg-zinc-950/20 shadow-xl">
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
                <span className="truncate pr-2 font-semibold">
                  {activeThought 
                    ? `[${activeThought.category}] ${activeThought.summary}`
                    : '-- Select a parent thought --'
                  }
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
                                <span 
                                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                                  style={{ backgroundColor: getCategoryColor(t.category) }}
                                />
                                <span className="truncate font-medium">[{t.category}] {t.summary}</span>
                              </span>
                              <span 
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 border ${
                                  connCount > 0
                                    ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/20'
                                    : 'bg-zinc-900/40 text-zinc-500 border-zinc-800/60'
                                }`}
                              >
                                {connCount} links
                              </span>
                            </button>
                          );
                        })
                      }
                      {thoughts
                        .filter(t => 
                          t.summary.toLowerCase().includes(focusSearch.toLowerCase()) || 
                          t.category.toLowerCase().includes(focusSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="text-center text-zinc-650 text-xs py-6">No thoughts found</div>
                        )
                      }
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Filter and Control bar */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-4">
              <div className="relative flex-1 w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search connections..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-[38px] pl-9 pr-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-xs text-white placeholder-zinc-550 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all"
                />
              </div>

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

            <div className="w-full flex justify-between items-center text-[10px] text-zinc-500 mb-2 px-2">
              <span className="flex items-center gap-1"><Info className="w-3 h-3 text-indigo-400" /> Click once to select details • Double click to re-center</span>
              <span className="font-semibold text-zinc-400">{filteredConnectedNodes.length} connections found</span>
            </div>

            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-auto max-w-[520px]"
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
                >
                  <title>Click to clear selection</title>
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

          {/* Node Inspector Details (Right 5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Connection Overview (First Box - Top Right) */}
            {activeThought && (
              <div className="glass-panel rounded-2xl p-6 border-zinc-800/80 shadow-md space-y-4 relative">
                
                {/* Header operations */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Connection Overview
                  </h3>

                  {/* Actions & Expand toolbar */}
                  <div className="flex items-center gap-2">
                    {/* Expand Arrow when a child is selected */}
                    {selectedNodeThought && (
                      <button
                        onClick={() => setIsConnectionExpanded(!isConnectionExpanded)}
                        className="p-1 hover:bg-zinc-800/60 rounded text-zinc-400 hover:text-white transition-colors"
                        title={isConnectionExpanded ? 'Collapse Insight' : 'Expand Insight Details'}
                      >
                        {isConnectionExpanded ? (
                          <ChevronUp className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>
                    )}

                    {!selectedNodeThought && (
                      <>
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
                              onClick={() => handleDeleteThought(activeThought.id)}
                              className="p-1 hover:bg-red-950/40 rounded text-zinc-500 hover:text-red-400 transition-colors"
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
                      </>
                    )}
                  </div>
                </div>

                {/* Displaying Active Node Details or Parent-Child Overview */}
                <div className="space-y-3">
                  {selectedNodeThought && selectedConnection ? (
                    // Parent-Child Relation Overview Mode
                    <div className="space-y-3.5 text-xs">
                      <div className="bg-indigo-950/10 border border-indigo-900/30 p-3 rounded-xl space-y-1">
                        <label className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Parent Focus Node</label>
                        <p className="text-zinc-200 font-semibold truncate">{activeThought.summary}</p>
                      </div>

                      <div className="flex justify-center py-1">
                        <div className="h-6 w-0.5 bg-dashed border-l border-zinc-800" />
                      </div>

                      <div className="bg-emerald-950/10 border border-emerald-900/30 p-3 rounded-xl space-y-1">
                        <label className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Connected Child Node</label>
                        <p className="text-zinc-200 font-semibold truncate">{selectedNodeThought.summary}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-zinc-900 pt-3 text-[10px] text-zinc-500 font-mono">
                        <span>Connection Type: <strong className="text-zinc-300">Similarity Edge</strong></span>
                        <span>Match Strength: <strong className="text-indigo-400">{(selectedConnection.score * 100).toFixed(0)}%</strong></span>
                      </div>

                      {/* Expandable Section Details */}
                      {isConnectionExpanded && connectionInsight && (
                        <div className="space-y-4 pt-3 border-t border-zinc-900 animate-fadeIn">
                          
                          {/* AI Connections Insight */}
                          <div className="space-y-2 bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-850">
                            <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-indigo-400" /> JARVIS Synthesis Notes
                            </label>
                            <p className="text-zinc-300 text-[11px] leading-relaxed select-text">{connectionInsight.details}</p>
                            <p className="text-zinc-400 text-[11px] leading-relaxed pt-1.5 select-text"><strong>Analysis:</strong> {connectionInsight.outcome}</p>
                            <p className="text-zinc-500 text-[10px] leading-relaxed pt-1.5 italic select-text"><strong>Actionable:</strong> {connectionInsight.derivation}</p>
                          </div>

                          {/* Task Creation form */}
                          <div className="space-y-2 bg-indigo-950/10 border border-indigo-900/20 p-3.5 rounded-xl">
                            <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5" /> Derive Task & Sync to Action Center
                            </label>
                            
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Task title (e.g. Prototype verification...)"
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                              />
                              <select
                                value={taskPriority}
                                onChange={(e) => setTaskPriority(e.target.value as any)}
                                className="bg-zinc-900 border border-zinc-800 rounded-lg px-1 py-1 text-xs text-zinc-400 focus:outline-none"
                              >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                              <button
                                onClick={() => handleCreateTask(selectedNodeThought.id)}
                                disabled={!taskTitle.trim()}
                                className="px-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                              >
                                Add
                              </button>
                            </div>

                            {taskSuccessMessage && (
                              <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                                <Check className="w-3.5 h-3.5" /> {taskSuccessMessage}
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  ) : (
                    // Regular Active Node Details mode
                    <>
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
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                              style={{ 
                                backgroundColor: `${getCategoryColor(activeThought.category)}20`,
                                color: getCategoryColor(activeThought.category),
                                border: `1px solid ${getCategoryColor(activeThought.category)}30`
                              }}
                            >
                              {activeThought.category}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(activeThought.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <h3 className="text-md font-bold text-white leading-snug">
                              {activeThought.summary}
                            </h3>
                            <p className="text-zinc-400 text-xs leading-relaxed max-h-[140px] overflow-y-auto pr-1 bg-black/10 p-3 rounded-lg border border-zinc-900/60 select-text">
                              {activeThought.content}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Selected Thought Details (Second Box - Middle Right) */}
            <div className="glass-panel rounded-2xl p-6 border-zinc-800/80 shadow-md">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Selected Thought Details
              </h3>

              {selectedNodeThought ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span 
                      className="px-2 py-0.5 rounded font-bold text-[9px]"
                      style={{ 
                        backgroundColor: `${getCategoryColor(selectedNodeThought.category)}20`,
                        color: getCategoryColor(selectedNodeThought.category)
                      }}
                    >
                      {selectedNodeThought.category}
                    </span>

                    {/* Show connection score edit / delete options */}
                    {activeThought && selectedConnection && (() => {
                      const isEditingRel = editingRelationshipId === selectedConnection.relationshipId;

                      return (
                        <div className="flex items-center gap-2">
                          {isEditingRel ? (
                            <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                              <span className="text-[10px] text-zinc-400">Score:</span>
                              <input 
                                type="range" 
                                min="0.1" 
                                max="1.0" 
                                step="0.05"
                                value={editRelScore}
                                onChange={(e) => setEditRelScore(parseFloat(e.target.value))}
                                className="w-16 h-1 accent-indigo-500"
                              />
                              <span className="font-mono text-white text-[10px] font-bold">{(editRelScore * 100).toFixed(0)}%</span>
                              <button 
                                onClick={() => handleUpdateRelationshipScore(selectedConnection.relationshipId)}
                                className="text-emerald-400 p-0.5 hover:bg-zinc-800/80 rounded cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => setEditingRelationshipId(null)}
                                className="text-zinc-500 p-0.5 hover:bg-zinc-800/80 rounded cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-zinc-400">
                                Match: <strong className="text-indigo-400 font-bold">{(selectedConnection.score * 100).toFixed(0)}%</strong>
                              </span>
                              {/* Edit icon for relationship */}
                              <button
                                onClick={() => {
                                  setEditingRelationshipId(selectedConnection.relationshipId);
                                  setEditRelScore(selectedConnection.score);
                                }}
                                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white cursor-pointer"
                                title="Edit Match Strength"
                              >
                                <Sliders className="w-3 h-3" />
                              </button>
                              {/* Disconnect icon */}
                              <button
                                onClick={() => handleDeleteRelationship(selectedConnection.relationshipId)}
                                className="p-1 hover:bg-red-950/30 rounded text-zinc-650 hover:text-red-400 cursor-pointer"
                                title="Disconnect Link"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="space-y-1 bg-black/10 p-3 rounded-lg border border-zinc-900/60">
                    <p className="font-bold text-zinc-200">{selectedNodeThought.summary}</p>
                    <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-3 select-text">{selectedNodeThought.content}</p>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-500 text-xs py-2 text-center flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-zinc-600" /> Click any orbiting node in the map to display its details here.
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

    </div>
  );
}
