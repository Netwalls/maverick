'use client';

import { useEffect, useState } from 'react';
import Terminal from '../../components/Terminal';

interface BankData {
  vaultBalance: number;
  contribution: number;
  loan?: { borrower: string; amount: number; fee: number; timestamp: string };
  address: string;
}

export default function BankPage() {
  const [data, setData] = useState<BankData | null>(null);
  const [agents, setAgents] = useState<{name: string, address: string}[]>([]);
  const [selectedAgent, setSelectedAgent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState('');

  const fetchBank = (agentIdx?: number) => {
    const idx = agentIdx ?? selectedAgent;
    fetch(`/api/bank?agentIndex=${idx}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBank();
    fetch('/api/wallet').then(r => r.json()).then(data => {
      setAgents((data.agents || []).map((a: any) => ({ name: a.name, address: a.address })));
    }).catch(() => {});
  }, []);

  const doAction = async (action: string) => {
    setActionLoading(action);
    setMessage('');
    try {
      const res = await fetch('/api/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, amount: parseFloat(amount) || 0.1, agentIndex: selectedAgent }),
      });
      const result = await res.json();
      if (result.error) {
        setMessage(`ERROR: ${result.error}`);
      } else if (result.success === false) {
        setMessage(`DENIED: ${action} was rejected`);
      } else {
        setMessage(`${action.toUpperCase()} completed successfully`);
        setAmount('');
        fetchBank(selectedAgent);
      }
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setActionLoading('');
  };

  return (
    <div>
      <Terminal title="maverick :: bank">
        <div className="card-header">Maverick Bank</div>

        {loading ? (
          <div className="loader">Loading bank data</div>
        ) : data ? (
          <>
            {agents.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  SELECT AGENT
                </label>
                <select
                  value={selectedAgent}
                  onChange={e => {
                    const idx = parseInt(e.target.value);
                    setSelectedAgent(idx);
                    fetchBank(idx);
                  }}
                  style={{ maxWidth: 300 }}
                >
                  {agents.map((a, i) => (
                    <option key={i} value={i}>{a.name} ({a.address.slice(0, 8)}...)</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid-3" style={{ marginBottom: 24 }}>
              <div className="card">
                <div className="stat">
                  <div className="stat-value">{data.vaultBalance.toFixed(2)}</div>
                  <div className="stat-label">Vault Balance (SOL)</div>
                </div>
              </div>
              <div className="card">
                <div className="stat">
                  <div className="stat-value" style={{ color: 'var(--cyan)' }}>
                    {data.contribution.toFixed(2)}
                  </div>
                  <div className="stat-label">Your Contribution</div>
                </div>
              </div>
              <div className="card">
                <div className="stat">
                  <div className="stat-value" style={{ color: data.loan ? 'var(--red)' : 'var(--text-muted)' }}>
                    {data.loan ? data.loan.amount.toFixed(2) : '0.00'}
                  </div>
                  <div className="stat-label">Outstanding Loan</div>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="card-header">Deposit / Withdraw</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    AMOUNT (SOL)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.1"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-green"
                    onClick={() => doAction('deposit')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'deposit' ? 'Processing...' : 'Deposit'}
                  </button>
                  <button
                    onClick={() => doAction('withdraw')}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'withdraw' ? 'Processing...' : 'Withdraw'}
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header">Loans</div>
                {data.loan ? (
                  <div>
                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Principal: </span>
                      <span style={{ color: 'var(--red)' }}>{data.loan.amount} SOL</span>
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Fee (5%): </span>
                      <span style={{ color: 'var(--yellow)' }}>{data.loan.fee} SOL</span>
                    </div>
                    <button
                      className="btn-red"
                      onClick={() => doAction('payback')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'payback' ? 'Processing...' : 'Payback Loan'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                      No outstanding loan. Request a loan from the vault.
                    </p>
                    <button
                      className="btn-green"
                      onClick={() => doAction('loan')}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === 'loan' ? 'Processing...' : `Request Loan (${parseFloat(amount) || 0.1} SOL)`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {message && (
              <div style={{
                marginTop: 16,
                padding: '8px 12px',
                fontSize: 12,
                background: 'var(--bg)',
                border: `1px solid ${message.startsWith('ERROR') || message.startsWith('DENIED') ? 'var(--red)' : 'var(--green)'}`,
                color: message.startsWith('ERROR') || message.startsWith('DENIED') ? 'var(--red)' : 'var(--green)',
              }}>
                {message}
              </div>
            )}
          </>
        ) : (
          <div className="msg-error">Failed to load bank data</div>
        )}
      </Terminal>
    </div>
  );
}
