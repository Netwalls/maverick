'use client';

import { useEffect, useState } from 'react';
import Terminal from '../../components/Terminal';

interface PoolStats {
  sol: number;
  usdc: number;
  lpCount: number;
  price: number;
}

export default function SwapPage() {
  const [pool, setPool] = useState<PoolStats | null>(null);
  const [agents, setAgents] = useState<{name: string, address: string}[]>([]);
  const [selectedAgent, setSelectedAgent] = useState(0);
  const [input, setInput] = useState<'SOL' | 'USDC'>('SOL');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);
  const [message, setMessage] = useState('');

  const fetchPool = () => {
    fetch('/api/swap')
      .then(r => r.json())
      .then(data => {
        setPool(data.pool);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPool();
    fetch('/api/wallet').then(r => r.json()).then(data => {
      setAgents((data.agents || []).map((a: any) => ({ name: a.name, address: a.address })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setQuote(0); return; }
    fetch(`/api/swap?input=${input}&amount=${amt}`)
      .then(r => r.json())
      .then(data => setQuote(data.quote || 0))
      .catch(() => setQuote(0));
  }, [amount, input]);

  const handleSwap = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setSwapping(true);
    setMessage('');
    try {
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, amount: amt, agentIndex: selectedAgent }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`ERROR: ${data.error}`);
      } else {
        setMessage(`Swapped ${amt} ${input} for ${data.output.toFixed(2)} ${input === 'SOL' ? 'USDC' : 'SOL'}`);
        setPool(data.pool);
        setAmount('');
      }
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setSwapping(false);
  };

  const outputToken = input === 'SOL' ? 'USDC' : 'SOL';

  return (
    <div>
      <Terminal title="maverick :: swap">
        <div className="card-header">AMM Swap</div>

        {loading ? (
          <div className="loader">Loading pool data</div>
        ) : (
          <>
            {pool && (
              <div className="grid-3" style={{ marginBottom: 24 }}>
                <div className="card">
                  <div className="stat">
                    <div className="stat-value">{pool.sol.toFixed(2)}</div>
                    <div className="stat-label">SOL Reserve</div>
                  </div>
                </div>
                <div className="card">
                  <div className="stat">
                    <div className="stat-value">{pool.usdc.toFixed(2)}</div>
                    <div className="stat-label">USDC Reserve</div>
                  </div>
                </div>
                <div className="card">
                  <div className="stat">
                    <div className="stat-value" style={{ color: 'var(--cyan)' }}>
                      {pool.price > 0 ? pool.price.toFixed(2) : '--'}
                    </div>
                    <div className="stat-label">USDC / SOL</div>
                  </div>
                </div>
              </div>
            )}

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

            <div className="card">
              <div className="card-header">Execute Swap</div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  FROM
                </label>
                <div className="flex gap-2">
                  <button
                    className={input === 'SOL' ? 'btn-green' : ''}
                    onClick={() => setInput('SOL')}
                    style={input === 'SOL' ? { background: 'rgba(0,255,65,0.1)' } : {}}
                  >
                    SOL
                  </button>
                  <button
                    className={input === 'USDC' ? 'btn-green' : ''}
                    onClick={() => setInput('USDC')}
                    style={input === 'USDC' ? { background: 'rgba(0,255,65,0.1)' } : {}}
                  >
                    USDC
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  AMOUNT ({input})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`Enter ${input} amount`}
                  step="0.01"
                  min="0"
                  style={{ maxWidth: 300 }}
                />
              </div>

              {quote > 0 && (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  marginBottom: 16,
                  fontSize: 13,
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>You receive: </span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                    {quote.toFixed(2)} {outputToken}
                  </span>
                  {parseFloat(amount) > 0 && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: 12 }}>
                      (rate: 1 {input} = {(quote / parseFloat(amount)).toFixed(4)} {outputToken})
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={handleSwap}
                disabled={swapping || !parseFloat(amount)}
                className="btn-green"
              >
                {swapping ? 'Swapping...' : `Swap ${input} -> ${outputToken}`}
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
