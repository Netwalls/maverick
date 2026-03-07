'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Terminal from '../../components/Terminal';

export default function VoicePage() {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<'ready' | 'listening' | 'processing'>('ready');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [command, setCommand] = useState('');
  const [message, setMessage] = useState('');
  const [bars, setBars] = useState<number[]>(Array(24).fill(8));
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const processCommand = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setStatus('processing');
    setTranscript(text);
    setMessage('');
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`ERROR: ${data.error}`);
      } else {
        setResponse(data.response || '');
      }
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setStatus('ready');
  }, []);

  const updateBars = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const step = Math.floor(data.length / 24);
    const newBars = Array.from({ length: 24 }, (_, i) => {
      const val = data[i * step] || 0;
      return Math.max(4, (val / 255) * 70);
    });
    setBars(newBars);
    rafRef.current = requestAnimationFrame(updateBars);
  }, []);

  const startRecording = async () => {
    setTranscript('');
    setResponse('');
    setMessage('');

    // Start mic for waveform
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      rafRef.current = requestAnimationFrame(updateBars);
    } catch {
      // Mic not available, use animated bars
    }

    // Start speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage('ERROR: Speech recognition not supported in this browser. Use Chrome or Edge, or type a command below.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }
      if (interimText) setTranscript(interimText);
      if (finalText) {
        stopRecording();
        processCommand(finalText);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        setMessage(`ERROR: ${event.error}`);
      }
      stopRecording();
    };

    recognition.onend = () => {
      // If no final result was captured
      if (status === 'listening') {
        stopRecording();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    setStatus('listening');
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    analyserRef.current = null;
    setRecording(false);
    setBars(Array(24).fill(8));
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
      setStatus('ready');
    } else {
      startRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    const text = command.trim();
    if (!text) return;
    setCommand('');
    await processCommand(text);
  };

  return (
    <div>
      <Terminal title="maverick :: voice">
        <div className="card-header">Voice Interface</div>

        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          {/* Waveform visualization */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            height: 80,
            marginBottom: 24,
          }}>
            {bars.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: h,
                  background: recording ? 'var(--green)' : 'var(--border)',
                  borderRadius: 2,
                  transition: recording ? 'height 0.05s ease' : 'height 0.3s ease, background 0.3s ease',
                  boxShadow: recording ? 'var(--glow-green)' : 'none',
                }}
              />
            ))}
          </div>

          {/* Mic button */}
          <button
            onClick={toggleRecording}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: `2px solid ${recording ? 'var(--red)' : 'var(--green)'}`,
              background: recording ? 'rgba(255,0,64,0.15)' : 'rgba(0,255,65,0.05)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              color: recording ? 'var(--red)' : 'var(--green)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              boxShadow: recording ? '0 0 20px rgba(255,0,64,0.3)' : 'var(--glow-green)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {recording ? 'STOP' : 'MIC'}
          </button>

          {/* Status */}
          <div style={{
            fontSize: 12,
            color: status === 'listening' ? 'var(--green)' :
                   status === 'processing' ? 'var(--yellow)' : 'var(--text-muted)',
            marginTop: 8,
          }}>
            {status === 'listening' && 'Listening... speak now'}
            {status === 'processing' && 'Processing...'}
            {status === 'ready' && 'Click MIC or type a command below'}
          </div>
        </div>

        {/* Text command input */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">Text Command</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Try: &quot;check balance&quot;, &quot;swap SOL to USDC&quot;, &quot;go to wallet&quot;, or &quot;help&quot;
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={command}
              onChange={e => setCommand(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Hey mav..."
              style={{ flex: 1 }}
            />
            <button
              onClick={handleSubmit}
              disabled={status === 'processing' || !command.trim()}
              className="btn-green"
            >
              {status === 'processing' ? 'Processing...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">Transcript</div>
            <div style={{
              fontSize: 13,
              color: 'var(--cyan)',
              fontStyle: 'italic',
            }}>
              &quot;{transcript}&quot;
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">Maverick Response</div>
            <div style={{
              fontSize: 13,
              color: 'var(--green)',
              whiteSpace: 'pre-wrap',
            }}>
              {response}
            </div>
          </div>
        )}

        {message && (
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            fontSize: 12,
            border: `1px solid ${message.startsWith('ERROR') ? 'var(--red)' : 'var(--green)'}`,
            color: message.startsWith('ERROR') ? 'var(--red)' : 'var(--green)',
          }}>
            {message}
          </div>
        )}
      </Terminal>
    </div>
  );
}
