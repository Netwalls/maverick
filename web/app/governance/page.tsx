'use client';

import { useEffect, useState } from 'react';
import Terminal from '../../components/Terminal';

interface AgentInfo {
  name: string;
  address: string;
  index: number;
}

interface Proposal {
  id: string;
  fromAgent: string;
  toAgent: string;
  amount: number;
  token: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  txSignature?: string;
  createdAt: string;
}

export default function GovernancePage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fromIndex, setFromIndex] = useState(0);
  const [toIndex, setToIndex] = useState(0);
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<'SOL' | 'USDC'>('SOL');
  const [reason, setReason] = useState('');

  const fetchData = () => {
    Promise.all([
      fetch('/api/agents').then(r => r.json()),
      fetch('/api/governance').then(r => r.json()),
    ]).then(([agentData, govData]) => {
      setAgents(agentData.agents || []);
      setProposals(govData.proposals || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !reason.trim()) return;
    if (fromIndex === toIndex) {
      setMessage('ERROR: From and To agents must be different');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          fromAgentIndex: fromIndex,
          toAgentIndex: toIndex,
          amount: amt,
          token,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`ERROR: ${data.error}`);
      } else {
        setMessage('Proposal created');
        setAmount('');
        setReason('');
        fetchData();
      }
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setSubmitting(false);
  };

  const handleVote = async (proposalId: string, action: 'approve' | 'reject') => {
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, proposalId }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`ERROR: ${data.error}`);
      } else {
        setMessage(action === 'approve'
          ? `Approved. Tx: ${data.txSignature?.slice(0, 20)}...`
          : 'Proposal rejected');
        fetchData();
      }
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setSubmitting(false);
  };

  const statusTag = (s: string) => {
    if (s === 'approved') return 'tag tag-green';
    if (s === 'rejected') return 'tag tag-red';
    return 'tag tag-yellow';
  };

  return (
    <div>
      <Terminal title="maverick :: governance">
        <div className="card-header">Governance</div>

        {loading ? (
          <div className="loader">Loading governance data</div>
        ) : (
          <>
            {/* Create Proposal */}
            <div className="card">
              <div className="card-header">Create Proposal</div>

              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    FROM (requester)
                  </label>
                  <select value={fromIndex} onChange={e => setFromIndex(parseInt(e.target.value))}>
                    {agents.map(a => (
                      <option key={a.index} value={a.index}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    TO (provider)
                  </label>
                  <select value={toIndex} onChange={e => setToIndex(parseInt(e.target.value))}>
                    {agents.map(a => (
                      <option key={a.index} value={a.index}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    AMOUNT
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    TOKEN
                  </label>
                  <div className="flex gap-2">
                    <button
                      className={token === 'SOL' ? 'btn-green' : ''}
                      onClick={() => setToken('SOL')}
                      style={token === 'SOL' ? { background: 'rgba(0,255,65,0.1)' } : {}}
                    >
                      SOL
                    </button>
                    <button
                      className={token === 'USDC' ? 'btn-green' : ''}
                      onClick={() => setToken('USDC')}
                      style={token === 'USDC' ? { background: 'rgba(0,255,65,0.1)' } : {}}
                    >
                      USDC
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  REASON
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Describe the purpose of this transfer"
                  style={{ width: '100%' }}
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={submitting || !parseFloat(amount) || !reason.trim()}
                className="btn-green"
              >
                {submitting ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </div>

            {/* Proposals List */}
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">Proposals ({proposals.length})</div>

              {proposals.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 16 }}>
                  No proposals yet. Create one above.
                </div>
              ) : (
                proposals.map(p => (
                  <div key={p.id} style={{
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13 }}>
                        <span style={{ color: 'var(--cyan)' }}>{p.fromAgent}</span>
                        {' -> '}
                        <span style={{ color: 'var(--cyan)' }}>{p.toAgent}</span>
                      </span>
                      <span className={statusTag(p.status)}>{p.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                      {p.amount.toFixed(2)} {p.token} -- {p.reason}
                    </div>
                    {p.txSignature && (
                      <div style={{ fontSize: 11, color: 'var(--green)' }}>
                        Tx: {p.txSignature.slice(0, 24)}...
                      </div>
                    )}
                    {p.status === 'pending' && (
                      <div className="flex gap-2" style={{ marginTop: 8 }}>
                        <button
                          className="btn-green"
                          onClick={() => handleVote(p.id, 'approve')}
                          disabled={submitting}
                          style={{ fontSize: 11 }}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-red"
                          onClick={() => handleVote(p.id, 'reject')}
                          disabled={submitting}
                          style={{ fontSize: 11 }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
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
