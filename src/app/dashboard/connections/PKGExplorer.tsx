'use client';

import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Search, 
  Loader2, 
  Cpu, 
  Briefcase, 
  User, 
  Target, 
  Lightbulb, 
  Info, 
  ArrowRight, 
  Sparkles,
  Calendar
} from 'lucide-react';

interface Entity {
  id: string;
  name: string;
  type: 'Project' | 'Technology' | 'Person' | 'Goal' | 'Concept';
  description: string | null;
  aliases: string[];
  activation: number;
  createdAt: number;
  updatedAt: number;
}

interface EntityRel {
  id: string;
  relationshipType: 'Supports' | 'Contradicts' | 'Continues' | 'Implements' | 'Inspired By' | 'Depends On' | 'Blocks' | 'Solves' | 'Questions' | 'References';
  confidence: number;
  reason: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  sourceEntity: { id: string; name: string; type: string };
  targetEntity: { id: string; name: string; type: string };
}

interface EntityDetail {
  entity: Entity;
  relationships: EntityRel[];
  thoughts: Array<{
    id: string;
    content: string;
    summary: string;
    category: string;
    sentiment: string;
    tags: string[];
    createdAt: number;
  }>;
}

export function PKGExplorer() {
  const [entitiesList, setEntitiesList] = useState<Entity[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [searchEntityQuery, setSearchEntityQuery] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [entityDetails, setEntityDetails] = useState<EntityDetail | null>(null);
  const [loadingEntityDetails, setLoadingEntityDetails] = useState(false);

  const fetchEntities = async () => {
    setLoadingEntities(true);
    try {
      const res = await fetch('/api/entities');
      if (res.ok) {
        const data = await res.json();
        const list = data.entities || [];
        setEntitiesList(list);
        if (list.length > 0 && !selectedEntityId) {
          setSelectedEntityId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching entities list:', err);
    } finally {
      setLoadingEntities(false);
    }
  };

  const fetchEntityDetails = async (id: string) => {
    setLoadingEntityDetails(true);
    try {
      const res = await fetch(`/api/entities/${id}`);
      if (res.ok) {
        const data = await res.json();
        setEntityDetails(data);
      }
    } catch (err) {
      console.error('Error fetching entity details:', err);
    } finally {
      setLoadingEntityDetails(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  useEffect(() => {
    if (selectedEntityId) {
      fetchEntityDetails(selectedEntityId);
    } else {
      setEntityDetails(null);
    }
  }, [selectedEntityId]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Entities Searchable list */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 border-zinc-800/80 flex flex-col bg-zinc-950/20 shadow-xl min-h-[550px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Normalized Concepts
            </h3>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 font-semibold">
              {entitiesList.length} Entities
            </span>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search entities, aliases or types..."
              value={searchEntityQuery}
              onChange={(e) => setSearchEntityQuery(e.target.value)}
              className="w-full h-[38px] pl-9 pr-4 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all"
            />
          </div>

          {loadingEntities ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
              <span className="text-zinc-550 text-xs">Loading entities...</span>
            </div>
          ) : entitiesList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 border border-dashed border-zinc-850 rounded-xl p-6 text-center">
              <Cpu className="w-10 h-10 text-zinc-700 mb-2 mx-auto" />
              <p className="text-zinc-400 text-xs font-semibold">No entities extracted yet</p>
              <p className="text-zinc-500 text-[10px] max-w-xs mt-1 mx-auto leading-relaxed">
                Captured thoughts will automatically trigger background entity extraction in the slow path.
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[500px] pr-1">
              {entitiesList
                .filter(e => 
                  e.name.toLowerCase().includes(searchEntityQuery.toLowerCase()) ||
                  e.type.toLowerCase().includes(searchEntityQuery.toLowerCase()) ||
                  e.aliases.some(a => a.toLowerCase().includes(searchEntityQuery.toLowerCase()))
                )
                .map((ent) => {
                  const isSelected = selectedEntityId === ent.id;
                  
                  let typeColor = 'text-amber-400 border-amber-500/20 bg-amber-500/5';
                  let typeIcon = <Lightbulb className="w-3.5 h-3.5" />;
                  
                  if (ent.type === 'Technology') {
                    typeColor = 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5';
                    typeIcon = <Cpu className="w-3.5 h-3.5" />;
                  } else if (ent.type === 'Project') {
                    typeColor = 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5';
                    typeIcon = <Briefcase className="w-3.5 h-3.5" />;
                  } else if (ent.type === 'Person') {
                    typeColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
                    typeIcon = <User className="w-3.5 h-3.5" />;
                  } else if (ent.type === 'Goal') {
                    typeColor = 'text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/5';
                    typeIcon = <Target className="w-3.5 h-3.5" />;
                  }

                  return (
                    <div
                      key={ent.id}
                      onClick={() => setSelectedEntityId(ent.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'bg-indigo-600/10 border-indigo-500/40 shadow-md shadow-indigo-500/5'
                          : 'bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider ${typeColor}`}>
                            {typeIcon} {ent.type}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate">{ent.name}</h4>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-1">{ent.description || 'No description provided.'}</p>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">Activation</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-zinc-850 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                              style={{ width: `${Math.min((ent.activation || 1.0) * 50, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-indigo-300">
                            {Math.round(Math.min((ent.activation || 1.0) * 50, 100))}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right Column: Entity Details */}
        <div className="lg:col-span-5 space-y-6">
          {loadingEntityDetails ? (
            <div className="glass-panel rounded-2xl p-6 border-zinc-800/80 flex flex-col items-center justify-center py-40">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
              <span className="text-zinc-550 text-xs">Syncing entity metadata...</span>
            </div>
          ) : !entityDetails ? (
            <div className="glass-panel rounded-2xl p-6 border-zinc-800/80 text-center py-20">
              <Info className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-500 text-xs">Select an entity to inspect its knowledge relationships.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Entity Metadata Card */}
              <div className="glass-panel rounded-2xl p-5 border-zinc-800/80 bg-zinc-950/20 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Concept Node</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{entityDetails.entity.name}</h3>
                  <p className="text-xs text-zinc-350 leading-relaxed">{entityDetails.entity.description || 'No description provided.'}</p>
                </div>

                {entityDetails.entity.aliases && entityDetails.entity.aliases.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Spelling Aliases</span>
                    <div className="flex flex-wrap gap-1.5">
                      {entityDetails.entity.aliases.map((alias, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800/50 text-[10px] text-zinc-400 font-mono">
                          {alias}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Explainable Relationships */}
              <div className="glass-panel rounded-2xl p-5 border-zinc-800/80 bg-zinc-950/20 space-y-4">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Explainable Relationships</span>
                
                {entityDetails.relationships.length === 0 ? (
                  <p className="text-xs text-zinc-550 py-2 italic font-medium">No semantic connections registered for this node yet.</p>
                ) : (
                  <div className="space-y-3">
                    {entityDetails.relationships.map((rel) => {
                      const isSource = rel.sourceEntity.id === entityDetails.entity.id;
                      const partner = isSource ? rel.targetEntity : rel.sourceEntity;

                      return (
                        <div key={rel.id} className="p-3.5 rounded-xl border border-zinc-800 bg-black/10 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              {isSource ? (
                                <>
                                  <span>{entityDetails.entity.name}</span>
                                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                                  <span className="text-zinc-350">{partner.name}</span>
                                </>
                              ) : (
                                <>
                                  <span>{partner.name}</span>
                                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                                  <span className="text-zinc-350">{entityDetails.entity.name}</span>
                                </>
                              )}
                            </span>
                            
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                                {rel.relationshipType}
                              </span>
                              <span className="text-[10px] text-indigo-400 font-mono font-bold">
                                {Math.round(rel.confidence * 100)}%
                              </span>
                            </div>
                          </div>

                          <p className="text-[11px] text-zinc-450 leading-relaxed bg-zinc-950/40 p-2 rounded-lg border border-zinc-900/60">{rel.reason}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="glass-panel rounded-2xl p-5 border-zinc-800/80 bg-zinc-950/20 space-y-4">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Idea Evolution Timeline</span>

                {entityDetails.thoughts.length === 0 ? (
                  <p className="text-xs text-zinc-550 py-2 italic font-medium">No supporting thoughts captured yet.</p>
                ) : (
                  <div className="relative pl-4 border-l border-zinc-900 space-y-5">
                    {entityDetails.thoughts
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map((t) => (
                        <div key={t.id} className="relative space-y-1.5 animate-fadeIn">
                          <span className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border border-indigo-500 bg-[#0d0c15]" />
                          
                          <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                            <span className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded font-sans uppercase tracking-wide font-bold">{t.category}</span>
                          </div>

                          <h4 className="text-xs font-bold text-white leading-snug">{t.summary}</h4>
                          <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-900/20 p-2.5 rounded-lg border border-zinc-850/50">{t.content}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
