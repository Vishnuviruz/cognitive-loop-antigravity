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
  Eye
} from 'lucide-react';

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
        // Set latest thought as default active node
        if (data.thoughts && data.thoughts.length > 0) {
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

  const activeThought = thoughts.find((t) => t.id === activeThoughtId);
  const connectedNodes = activeThought
    ? activeThought.connections.map((c) => {
        const fullThought = thoughts.find((t) => t.id === c.thoughtId);
        return {
          ...c,
          fullThought,
        };
      })
    : [];

  // Width & height of the SVG viewport
  const width = 600;
  const height = 450;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 160; // Distance of connected nodes from center

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white text-glow-indigo">
          Organic Mind Map
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          A visual graph of your thoughts. Click on outer nodes to re-center the map and explore related concepts.
        </p>
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

            <div className="w-full flex justify-between items-center text-xs text-zinc-500 mb-4 px-2">
              <span className="flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Double click node to re-center</span>
              <span className="font-medium text-zinc-400">{connectedNodes.length} connections found</span>
            </div>

            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-auto max-w-[500px]"
            >
              {/* Outer Glow filter for nodes */}
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Draw connection lines first so they sit below nodes */}
              {activeThought && connectedNodes.map((node, index) => {
                const angle = (2 * Math.PI * index) / connectedNodes.length;
                const nodeX = centerX + radius * Math.cos(angle);
                const nodeY = centerY + radius * Math.sin(angle);
                
                // Color according to node category
                const strokeColor = getCategoryColor(node.category);

                return (
                  <g key={`line-${node.thoughtId}`}>
                    {/* Pulsing connection line */}
                    <line
                      x1={centerX}
                      y1={centerY}
                      x2={nodeX}
                      y2={nodeY}
                      stroke={strokeColor}
                      strokeWidth="2"
                      strokeOpacity="0.4"
                      strokeDasharray="4,4"
                      className="animate-pulse"
                    />
                    {/* Hover hotspot line */}
                    <line
                      x1={centerX}
                      y1={centerY}
                      x2={nodeX}
                      y2={nodeY}
                      stroke="transparent"
                      strokeWidth="10"
                      className="cursor-pointer"
                    />
                  </g>
                );
              })}

              {/* Draw connected peripheral nodes */}
              {activeThought && connectedNodes.map((node, index) => {
                const angle = (2 * Math.PI * index) / connectedNodes.length;
                const nodeX = centerX + radius * Math.cos(angle);
                const nodeY = centerY + radius * Math.sin(angle);
                const color = getCategoryColor(node.category);

                const isHovered = hoveredNode?.id === node.thoughtId;

                return (
                  <g 
                    key={`node-${node.thoughtId}`}
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
                      stroke={color}
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
                      stroke={color}
                      strokeWidth="3"
                      className="transition-all duration-300"
                    />
                    {/* Score indicator badge */}
                    <circle
                      cx={nodeX + 10}
                      cy={nodeY - 10}
                      r={7}
                      fill="#6366f1"
                    />
                    <text
                      x={nodeX + 10}
                      y={nodeY - 7}
                      textAnchor="middle"
                      fill="white"
                      fontSize="7px"
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
                      fontSize="9px"
                      fontWeight="600"
                      className="pointer-events-none fill-zinc-400 group-hover:fill-white select-none transition-all"
                    >
                      {node.summary.length > 20 
                        ? `${node.summary.substring(0, 18)}...` 
                        : node.summary}
                    </text>
                  </g>
                );
              })}

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
                  {/* Center icon / Brain node */}
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={12}
                    fill={getCategoryColor(activeThought.category)}
                    opacity="0.2"
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
                    Active Thought
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Node Inspector Details (Right 5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Active Node Detail Card */}
            {activeThought && (
              <div className="glass-panel rounded-2xl p-6 border-zinc-800/80 shadow-md space-y-4">
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

            {/* Hover Node details / General List picker */}
            <div className="glass-panel rounded-2xl p-6 border-zinc-800/80 shadow-md">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Connection Details
              </h3>

              {hoveredNode ? (
                <div className="space-y-2 text-xs">
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
                    {activeThought && (
                      <span className="font-mono text-zinc-400">
                        Match Score: <strong className="text-indigo-400 font-bold">
                          {hoveredNode.id === activeThoughtId 
                            ? '100' 
                            : (activeThought.connections.find(c => c.thoughtId === hoveredNode.id)?.score || 0 * 100).toFixed(0)}%
                        </strong>
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-zinc-200">{hoveredNode.summary}</p>
                  <p className="text-zinc-500 text-[11px] leading-relaxed line-clamp-3">{hoveredNode.content}</p>
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
                    onClick={() => setActiveThoughtId(t.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                      t.id === activeThoughtId
                        ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-300 font-semibold'
                        : 'bg-transparent border-transparent hover:bg-zinc-900/40 text-zinc-400'
                    }`}
                  >
                    <span className="truncate pr-2">{t.summary}</span>
                    <span 
                      className="w-1.5 h-1.5 rounded-full shrink-0" 
                      style={{ backgroundColor: getCategoryColor(t.category) }}
                    />
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
