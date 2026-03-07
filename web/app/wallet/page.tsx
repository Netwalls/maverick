'use client';

import { useEffect, useState } from 'react';
import Terminal from '../../components/Terminal';

interface AgentInfo {
  name: string;
  address: string;
  balance: number;
  usdc: number;
}

export default function WalletPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(0);
  const [airdropping, setAirdropping] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchWallets = () => {
    fetch('/api/wallet')
      .then(r => r.json())
      .then(data => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchWallets(); }, []);

  const handleAirdrop = async () => {
    setAirdropping(true);
    setMessage('');
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'airdrop', agentIndex: selectedAgent }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`ERROR: ${data.error}`);
      } else {
        setMessage(`Airdrop confirmed. Sig: ${data.signature?.slice(0, 20)}...`);
        fetchWallets();
      }
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setAirdropping(false);
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const agent = agents[selectedAgent];

  return (
    <div>
      <Terminal title="maverick :: wallet">
        <div className="card-header">Wallet Management</div>

        {loading ? (
          <div className="loader">Loading wallets</div>
        ) : (
          <>
            {agents.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  SELECT AGENT
                </label>
                <select
                  value={selectedAgent}
                  onChange={e => setSelectedAgent(parseInt(e.target.value))}
                  style={{ maxWidth: 300 }}
                >
                  {agents.map((a, i) => (
                    <option key={i} value={i}>{a.name} ({a.address.slice(0, 8)}...)</option>
                  ))}
                </select>
              </div>
            )}

            {agent && (
              <div className="grid-2">
                <div className="card">
                  <div className="card-header">Balance</div>
                  <div className="stat-value" style={{ fontSize: 36 }}>
                    {agent.balance.toFixed(2)}
                  </div>
                  <div className="stat-label">SOL (devnet)</div>
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    <div className="stat-value" style={{ fontSize: 28, color: 'var(--cyan)' }}>
                      {agent.usdc.toFixed(2)}
                    </div>
                    <div className="stat-label">USDC (devnet)</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">Address</div>
                  <div
                    className="address"
                    style={{ fontSize: 13, wordBreak: 'break-all', cursor: 'pointer' }}
                    onClick={() => copyAddress(agent.address)}
                  >
                    {agent.address}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    {copied ? (
                      <span className="msg-success">Copied to clipboard</span>
                    ) : (
                      'Click to copy'
                    )}
                  </div>
                  <a
                    href={`https://explorer.solana.com/address/${agent.address}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}
                  >
                    View on Explorer
                  </a>
                </div>
              </div>
            )}

            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">Devnet Faucet</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Request 1 SOL airdrop from the Solana devnet faucet.
              </p>
              <button
                onClick={handleAirdrop}
                disabled={airdropping}
                className="btn-green"
              >
                {airdropping ? 'Requesting...' : 'Request Airdrop (1 SOL)'}
              </button>
              {message && (
                <div style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: message.startsWith('ERROR') ? 'var(--red)' : 'var(--green)',
                }}>
                  {message}
                </div>
              )}
            </div>
          </>
        )}
      </Terminal>
    </div>
  );
}
