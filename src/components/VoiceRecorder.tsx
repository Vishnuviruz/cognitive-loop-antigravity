'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertCircle, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, localTranscript?: string) => void;
  isProcessing: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, isProcessing }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptAccumulatorRef = useRef<string>('');

  // Handle timer count
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Visualizer loop
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const bufferLength = analyser.frequencyBinCount;
    
    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      if (!isRecording) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray as any);

      ctx.clearRect(0, 0, width, height);
      
      // Draw standard symmetrical audio wave bars
      const barWidth = 3;
      const gap = 2;
      const barCount = Math.floor(width / (barWidth + gap));
      
      ctx.fillStyle = '#6366f1'; // Indigo color matching primary theme

      for (let i = 0; i < barCount; i++) {
        // Map bar index to frequency array index
        const percentIdx = i / barCount;
        const dataIdx = Math.floor(percentIdx * bufferLength * 0.6); // Look at lower 60% of frequencies
        const value = dataArray[dataIdx] || 0;
        
        // Normalize value (0 to 255) to bar height
        const valPercent = value / 255;
        const barHeight = Math.max(4, valPercent * height * 0.85);
        
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2; // Center vertically

        // Draw rounded rectangle for bars
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();
  };

  const startRecording = async () => {
    setError('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup Web Audio Analyser for Visualizer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Small fft for simple visualizer bars
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Setup Web Speech Recognition for zero-cost client-side transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        transcriptAccumulatorRef.current = '';

        recognition.onresult = (event: any) => {
          const currentTranscript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
          transcriptAccumulatorRef.current = currentTranscript;
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop Web Speech Recognition if active
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.error('Error stopping speech recognition:', e);
          }
        }

        // Allow final results to settle before callback
        setTimeout(() => {
          onRecordingComplete(audioBlob, transcriptAccumulatorRef.current.trim());
        }, 100);
        
        // Clean up streams & contexts
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.start(250); // Slice every 250ms
      setIsRecording(true);
      
      // Allow visualizer canvas to render and trigger loop
      setTimeout(() => {
        drawVisualizer();
      }, 50);

    } catch (err: any) {
      console.error('Microphone access denied or error:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 px-3 py-2 rounded-lg border border-red-500/10">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {isRecording ? (
          <div className="flex items-center gap-4 bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800 backdrop-blur">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold font-mono text-zinc-300">{formatTime(recordingTime)}</span>
            
            {/* Visualizer Canvas */}
            <canvas 
              ref={canvasRef} 
              width={80} 
              height={24} 
              className="w-20 h-6 opacity-80"
            />

            <button
              onClick={stopRecording}
              className="p-1.5 rounded-full bg-red-500/20 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-400 transition-all cursor-pointer"
              title="Stop Recording"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>
        ) : (
          <button
            onClick={startRecording}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-5 py-3 rounded-full border text-sm font-semibold transition-all cursor-pointer select-none ${
              isProcessing
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-indigo-600/10 border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-600 text-indigo-300 hover:text-white shadow-lg hover:shadow-indigo-500/10'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>AI Processing...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Capture Voice Thought</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
