'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Plus, 
  Trash2, 
  Pin, 
  Edit3, 
  Check, 
  BrainCircuit, 
  Sparkles,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sidebar as SidebarIcon,
  SlidersHorizontal,
  Mic,
  ArrowUp,
  Minus,
  Maximize2,
  Square,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';

interface ContextItem {
  id: string;
  summary: string;
  category: string;
  score: number;
  createdAt: number;
}

interface Message {
  id?: string;
  role: 'user' | 'model';
  content: string;
  contextUsed?: ContextItem[];
}

interface ChatSession {
  id: string;
  title: string;
  isPinned: number; // 0 | 1
  createdAt: number;
}

type LayoutMode = 'sidebar' | 'floating' | 'fullscreen';

export default function FloatingCompanion() {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('floating');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    isDanger: false
  });

  // Audio recording states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isPausedVoice, setIsPausedVoice] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);
  const layoutSelectorRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatboxRef = useRef<HTMLDivElement | null>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const voiceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const localTranscriptRef = useRef<string>('');
  const animationFrameRef = useRef<number | null>(null);

  // Load layout mode and sessions
  useEffect(() => {
    const savedLayout = localStorage.getItem('jarvis-layout-mode') as LayoutMode;
    if (savedLayout === 'sidebar' || savedLayout === 'floating' || savedLayout === 'fullscreen') {
      setLayoutMode(savedLayout);
      if (savedLayout === 'fullscreen') {
        setShowHistory(true);
      }
    }
  }, []);

  // Load chat sessions on mount or when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  // Load message thread when activeSessionId changes
  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isTranscribing]);

  // Auto-expand input textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // Click outside popovers and main chatbox detection
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Check if the click is on the custom confirmation modal
      const confirmModalEl = document.getElementById('custom-confirm-modal');
      if (confirmModalEl && confirmModalEl.contains(event.target as Node)) {
        return; // Do absolutely nothing for click-aways if clicking on the modal!
      }

      // 1. Close chatbox when clicking outside the main chatbox container (in floating/sidebar modes)
      if (isOpen && layoutMode !== 'fullscreen' && chatboxRef.current && !chatboxRef.current.contains(event.target as Node)) {
        const launcher = document.getElementById('chat-launcher-btn');
        if (!launcher || !launcher.contains(event.target as Node)) {
          setIsOpen(false);
          setShowHistory(false);
          setShowLayoutSelector(false);
          return; // Exit early since we are closing the entire chatbox
        }
      }

      // 2. Close history drawer when clicking outside the history ref
      if (layoutMode !== 'fullscreen' && showHistory && historyRef.current && !historyRef.current.contains(event.target as Node)) {
        const trigger1 = document.getElementById('session-history-trigger-1');
        const trigger2 = document.getElementById('session-history-trigger-2');
        if (
          (!trigger1 || !trigger1.contains(event.target as Node)) &&
          (!trigger2 || !trigger2.contains(event.target as Node))
        ) {
          setShowHistory(false);
        }
      }

      // 3. Close layout mode selector when clicking outside
      if (showLayoutSelector && layoutSelectorRef.current && !layoutSelectorRef.current.contains(event.target as Node)) {
        const trigger = document.getElementById('layout-selector-trigger');
        if (!trigger || !trigger.contains(event.target as Node)) {
          setShowLayoutSelector(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showHistory, showLayoutSelector, layoutMode]);

  // Audio Timer Hook
  useEffect(() => {
    if (isRecordingVoice && !isPausedVoice) {
      timerIntervalRef.current = setInterval(() => {
        setVoiceTimer((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecordingVoice, isPausedVoice]);

  // Visualizer loop function
  const drawVoiceVisualizer = () => {
    if (!voiceCanvasRef.current || !analyserRef.current || !dataArrayRef.current) return;
    const canvas = voiceCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const bufferLength = analyser.frequencyBinCount;
    
    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      if (!isRecordingVoice || isPausedVoice) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray as any);

      ctx.clearRect(0, 0, width, height);
      
      const barWidth = 3;
      const gap = 2;
      const barCount = Math.floor(width / (barWidth + gap));
      
      ctx.fillStyle = '#22d3ee'; // Cyan theme visualizer bars

      for (let i = 0; i < barCount; i++) {
        const percentIdx = i / barCount;
        const dataIdx = Math.floor(percentIdx * bufferLength * 0.6);
        const value = dataArray[dataIdx] || 0;
        
        const valPercent = value / 255;
        const barHeight = Math.max(3, valPercent * height * 0.85);
        
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 1.5);
        ctx.fill();
      }
    };

    draw();
  };

  // Start Voice Recording
  const startVoiceRecording = async () => {
    audioChunksRef.current = [];
    localTranscriptRef.current = '';
    setVoiceTimer(0);
    setIsRecordingVoice(true);
    setIsPausedVoice(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio Analyser Setup
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Client speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const currentTranscript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
          localTranscriptRef.current = currentTranscript;
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      // MediaRecorder Setup
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);

      setTimeout(() => {
        drawVoiceVisualizer();
      }, 50);

    } catch (err) {
      console.error('Microphone activation failed:', err);
      setConfirmModal({
        isOpen: true,
        title: 'Microphone Error',
        message: 'Could not access the microphone. Please check your browser permission settings.',
        confirmText: 'OK',
        cancelText: '',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
      setIsRecordingVoice(false);
    }
  };

  // Pause voice recording
  const pauseVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPausedVoice(true);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // Resume voice recording
  const resumeVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPausedVoice(false);
      setTimeout(() => {
        drawVoiceVisualizer();
      }, 50);
    }
  };

  // Discard and delete recording
  const deleteVoiceRecording = () => {
    cleanupVoiceHandles();
    setIsRecordingVoice(false);
    setIsPausedVoice(false);
    setVoiceTimer(0);
  };

  // Restart/rerecord recording
  const rerecordVoice = () => {
    cleanupVoiceHandles();
    setTimeout(() => {
      startVoiceRecording();
    }, 150);
  };

  // Cleanup voice refs
  const cleanupVoiceHandles = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  // Submit and upload voice message to transcription endpoint and then ask JARVIS
  const submitVoiceRecording = () => {
    if (!mediaRecorderRef.current) return;
    setIsTranscribing(true);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      cleanupVoiceHandles();

      try {
        // Send audio to /api/transcribe for translation only (no DB thought entry created)
        const formData = new FormData();
        formData.append('audio', audioBlob, 'chat_voice.webm');
        if (localTranscriptRef.current) {
          formData.append('content', localTranscriptRef.current);
        }

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const transcriptText = data.text;
          
          if (transcriptText && transcriptText.trim()) {
            // Optimistic user update
            setMessages((prev) => [...prev, { role: 'user', content: transcriptText }]);
            
            // Query J.A.R.V.I.S.
            setLoading(true);
            const historyPayload = messages.map((m) => ({
              role: m.role,
              parts: [m.content],
            }));

            const chatRes = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: transcriptText,
                history: historyPayload,
                sessionId: activeSessionId,
              }),
            });

            const chatData = await chatRes.json();
            if (chatRes.ok) {
              setMessages((prev) => [
                ...prev,
                { role: 'model', content: chatData.text, contextUsed: chatData.contextUsed }
              ]);
              if (chatData.sessionId && activeSessionId !== chatData.sessionId) {
                setActiveSessionId(chatData.sessionId);
                loadSessions();
              }
            } else {
              setMessages((prev) => [
                ...prev,
                { role: 'model', content: chatData.message || 'I transcribed your voice thought but failed to reach dialogue servers.' }
              ]);
            }
          }
        } else {
          setConfirmModal({
            isOpen: true,
            title: 'Transcription Failed',
            message: 'Could not transcribe your audio message. Please verify your server connection and try again.',
            confirmText: 'OK',
            cancelText: '',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
          });
        }
      } catch (err) {
        console.error('Audio upload failed:', err);
      } finally {
        setIsTranscribing(false);
        setIsRecordingVoice(false);
        setIsPausedVoice(false);
        setVoiceTimer(0);
        setLoading(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        if (data.sessions.length > 0 && !activeSessionId) {
          setActiveSessionId(data.sessions[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    }
  };

  const loadMessages = async (sessionId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load thread messages:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions((prev) => [data.session, ...prev]);
        setActiveSessionId(data.session.id);
        if (layoutMode !== 'fullscreen') {
          setShowHistory(false);
        }
      }
    } catch (err) {
      console.error('Failed to create new session:', err);
    }
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`/api/chat/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, title: newTitle.trim() } : s))
        );
        setEditingSessionId(null);
      }
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
  };

  const handleTogglePinSession = async (session: ChatSession) => {
    const nextPinned = session.isPinned === 1 ? 0 : 1;
    try {
      const res = await fetch(`/api/chat/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: nextPinned }),
      });
      if (res.ok) {
        setSessions((prev) => {
          const updated = prev.map((s) => (s.id === session.id ? { ...s, isPinned: nextPinned } : s));
          return updated.sort((a, b) => b.isPinned - a.isPinned || b.createdAt - a.createdAt);
        });
      }
    } catch (err) {
      console.error('Failed to pin/unpin session:', err);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Conversation',
      message: 'Are you sure you want to delete this conversation thread? All history in this thread will be permanently deleted.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setSessions((prev) => prev.filter((s) => s.id !== id));
            if (activeSessionId === id) {
              setActiveSessionId(null);
              setMessages([]);
            }
          }
        } catch (err) {
          console.error('Failed to delete session:', err);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || loading) return;

    setInputText('');
    setLoading(true);

    const userMessage: Message = {
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);

    const historyPayload = messages.map((m) => ({
      role: m.role,
      parts: [m.content],
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          sessionId: activeSessionId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: data.text,
            contextUsed: data.contextUsed,
          },
        ]);
        
        if (data.sessionId && activeSessionId !== data.sessionId) {
          setActiveSessionId(data.sessionId);
          loadSessions();
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: data.message || 'Sorry, I encountered an issue retrieving my systems.',
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: 'Connection interrupted. Please verify your network and try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!activeSessionId) return;
    setConfirmModal({
      isOpen: true,
      title: 'Clear Chat Messages',
      message: 'Are you sure you want to clear all messages in this conversation thread?',
      confirmText: 'Clear',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/chat/messages?sessionId=${activeSessionId}`, { method: 'DELETE' });
          if (res.ok) {
            setMessages([]);
          }
        } catch (err) {
          console.error('Failed to clear session messages:', err);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleLayoutModeChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    localStorage.setItem('jarvis-layout-mode', mode);
    setShowLayoutSelector(false);
    if (mode === 'fullscreen') {
      setShowHistory(true);
    } else {
      setShowHistory(false);
    }
  };

  const parseMarkdown = (text: string) => {
    const parseInline = (line: string): React.ReactNode[] => {
      const regex = /(\*\*.*?\*\*|`.*?`)/g;
      const matches = line.split(regex);
      return matches.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={idx} className="bg-zinc-800/80 px-1.5 py-0.5 rounded text-[12px] font-mono text-cyan-400">{part.slice(1, -1)}</code>;
        }
        return part;
      });
    };

    const blocks = text.split('\n\n');
    return blocks.map((block, blockIdx) => {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) return null;

      if (trimmedBlock.startsWith('## ')) {
        return (
          <h4 key={blockIdx} className="text-[17px] font-bold text-white mt-5 mb-2.5 tracking-tight">
            {parseInline(trimmedBlock.slice(3))}
          </h4>
        );
      }

      if (trimmedBlock.startsWith('### ')) {
        return (
          <h5 key={blockIdx} className="text-[15px] font-semibold text-zinc-100 mt-4.5 mb-2 tracking-tight">
            {parseInline(trimmedBlock.slice(4))}
          </h5>
        );
      }

      const lines = block.split('\n');
      const isList = lines.every(line => {
        const t = line.trim();
        return t.startsWith('-') || t.startsWith('*') || /^\d+[\.\)]/.test(t) || t.length === 0;
      });

      if (isList && lines.length > 0) {
        return (
          <ul key={blockIdx} className="space-y-2 my-4 list-none pl-1">
            {lines.map((line, lineIdx) => {
              const t = line.trim();
              if (t.length === 0) return null;

              if (t.startsWith('-') || t.startsWith('*')) {
                return (
                  <li key={lineIdx} className="flex items-start gap-2.5 text-zinc-300 text-[14px] leading-relaxed mb-1.5">
                    <span className="text-zinc-500 select-none shrink-0 text-sm mt-0.5">•</span>
                    <span>{parseInline(t.replace(/^[-*]\s*/, ''))}</span>
                  </li>
                );
              }

              const matchNumbered = t.match(/^(\d+)[\.\)]\s*(.*)/);
              if (matchNumbered) {
                return (
                  <li key={lineIdx} className="flex items-start gap-2.5 text-zinc-350 text-[14px] leading-relaxed mb-1.5">
                    <span className="text-zinc-100 font-bold shrink-0 text-sm mt-0.5">{matchNumbered[1]}.</span>
                    <span>{parseInline(matchNumbered[2])}</span>
                  </li>
                );
              }

              return (
                <li key={lineIdx} className="text-zinc-300 text-[14px] leading-relaxed pl-4 mb-1.5">
                  {parseInline(line)}
                </li>
              );
            })}
          </ul>
        );
      }

      return (
        <p key={blockIdx} className="text-[#d4d4d4] text-[14.5px] leading-relaxed mt-3.5 mb-3.5 font-normal">
          {lines.map((line, lineIdx) => (
            <React.Fragment key={lineIdx}>
              {lineIdx > 0 && <br />}
              {parseInline(line)}
            </React.Fragment>
          ))}
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

  const formatVoiceTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const activeSessionTitle = sessions.find((s) => s.id === activeSessionId)?.title || 'New AI chat';
  const pinnedSessions = sessions.filter(s => s.isPinned === 1);
  const recentSessions = sessions.filter(s => s.isPinned === 0);

  const getContainerLayoutClass = () => {
    let baseClasses = 'bg-[#191919] flex z-50 overflow-hidden transition-all duration-300 ease-out ';
    
    switch (layoutMode) {
      case 'sidebar':
        baseClasses += 'fixed top-0 right-0 h-full w-[430px] border-l border-zinc-900 shadow-2xl rounded-none ';
        if (isOpen) {
          return baseClasses + 'translate-x-0 opacity-100 pointer-events-auto';
        } else {
          return baseClasses + 'translate-x-full opacity-0 pointer-events-none';
        }

      case 'fullscreen':
        baseClasses += 'fixed inset-0 w-full h-full rounded-none ';
        if (isOpen) {
          return baseClasses + 'opacity-100 scale-100 pointer-events-auto';
        } else {
          return baseClasses + 'opacity-0 scale-95 pointer-events-none';
        }

      case 'floating':
      default:
        baseClasses += 'fixed top-4 right-4 bottom-4 w-[430px] max-w-[calc(100vw-2rem)] border border-zinc-800/80 shadow-2xl rounded-2xl ';
        if (isOpen) {
          return baseClasses + 'opacity-100 scale-100 translate-y-0 pointer-events-auto';
        } else {
          return baseClasses + 'opacity-0 scale-95 translate-y-8 pointer-events-none';
        }
    }
  };

  const renderSidebarHistory = () => (
    <div className="flex flex-col h-full w-full">
      <div className="p-3">
        <button
          onClick={handleCreateSession}
          className="w-full h-8 rounded-md border border-zinc-800 bg-[#191919] hover:bg-[#252525] text-zinc-300 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Start New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
        {pinnedSessions.length > 0 && (
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block px-2">Pinned</span>
            {pinnedSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  if (layoutMode !== 'fullscreen') {
                    setShowHistory(false);
                  }
                }}
                className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] font-medium cursor-pointer transition-all ${
                  activeSessionId === session.id
                    ? 'bg-[#191919] text-white border-l-2 border-cyan-500 font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                {editingSessionId === session.id ? (
                  <input
                    type="text"
                    value={editTitleText}
                    onChange={(e) => setEditTitleText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSession(session.id, editTitleText);
                      if (e.key === 'Escape') setEditingSessionId(null);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-zinc-900 text-white rounded border border-zinc-800 px-1 py-0.5 text-xs outline-none focus:border-indigo-500"
                  />
                ) : (
                  <span className="truncate pr-7">{session.title}</span>
                )}

                <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1e1e1e]/90 px-1 py-0.5 rounded">
                  {editingSessionId === session.id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameSession(session.id, editTitleText);
                      }}
                      className="p-0.5 hover:text-emerald-400 text-zinc-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePinSession(session);
                        }}
                        className="p-0.5 hover:text-cyan-400 text-zinc-400"
                      >
                        <Pin className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(session.id);
                          setEditTitleText(session.title);
                        }}
                        className="p-0.5 hover:text-white text-zinc-400"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-0.5 hover:text-rose-400 text-zinc-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block px-2">Recent Chats</span>
          {recentSessions.length === 0 && pinnedSessions.length === 0 ? (
            <p className="text-[10px] text-zinc-650 italic px-2">No chat threads yet</p>
          ) : (
            recentSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  if (layoutMode !== 'fullscreen') {
                    setShowHistory(false);
                  }
                }}
                className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md text-[13px] font-medium cursor-pointer transition-all ${
                  activeSessionId === session.id
                    ? 'bg-[#191919] text-white border-l-2 border-cyan-500 font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                {editingSessionId === session.id ? (
                  <input
                    type="text"
                    value={editTitleText}
                    onChange={(e) => setEditTitleText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSession(session.id, editTitleText);
                      if (e.key === 'Escape') setEditingSessionId(null);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-zinc-900 text-white rounded border border-zinc-800 px-1 py-0.5 text-xs outline-none focus:border-indigo-500"
                  />
                ) : (
                  <span className="truncate pr-7">{session.title}</span>
                )}

                <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1e1e1e]/90 px-1 py-0.5 rounded">
                  {editingSessionId === session.id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameSession(session.id, editTitleText);
                      }}
                      className="p-0.5 hover:text-emerald-400 text-zinc-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePinSession(session);
                        }}
                        className="p-0.5 hover:text-cyan-400 text-zinc-400"
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(session.id);
                          setEditTitleText(session.title);
                        }}
                        className="p-0.5 hover:text-white text-zinc-400"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-0.5 hover:text-rose-400 text-zinc-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        id="chat-launcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all duration-300 border border-cyan-500/40 bg-zinc-950 hover:bg-zinc-900 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.45)] hover:scale-105 cursor-pointer ${
          isOpen ? 'rotate-90 shadow-none border-zinc-800' : ''
        }`}
      >
        {isOpen ? (
          <X className="w-7 h-7 text-zinc-400" />
        ) : (
          <div className="relative flex items-center justify-center">
            <BrainCircuit className="w-8 h-8 text-cyan-400 animate-pulse" />
            <span className="absolute w-12 h-12 rounded-full border border-cyan-500/10 animate-ping opacity-60 pointer-events-none" />
          </div>
        )}
      </button>

      {/* Main Premium Chatbox Container */}
      <div
        ref={chatboxRef}
        className={getContainerLayoutClass()}
      >
        {layoutMode === 'fullscreen' && (
          <div 
            ref={historyRef}
            className={`h-full bg-[#1e1e1e] border-r border-zinc-900 flex flex-col transition-all duration-300 ease-in-out ${
              showHistory ? 'w-[260px] opacity-100' : 'w-0 opacity-0 pointer-events-none'
            }`}
          >
            {showHistory && renderSidebarHistory()}
          </div>
        )}

        <div className="flex-1 flex flex-col h-full min-w-0 bg-transparent relative">
          {/* Header Area */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900/60 bg-[#1e1e1e]">
            <div className="flex items-center gap-1.5 max-w-[70%]">
              {layoutMode === 'fullscreen' && (
                <button
                  id="session-history-trigger-2"
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-1.5 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer mr-1 ${
                    showHistory ? 'bg-zinc-900 text-white' : ''
                  }`}
                  title="Toggle chat history list"
                >
                  <SidebarIcon className="w-4 h-4" />
                </button>
              )}

              {layoutMode !== 'fullscreen' ? (
                <button
                  id="session-history-trigger-1"
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1 text-[13px] font-bold text-zinc-200 hover:text-white hover:bg-zinc-900 px-2 py-1 rounded-md transition-all truncate cursor-pointer"
                >
                  <span className="truncate">{activeSessionTitle}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </button>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1 text-[13.5px] font-bold text-zinc-200">
                  <BrainCircuit className="w-4 h-4 text-cyan-400" />
                  <span>{activeSessionTitle}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateSession}
                className="p-1.5 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Start New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  id="layout-selector-trigger"
                  onClick={() => setShowLayoutSelector(!showLayoutSelector)}
                  className={`p-1.5 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer ${
                    showLayoutSelector ? 'bg-zinc-900 text-white' : ''
                  }`}
                  title="Layout modes"
                >
                  <SidebarIcon className="w-4 h-4" />
                </button>

                {showLayoutSelector && (
                  <div 
                    ref={layoutSelectorRef}
                    className="absolute right-0 mt-1.5 bg-[#1e1e1e] border border-zinc-800 rounded-lg py-1 shadow-2xl z-30 w-44"
                  >
                    <button
                      onClick={() => handleLayoutModeChange('sidebar')}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <SidebarIcon className="w-3.5 h-3.5" /> Sidebar
                      </span>
                      {layoutMode === 'sidebar' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                    
                    <button
                      onClick={() => handleLayoutModeChange('floating')}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Square className="w-3.5 h-3.5" /> Floating
                      </span>
                      {layoutMode === 'floating' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>

                    <button
                      onClick={() => handleLayoutModeChange('fullscreen')}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Maximize2 className="w-3.5 h-3.5" /> Full screen
                      </span>
                      {layoutMode === 'fullscreen' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden relative">
            {layoutMode !== 'fullscreen' && (
              <div
                ref={historyRef}
                className={`absolute top-0 left-0 h-full w-[250px] bg-[#1e1e1e] border-r border-zinc-900 z-20 flex flex-col transition-transform duration-300 ease-in-out ${
                  showHistory ? 'translate-x-0' : '-translate-x-full'
                }`}
              >
                {renderSidebarHistory()}
              </div>
            )}

            <div className="flex-1 flex flex-col bg-transparent overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {loadingHistory ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                    <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
                    <span className="text-xs text-zinc-500">Retrieving chat records...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-left px-4 space-y-6 max-w-sm mx-auto">
                    <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                      <BrainCircuit className="w-8 h-8 text-cyan-400 animate-pulse" />
                    </div>
                    
                    <div className="space-y-4 w-full">
                      <div className="space-y-1">
                        <h3 className="text-[17px] font-bold text-zinc-200">Your J.A.R.V.I.S. Companion</h3>
                        <p className="text-zinc-450 text-xs leading-normal">
                          Here are a few things I can do, or ask me anything!
                        </p>
                      </div>

                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center gap-2.5 text-xs text-zinc-350">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Personalize J.A.R.V.I.S. coaching settings</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-zinc-350">
                          <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>Track a new decision and log metrics</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-zinc-350">
                          <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>Scan recent thoughts for patterns & loops</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3.5 ${
                        m.role === 'user' ? 'ml-auto flex-row-reverse max-w-[85%]' : 'mr-auto w-full'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs ${
                          m.role === 'user'
                            ? 'bg-[#2c2c2c] text-cyan-400'
                            : 'bg-zinc-900 border border-zinc-850 text-zinc-400'
                        }`}
                      >
                        {m.role === 'user' ? <User className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div
                          className={`text-[14.5px] leading-relaxed ${
                            m.role === 'user'
                              ? 'bg-[#2c2c2c] text-zinc-100 px-4 py-2.5 rounded-2xl rounded-tr-none shadow-sm border-0'
                              : 'bg-transparent text-zinc-200 px-0 pt-0.5 pb-2 w-full border-0'
                          }`}
                        >
                          {parseMarkdown(m.content)}
                        </div>

                        {m.contextUsed && m.contextUsed.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {m.contextUsed.map((ctx) => (
                              <span
                                key={ctx.id}
                                className={`px-1.5 py-0.5 rounded text-[8px] border font-medium ${getCategoryColor(
                                  ctx.category
                                )}`}
                                title={ctx.summary}
                              >
                                {ctx.category}: {ctx.summary.slice(0, 15)}...
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex gap-3 max-w-[85%] mr-auto">
                    <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-850 text-zinc-400 flex items-center justify-center shrink-0">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="p-3 text-[#d4d4d4] text-[14.5px] rounded-2xl rounded-tl-none flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                      J.A.R.V.I.S. is compiling response...
                    </div>
                  </div>
                )}
                {isTranscribing && (
                  <div className="flex gap-3 max-w-[85%] mr-auto">
                    <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-850 text-zinc-400 flex items-center justify-center shrink-0">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    </div>
                    <div className="p-3 text-cyan-400 text-xs rounded-2xl rounded-tl-none flex items-center gap-1.5">
                      Transcribing voice thought...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Notion-styled floating input card container at bottom */}
              <div className="px-4 pb-4 pt-2 bg-transparent">
                <div className="bg-[#222222] border border-zinc-800 rounded-xl p-3 flex flex-col gap-2 focus-within:border-cyan-500/40 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.06)] transition-all">
                  
                  {isRecordingVoice ? (
                    /* Voice Recording UI Mode inside input card */
                    <div className="flex items-center justify-between w-full py-1.5">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full bg-rose-500 ${isPausedVoice ? '' : 'animate-pulse'}`} />
                        <span className="text-xs font-mono font-bold text-zinc-300">
                          {formatVoiceTime(voiceTimer)}
                        </span>
                        
                        {/* Audio visualizer canvas inside input box */}
                        <canvas
                          ref={voiceCanvasRef}
                          width={110}
                          height={20}
                          className="w-28 h-5 opacity-90"
                        />
                        
                        {isPausedVoice && (
                          <span className="text-[10px] text-zinc-500 italic">Paused</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Delete/Discard recording */}
                        <button
                          onClick={deleteVoiceRecording}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                          title="Discard recording"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        {/* Restart/Rerecord */}
                        <button
                          onClick={rerecordVoice}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-all cursor-pointer"
                          title="Restart recording"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        {/* Pause or Resume */}
                        {isPausedVoice ? (
                          <button
                            onClick={resumeVoiceRecording}
                            className="p-1 rounded hover:bg-[#2c2c2c] text-cyan-400 hover:text-white transition-all cursor-pointer"
                            title="Resume recording"
                          >
                            <Play className="w-4 h-4 fill-cyan-400" />
                          </button>
                        ) : (
                          <button
                            onClick={pauseVoiceRecording}
                            className="p-1 rounded hover:bg-[#2c2c2c] text-cyan-400 hover:text-white transition-all cursor-pointer"
                            title="Pause recording"
                          >
                            <Pause className="w-4 h-4 fill-cyan-400" />
                          </button>
                        )}

                        {/* Submit/Send */}
                        <button
                          onClick={submitVoiceRecording}
                          className="w-6.5 h-6.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                          title="Send voice thought"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Regular Text Chat Mode */
                    <>
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Ask J.A.R.V.I.S. anything..."
                        className="w-full bg-transparent text-sm text-zinc-200 placeholder-zinc-550 outline-none py-1.5 resize-none max-h-[180px] overflow-y-auto"
                      />

                      {/* interior footer details */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-900/60">
                        <div className="flex items-center gap-1.5">
                          <button 
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-350 transition-all cursor-pointer"
                            title="Add context"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-350 transition-all cursor-pointer"
                            title="Coaching settings"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850">
                            Auto
                          </span>
                          
                          {/* Audio Input Mic Button */}
                          <button 
                            onClick={startVoiceRecording}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-cyan-400 transition-all cursor-pointer"
                            title="Voice chat input"
                          >
                            <Mic className="w-4 h-4" />
                          </button>

                          <button
                            onClick={handleSendMessage}
                            disabled={loading || !inputText.trim()}
                            className="w-6.5 h-6.5 rounded-full bg-zinc-800 hover:bg-cyan-600 disabled:bg-zinc-850 hover:text-white text-zinc-400 disabled:text-zinc-650 flex items-center justify-center transition-all cursor-pointer"
                            title="Send message"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Confirmation / Alert Modal */}
      {confirmModal.isOpen && (
        <div 
          id="custom-confirm-modal"
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#1c1c1e] border-0 outline-none rounded-xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-left animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h4 className="text-md font-bold text-white tracking-wide">{confirmModal.title}</h4>
              <p className="text-zinc-400 text-xs leading-normal mt-1.5">{confirmModal.message}</p>
            </div>
            
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900/60">
              {confirmModal.cancelText && (
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer transition-all"
                >
                  {confirmModal.cancelText}
                </button>
              )}
              <button
                onClick={confirmModal.onConfirm}
                className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold cursor-pointer transition-all ${
                  confirmModal.isDanger 
                    ? 'bg-red-600 hover:bg-red-550 shadow-lg shadow-red-500/10' 
                    : 'bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-500/10'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
