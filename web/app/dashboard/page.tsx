'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Terminal from '../../components/Terminal';

const ASCII_LOGO = `   __  __                       _      _
  |  \\/  |                     (_)    | |
  | \\  / | __ _ __   __ ___  _ __  _  | | __
  | |\\/| |/ _\` |\\ \\ / // _ \\| '__|| | | |/ /
  | |  | | (_| | \\ V /|  __/| |   | | |   <
  |_|  |_|\\__,_|  \\_/  \\___||_|   |_| |_|\\_\\`;

interface AgentInfo {
  name: string;
  address: string;
  balance: number;
  usdc: number;
}

interface HistoryItem {
  timestamp: string;
  agentAddress: string;
  action: string;
  description: string;
  signature?: string;
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/wallet').then(r => r.json()),
      fetch('/api/history').then(r => r.json()),
    ]).then(([walletData, historyData]) => {
      setAgents(walletData.agents || []);
      setHistory((historyData.history || []).slice(0, 10));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const quickLinks = [
    { href: '/wallet', label: 'Wallet', desc: 'Balance & Airdrop' },
    { href: '/swap', label: 'Swap', desc: 'SOL <> USDC AMM' },
    { href: '/bank', label: 'Bank', desc: 'Deposits & Loans' },
    { href: '/markets', label: 'Markets', desc: 'Kalshi Predictions' },
    { href: '/history', label: 'History', desc: 'Transaction Log' },
  ];

  return (
    <div>
      <Terminal title="maverick :: home">
        <div className="ascii-logo">{ASCII_LOGO}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8, marginBottom: 24 }}>
          {'      '}Autonomous Multi-Agent DeFi Terminal on Solana
        </div>

        {loading ? (
          <div className="loader">Initializing services</div>
        ) : (
          <>
            <div className="card-header">Agent Overview</div>
            <div className="grid-3" style={{ marginBottom: 24 }}>
              {agents.map((a, i) => (
                <div key={i} className="card">
                  <div style={{ fontSize: 12, color: 'var(--cyan)', marginBottom: 8 }}>
                    {a.name}
                  </div>
                  <div className="stat-value">{a.balance.toFixed(2)}</div>
                  <div className="stat-label">SOL</div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 16 }}>{a.usdc.toFixed(2)}</span>
                    <span className="stat-label" style={{ marginLeft: 4 }}>USDC</span>
                  </div>
                  <div className="address" style={{ marginTop: 8 }} title={a.address}>
                    {a.address.slice(0, 4)}...{a.address.slice(-4)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Terminal>

      <div style={{ marginTop: 16 }}>
        <div className="card-header">Quick Access</div>
        <div className="grid-3">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <div style={{ color: 'var(--cyan)', fontSize: 13, fontWeight: 600 }}>
                  {link.label}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                  {link.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Terminal title="recent activity">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {new Date(h.timestamp).toLocaleTimeString()}
                    </td>
                    <td>
                      <span className={`tag ${h.action.includes('SWAP') ? 'tag-cyan' : h.action.includes('BANK') ? 'tag-green' : 'tag-yellow'}`}>
                        {h.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{h.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Terminal>
        </div>
      )}
    </div>
  );
}
