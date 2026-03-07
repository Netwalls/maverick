'use client';

import { useEffect, useState } from 'react';
import Terminal from '../../components/Terminal';

interface AgentInfo {
  name: string;
  address: string;
  balance: number;
  usdc: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [airdropping, setAirdropping] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchAgents = () => {
    fetch('/api/wallet')
      .then(r => r.json())
      .then(data => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleAirdrop = async (index: number) => {
    setAirdropping(index);
    setMessage('');
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'airdrop', agentIndex: index }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`ERROR: ${data.error}`);
      } else {
        setMessage(`Airdrop to ${agents[index]?.name} confirmed`);
        fetchAgents();
      }
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setAirdropping(null);
  };

  const handleInvite = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setMessage('');
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`ERROR: ${data.error}`);
      } else {
        setMessage(`Agent "${newName.trim()}" invited`);
        setNewName('');
        fetchAgents();
      }
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setCreating(false);
  };

  return (
    <div>
      <Terminal title="maverick :: agents">
        <div className="card-header">Agent Overview</div>

        {loading ? (
          <div className="loader">Loading agents</div>
        ) : (
          <>
            <div className="grid-2">
              {agents.map((agent, i) => (
                <div className="card" key={i}>
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{agent.name}</span>
                    <span className="tag tag-cyan" style={{ fontSize: 10 }}>AGENT</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, wordBreak: 'break-all' }}>
                    {agent.address.slice(0, 16)}...{agent.address.slice(-8)}
                  </div>
                  <div className="grid-2" style={{ gap: 8 }}>
                    <div>
                      <div className="stat-value" style={{ fontSize: 20 }}>
                        {agent.balance.toFixed(2)}
                      </div>
                      <div className="stat-label">SOL</div>
                    </div>
                    <div>
                      <div className="stat-value" style={{ fontSize: 20, color: 'var(--cyan)' }}>
                        {agent.usdc.toFixed(2)}
                      </div>
                      <div className="stat-label">USDC</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAirdrop(i)}
                    disabled={airdropping === i}
                    className="btn-green"
                    style={{ marginTop: 12, width: '100%' }}
                  >
                    {airdropping === i ? 'Airdropping...' : 'Airdrop 1 SOL'}
                  </button>
                </div>
              ))}
            </div>

            {/* Invite Agent */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">Invite Agent</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Create a new agent with a fresh wallet.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="Agent name"
                  style={{ flex: 1, maxWidth: 300 }}
                />
                <button
                  onClick={handleInvite}
                  disabled={creating || !newName.trim()}
                  className="btn-green"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>

            {message && (
              <div style={{
                marginTop: 12,
                fontSize: 12,
                color: message.startsWith('ERROR') ? 'var(--red)' : 'var(--green)',
              }}>
                {message}
              </div>
            )}
          </>
        )}
      </Terminal>
    </div>
  );
}
