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
  Settings
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
  const [hoveredNode, setHoveredNode] = useState<Thought | null>(null);
  
  // Custom states for Sprint 1
  const [isClustered, setIsClustered] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [newLinkScore, setNewLinkScore] = useState(0.8);
  
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
        // Set latest thought as default active node if not set
        if (data.thoughts && data.thoughts.length > 0 && !activeThoughtId) {
          setActiveThoughtId(data.thoughts[0].id);
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
    if (!activeThoughtId || !selectedTargetId) return;
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thoughtId1: activeThoughtId,
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
        setHoveredNode(null);
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
            A visual, paginated, and cluster-capable mind map of your thoughts. Click on outer nodes to re-center.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateLinkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-indigo-500/20"
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
                onPageChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                }}
                onClusterToggle={(enabled) => {
                  setIsClustered(enabled);
                  setCurrentPage(1);
                }}
              />
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
                    const isHovered = hoveredNode?.id === node.thoughtId;

                    return (
                      <g key={`unclustered-${node.relationshipId}`}>
                        {/* Connecting Line */}
                        <line
                          x1={centerX}
                          y1={centerY}
                          x2={nodeX}
                          y2={nodeY}
                          stroke={strokeColor}
                          strokeWidth={isHovered ? '3' : '2'}
                          strokeOpacity={isHovered ? '0.7' : '0.4'}
                          strokeDasharray={isHovered ? 'none' : '4,4'}
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
                          onClick={() => setActiveThoughtId(node.thoughtId)}
                          onMouseEnter={() => node.fullThought && setHoveredNode(node.fullThought)}
                          onMouseLeave={() => setHoveredNode(null)}
                        >
                          {/* Outer glow ring on hover */}
                          <circle
                            cx={nodeX}
                            cy={nodeY}
                            r={isHovered ? 24 : 18}
                            fill="transparent"
                            stroke={strokeColor}
                            strokeWidth="2"
                            strokeOpacity="0.8"
                            className="transition-all duration-300"
                          />
                          {/* Main Node body */}
                          <circle
                            cx={nodeX}
                            cy={nodeY}
                            r={isHovered ? 18 : 14}
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
                            fill="#9ca3af"
                            fontSize="10px"
                            fontWeight="600"
                            className="pointer-events-none select-none transition-all fill-zinc-400 hover:fill-white"
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
                          const isHovered = hoveredNode?.id === node.thoughtId;

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
                                onClick={() => setActiveThoughtId(node.thoughtId)}
                                onMouseEnter={() => node.fullThought && setHoveredNode(node.fullThought)}
                                onMouseLeave={() => setHoveredNode(null)}
                              >
                                <circle
                                  cx={childX}
                                  cy={childY}
                                  r={isHovered ? 12 : 9}
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
                                  fill="#9ca3af"
                                  fontSize="8px"
                                  fontWeight="500"
                                  className="pointer-events-none select-none transition-all fill-zinc-400 hover:fill-white"
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
                  className="cursor-default"
                  onMouseEnter={() => setHoveredNode(activeThought)}
                  onMouseLeave={() => setHoveredNode(null)}
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
                    fontSize="11px"
                    fontWeight="bold"
                  >
                    Brain
                  </text>
                  <text
                    x={centerX}
                    y={centerY + 46}
                    textAnchor="middle"
                    fill="white"
                    fontSize="11px"
                    fontWeight="bold"
                    className="text-glow-indigo"
                  >
                    Active Node
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Node Inspector Details (Right 5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Active Node Detail Card */}
            {activeThought && (
              <div className="glass-panel rounded-2xl p-6 border-zinc-800/80 shadow-md space-y-4 relative">
                
                {/* Header operations */}
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
                      {activeThought.category}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(activeThought.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions toolbar */}
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
                  </div>
                </div>

                {/* Body details / Edit modes */}
                <div className="space-y-3">
                  {isEditingActiveThought ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-zinc-500 font-bold block mb-1">Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-white"
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
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-zinc-500 font-bold block mb-1">Content Details</label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={4}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <h3 className="text-md font-bold text-white leading-snug">
                        {activeThought.summary}
                      </h3>
                      <p className="text-zinc-400 text-xs leading-relaxed max-h-[140px] overflow-y-auto pr-1 bg-black/10 p-3 rounded-lg border border-zinc-900/60 select-text">
                        {activeThought.content}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hover Node details / Connection actions */}
            <div className="glass-panel rounded-2xl p-6 border-zinc-800/80 shadow-md">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Connection Details
              </h3>

              {hoveredNode ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span 
                      className="px-2 py-0.5 rounded font-bold text-[9px]"
                      style={{ 
                        backgroundColor: `${getCategoryColor(hoveredNode.category)}20`,
                        color: getCategoryColor(hoveredNode.category)
                      }}
                    >
                      {hoveredNode.category}
                    </span>

                    {/* Show score editing or details */}
                    {activeThought && (() => {
                      const rel = activeThought.connections.find(c => c.thoughtId === hoveredNode.id);
                      if (!rel) return null;

                      const isEditingRel = editingRelationshipId === rel.relationshipId;

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
                                onClick={() => handleUpdateRelationshipScore(rel.relationshipId)}
                                className="text-emerald-400 p-0.5 hover:bg-zinc-800/80 rounded"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => setEditingRelationshipId(null)}
                                className="text-zinc-500 p-0.5 hover:bg-zinc-800/80 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-zinc-400">
                                Match: <strong className="text-indigo-400 font-bold">{(rel.score * 100).toFixed(0)}%</strong>
                              </span>
                              {/* Edit icon for relationship */}
                              <button
                                onClick={() => {
                                  setEditingRelationshipId(rel.relationshipId);
                                  setEditRelScore(rel.score);
                                }}
                                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white"
                                title="Edit Match Strength"
                              >
                                <Sliders className="w-3 h-3" />
                              </button>
                              {/* Disconnect icon */}
                              <button
                                onClick={() => handleDeleteRelationship(rel.relationshipId)}
                                className="p-1 hover:bg-red-950/30 rounded text-zinc-650 hover:text-red-400"
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
                    <p className="font-bold text-zinc-200">{hoveredNode.summary}</p>
                    <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-3 select-text">{hoveredNode.content}</p>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-500 text-xs py-2 text-center">
                  Hover over any node in the graph to display its summary and similarity match scores.
                </div>
              )}
            </div>

            {/* Quick Picker List */}
            <div className="glass-panel rounded-2xl p-6 border-zinc-800/80 shadow-md space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-zinc-400" /> Mind Map Node Index
              </h3>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {thoughts.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveThoughtId(t.id);
                      setIsEditingActiveThought(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                      t.id === activeThoughtId
                        ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-300 font-semibold'
                        : 'bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span 
                        className="w-1.5 h-1.5 rounded-full shrink-0" 
                        style={{ backgroundColor: getCategoryColor(t.category) }}
                      />
                      <span className="truncate">{t.summary}</span>
                    </div>
                    <span 
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 border ${
                        t.connections && t.connections.length > 0
                          ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/20'
                          : 'bg-zinc-900/40 text-zinc-500 border-zinc-800/60'
                      }`}
                    >
                      {t.connections?.length || 0} links
                    </span>
                  </button>
                ))}
              </div>
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
                Connect the active thought to another thought in your database.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Active Thought Info */}
              <div className="bg-indigo-950/20 border border-indigo-900/40 p-3 rounded-xl">
                <label className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">Active Thought</label>
                <div className="text-zinc-200 font-semibold truncate">{activeThought.summary}</div>
              </div>

              {/* Target Thought Selector */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block">Target Thought</label>
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose a thought to connect --</option>
                  {thoughts
                    .filter(t => t.id !== activeThoughtId && !activeThought.connections.some(c => c.thoughtId === t.id))
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        [{t.category}] {t.summary.length > 50 ? `${t.summary.substring(0, 48)}...` : t.summary}
                      </option>
                    ))
                  }
                </select>
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
                className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRelationship}
                disabled={!selectedTargetId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-indigo-500/20"
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
