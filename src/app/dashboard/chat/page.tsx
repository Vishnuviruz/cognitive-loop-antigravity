'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Loader2, 
  BrainCircuit, 
  User, 
  Sparkles,
  Link as LinkIcon,
  Trash2,
  HelpCircle,
  Clock,
  BookOpen
} from 'lucide-react';

interface ContextItem {
  id: string;
  summary: string;
  category: string;
  score: number;
  createdAt: number;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  contextUsed?: ContextItem[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const samplePrompts = [
    'What startup ideas have I explored?',
    'What recurring concerns do you notice in my thoughts?',
    'What are the key goals I have set for myself?',
    'What lessons keep appearing in my learnings?',
  ];

  // Load persistent chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch('/api/chat/messages');
        if (res.ok) {
          const data = await res.json();
          const restored: Message[] = data.messages.map((m: any) => ({
            role: m.role as 'user' | 'model',
            text: m.content,
            contextUsed: m.contextUsed || undefined,
          }));
          setMessages(restored);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  // Auto-scroll to bottom of chat when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleClearChat = async () => {
    if (!confirm('Clear all chat history? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/chat/messages', { method: 'DELETE' });
      if (res.ok) {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    // Build chat history matching route expectations: { role: 'user'|'model', parts: string[] }
    const historyPayload = messages.map((m) => ({
      role: m.role,
      parts: [m.text],
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: data.message || 'Apologies, I encountered an error searching your memory files.',
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: data.text,
            contextUsed: data.contextUsed,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'Apologies, a network interruption occurred. Please check your connection.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  const renderMessageText = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        const trimmed = line.trim();
        // Check for bullet lists
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          return (
            <li key={index} className="ml-4 list-disc text-zinc-300 text-xs py-0.5 pl-1 leading-relaxed">
              {trimmed.replace(/^[-*]\s*/, '')}
            </li>
          );
        }
        // Check for numbered lists
        if (/^\d+\.\s*/.test(trimmed)) {
          return (
            <li key={index} className="ml-4 list-decimal text-zinc-300 text-xs py-0.5 pl-1 leading-relaxed">
              {trimmed.replace(/^\d+\.\s*/, '')}
            </li>
          );
        }
        // Standard text lines
        return trimmed.length === 0 ? (
          <div key={index} className="h-2" />
        ) : (
          <p key={index} className="text-zinc-300 text-xs leading-relaxed">
            {line}
          </p>
        );
      });
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Idea': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'Goal': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Reflection': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Learning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Decision': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
      case 'Problem': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Opportunity': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white text-glow-indigo">
            Thinking Companion
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Chat with your private second brain. Your conversation is saved permanently.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 hover:border-rose-500/50 text-zinc-500 hover:text-rose-400 text-xs transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        )}
      </div>

      {/* Main Chat Box */}
      <div className="flex-1 flex flex-col glass-panel rounded-2xl border-zinc-800/80 overflow-hidden shadow-2xl relative bg-zinc-950/10">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-indigo-500/5 blur-[50px] pointer-events-none" />

        {/* Message Thread Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {loadingHistory ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-zinc-500 text-xs">Loading conversation history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 py-12">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center animate-pulse-glow">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-md font-bold text-zinc-200">Start a cognitive dialogue</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Ask me questions about your logged thoughts. I will scan your records to reveal patterns, themes, and goals.
                </p>
              </div>

              {/* Sample suggestion buttons */}
              <div className="grid grid-cols-1 gap-2 w-full pt-4">
                {samplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-left p-3.5 rounded-xl border border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/30 hover:bg-indigo-950/10 text-xs text-zinc-300 hover:text-indigo-300 transition-all cursor-pointer font-medium flex items-center gap-2 group"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, index) => {
                const isModel = m.role === 'model';
                return (
                  <div 
                    key={index}
                    className={`flex gap-4 ${isModel ? 'justify-start' : 'justify-end'}`}
                  >
                    {/* Avatar */}
                    {isModel && (
                      <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <BrainCircuit className="w-5 h-5" />
                      </div>
                    )}

                    <div className="max-w-[85%] sm:max-w-[75%] space-y-3">
                      {/* Bubble */}
                      <div className={`p-4 rounded-xl border text-xs space-y-2 select-text ${
                        isModel 
                          ? 'bg-zinc-900/40 border-zinc-900 text-zinc-300 rounded-tl-none shadow-md'
                          : 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none shadow-lg shadow-indigo-500/10'
                      }`}>
                        {isModel ? (
                          <div className="space-y-1.5">{renderMessageText(m.text)}</div>
                        ) : (
                          <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                        )}
                      </div>

                      {/* RAG Context Used links */}
                      {isModel && m.contextUsed && m.contextUsed.length > 0 && (
                        <div className="px-1 space-y-1.5">
                          <span className="text-[9px] font-bold text-indigo-400/80 uppercase tracking-wider flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" /> Grounded context thoughts ({m.contextUsed.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {m.contextUsed.map((ctx) => (
                              <div
                                key={ctx.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900/50 border border-zinc-900 text-[10px] text-zinc-400"
                                title={`Relevance score: ${(ctx.score * 100).toFixed(0)}%`}
                              >
                                <span className={`w-1 h-1 rounded-full ${getCategoryColor(ctx.category).split(' ')[1]}`} />
                                <span className="max-w-[150px] truncate">{ctx.summary}</span>
                                <span className="font-semibold text-zinc-500 font-mono">
                                  {(ctx.score * 100).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* User Avatar */}
                    {!isModel && (
                      <div className="w-9 h-9 rounded-lg bg-indigo-600 border border-indigo-500 text-white flex items-center justify-center shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <div className="bg-zinc-900/40 border border-zinc-900 text-zinc-500 p-4 rounded-xl rounded-tl-none text-xs flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Searching cognitive database...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form Bar */}
        <div className="p-4 border-t border-zinc-900/60 bg-zinc-950/20">
          <form onSubmit={handleFormSubmit} className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={loading ? 'AI is processing query...' : 'Ask your thinking companion...'}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl glass-input text-xs placeholder-zinc-600 focus:ring-1 focus:ring-indigo-500 text-white"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
