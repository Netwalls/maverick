'use client';

import { useEffect, useState } from 'react';
import Terminal from '../../components/Terminal';

interface HistoryItem {
  timestamp: string;
  agentAddress: string;
  action: string;
  description: string;
  signature?: string;
  reasoning?: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchAddr, setSearchAddr] = useState('');

  useEffect(() => {
    const params = searchAddr ? `?address=${searchAddr}` : '';
    fetch(`/api/history${params}`)
      .then(r => r.json())
      .then(data => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [searchAddr]);

  const actionTypes = [...new Set(history.map(h => h.action))];

  const filtered = filter
    ? history.filter(h => h.action === filter)
    : history;

  const tagColor = (action: string) => {
    if (action.includes('SWAP')) return 'tag-cyan';
    if (action.includes('BANK') || action.includes('DEPOSIT')) return 'tag-green';
    if (action.includes('BORROW') || action.includes('PAYBACK')) return 'tag-yellow';
    if (action.includes('BET') || action.includes('KALSHI')) return 'tag-yellow';
    return 'tag-cyan';
  };

  return (
    <div>
      <Terminal title="maverick :: history">
        <div className="card-header">Transaction History</div>

        <div className="flex gap-4" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All Actions ({history.length})</option>
              {actionTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="text"
              value={searchAddr}
              onChange={e => setSearchAddr(e.target.value)}
              placeholder="Filter by agent address..."
            />
          </div>
        </div>

        {loading ? (
          <div className="loader">Loading history</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No transactions recorded yet.
          </div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Agent</th>
                  <th>Description</th>
                  <th>Signature</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(h.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span className={`tag ${tagColor(h.action)}`}>
                        {h.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {h.agentAddress.slice(0, 4)}...{h.agentAddress.slice(-4)}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 300 }}>
                      {h.description}
                    </td>
                    <td>
                      {h.signature ? (
                        <a
                          href={`https://explorer.solana.com/tx/${h.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 11 }}
                        >
                          {h.signature.slice(0, 8)}...
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Terminal>
    </div>
  );
}
