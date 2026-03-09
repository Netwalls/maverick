'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Terminal from '../../components/Terminal';
import { useWallet } from '../../contexts/WalletContext';
import { getHistory } from '../../lib/maverickApi';

interface HistoryItem {
  id: number;
  wallet: string;
  action: string;
  description: string;
  txSignature?: string;
  reasoning?: string;
  createdAt: string;
}

export default function HistoryPage() {
  const { wallet, authenticated, loading: walletLoading } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!walletLoading && !authenticated) router.push('/wallet');
  }, [walletLoading, authenticated, router]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const walletAddr = showAll ? undefined : wallet?.address;
      const data = await getHistory(walletAddr);
      setHistory(data.history || []);
    } catch {
      // silent
    }
    setLoading(false);
  }, [wallet, showAll]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

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
        <div className="card-header">Transaction History (Shared Vault)</div>

        <div className="flex gap-4" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All Actions ({history.length})</option>
              {actionTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showAll}
                onChange={e => setShowAll(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Show all users
            </label>
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
                  <th>Time</th>
                  <th>Action</th>
                  <th>Wallet</th>
                  <th>Description</th>
                  <th>Signature</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(h.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className={`tag ${tagColor(h.action)}`}>
                        {h.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {h.wallet.slice(0, 4)}...{h.wallet.slice(-4)}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 300 }}>
                      {h.description}
                    </td>
                    <td>
                      {h.txSignature ? (
                        <a
                          href={`https://explorer.solana.com/tx/${h.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 11 }}
                        >
                          {h.txSignature.slice(0, 8)}...
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
