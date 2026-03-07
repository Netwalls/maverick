'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

const ASCII_LOGO = `
 __  __                         _      _    
|  \\/  |                       (_)    | |   
| \\  / | __ ___   _____ _ __   _  ___| | __
| |\\/| |/ _\` \\ \\ / / _ \\ '__| | |/ __| |/ /
| |  | | (_| |\\ V /  __/ |    | | (__|   < 
|_|  |_|\\__,_| \\_/ \\___|_|    |_|\\___|_|\\_\\
`;

const DEMO_LINES = [
  { cmd: '> maverick balance', out: 'SOL: 4.20 | USDC: 150.00' },
  { cmd: '> maverick swap 1 SOL USDC', out: 'Swapped 1 SOL for 142.50 USDC' },
  { cmd: '> maverick bet YES KXBTC-100K 0.5', out: 'Bet placed: YES on KXBTC-100K at 67c' },
  { cmd: '> maverick bank deposit 2', out: 'Deposited 2 SOL to vault' },
  { cmd: '> maverick voice "what is my balance"', out: 'Balance: 2.20 SOL, 292.50 USDC' },
];

const SKILLS = [
  { name: 'Wallet Management', desc: 'Generate keypairs, query balances, request airdrops', onChain: true },
  { name: 'Transaction Signing', desc: 'Build, sign, and send Solana transactions autonomously', onChain: true },
  { name: 'SPL Token Ops', desc: 'Create ATAs, transfer USDC, query token balances', onChain: true },
  { name: 'AMM Swaps', desc: 'Constant-product AMM with SOL/USDC pairs, 0.3% fee', onChain: true },
  { name: 'Bank (Ajo Savings)', desc: 'Deposits, loans with 5% interest, rotating payouts', onChain: true },
  { name: 'Prediction Markets', desc: 'Browse Kalshi markets, AI-suggested trades, place bets', onChain: true },
  { name: 'Inter-Agent Comms', desc: 'Fund requests, governance proposals, peer lending', onChain: true },
  { name: 'Agent Discovery', desc: 'Dynamic agent creation, type assignment, registry', onChain: false },
  { name: 'Autonomous Trading', desc: 'Tick-based execution, adaptive strategy, P&L tracking', onChain: true },
  { name: 'AI Reasoning', desc: 'Trade justification, sentiment analysis, financial advice', onChain: false },
  { name: 'Voice Commands', desc: 'Natural language control via Gemini speech-to-text', onChain: false },
  { name: 'Audit Trail', desc: 'Append-only history with tx signatures as proof', onChain: true },
];

function TerminalDemo() {
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState('');
  const [phase, setPhase] = useState<'typing-cmd' | 'show-out' | 'pause'>('typing-cmd');
  const indexRef = useRef(0);
  const charRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const idx = indexRef.current;
      const demo = DEMO_LINES[idx % DEMO_LINES.length];

      if (phase === 'typing-cmd') {
        if (charRef.current < demo.cmd.length) {
          setCurrentLine(demo.cmd.slice(0, charRef.current + 1));
          charRef.current++;
        } else {
          setPhase('show-out');
        }
      } else if (phase === 'show-out') {
        setLines(prev => [...prev.slice(-8), demo.cmd, demo.out]);
        setCurrentLine('');
        setPhase('pause');
      } else {
        indexRef.current = (idx + 1) % DEMO_LINES.length;
        charRef.current = 0;
        setPhase('typing-cmd');
      }
    }, phase === 'typing-cmd' ? 50 : phase === 'show-out' ? 100 : 800);

    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid var(--border)',
      padding: 0,
      maxWidth: 600,
      margin: '0 auto',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--text-muted)',
      }}>
        <span style={{ color: 'var(--red)' }}>●</span>
        <span style={{ color: 'var(--yellow)' }}>●</span>
        <span style={{ color: 'var(--green)' }}>●</span>
        <span style={{ marginLeft: 8, letterSpacing: 1 }}>maverick :: terminal</span>
      </div>
      <div style={{ padding: '16px 20px', minHeight: 200, fontSize: 13, lineHeight: 1.8 }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            color: line.startsWith('>') ? 'var(--cyan)' : 'var(--green)',
            fontWeight: line.startsWith('>') ? 400 : 600,
          }}>
            {line}
          </div>
        ))}
        {currentLine && (
          <div style={{ color: 'var(--cyan)' }}>
            {currentLine}
            <span className="cursor-blink" />
          </div>
        )}
        {!currentLine && phase === 'pause' && (
          <div style={{ color: 'var(--cyan)' }}>
            {'> '}
            <span className="cursor-blink" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '60px 24px 80px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <pre className="ascii-logo" style={{ fontSize: 13, lineHeight: 1.3 }}>{ASCII_LOGO}</pre>
        <div style={{
          color: 'var(--text-muted)',
          fontSize: 14,
          marginTop: 16,
          letterSpacing: 1,
        }}>
          Autonomous Multi-Agent DeFi Terminal on Solana
        </div>
        <div style={{
          color: 'var(--text-muted)',
          fontSize: 11,
          marginTop: 8,
        }}>
          Real on-chain transactions | Multi-agent coordination | Voice control | Prediction markets
        </div>
      </div>

      <TerminalDemo />

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <Link href="/dashboard">
          <button className="btn-green" style={{
            padding: '14px 40px',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
            boxShadow: 'var(--glow-green)',
          }}>
            ENTER TERMINAL
          </button>
        </Link>
      </div>

      <div style={{ marginTop: 64, width: '100%', maxWidth: 900 }}>
        <div className="card-header" style={{ textAlign: 'center', justifyContent: 'center', marginBottom: 24 }}>
          Agent Skills
        </div>
        <div className="grid-3">
          {SKILLS.map((skill, i) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <div style={{ color: 'var(--cyan)', fontSize: 12, fontWeight: 600 }}>
                  {skill.name}
                </div>
                {skill.onChain && (
                  <span className="tag tag-green" style={{ fontSize: 9, padding: '1px 4px' }}>
                    ON-CHAIN
                  </span>
                )}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.5 }}>
                {skill.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 48,
        fontSize: 11,
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}>
        v1.0.1 // solana devnet // powered by maverick agents
      </div>
    </div>
  );
}
