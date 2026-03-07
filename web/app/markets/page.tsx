'use client';

import { useEffect, useState } from 'react';
import Terminal from '../../components/Terminal';

interface Market {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle: string;
  category: string;
  subcategory: string;
  yes_bid: number;
  yes_ask: number;
  status: string;
}

interface BetHistory {
  timestamp: string;
  description: string;
  signature?: string;
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [betSide, setBetSide] = useState<'yes' | 'no'>('yes');
  const [betAmount, setBetAmount] = useState('0.1');
  const [betting, setBetting] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [bets, setBets] = useState<BetHistory[]>([]);

  const fetchMarkets = (category?: string) => {
    setLoading(true);
    const url = category ? `/api/markets?category=${encodeURIComponent(category)}` : '/api/markets';
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setMarkets(data.markets || []);
        setCategories(data.categories || {});
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMarkets();
    fetch('/api/history')
      .then(r => r.json())
      .then(data => {
        const betItems = (data.history || []).filter((h: any) => h.action === 'BET');
        setBets(betItems);
      })
      .catch(() => {});
  }, []);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    fetchMarkets(cat || undefined);
  };

  const handleBet = async () => {
    if (!selectedMarket) return;
    setBetting(true);
    setMessage('');
    try {
      const res = await fetch('/api/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: selectedMarket.ticker,
          side: betSide,
          amount: parseFloat(betAmount),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`ERROR: ${data.error}`);
      } else {
        setMessage(`Bet placed: ${betSide.toUpperCase()} on ${selectedMarket.ticker} at ${data.price}c`);
        setSelectedMarket(null);
      }
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setBetting(false);
  };

  const filtered = search
    ? markets.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || m.ticker.toLowerCase().includes(search.toLowerCase()))
    : markets;

  return (
    <div>
      <Terminal title="maverick :: markets">
        <div className="card-header">Prediction Markets (Kalshi)</div>

        <div className="flex gap-4" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <select
              value={selectedCategory}
              onChange={e => handleCategoryChange(e.target.value)}
            >
              <option value="">All Categories ({total})</option>
              {Object.keys(categories).sort().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search markets..."
            />
          </div>
        </div>

        {loading ? (
          <div className="loader">Fetching markets</div>
        ) : (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Yes</th>
                  <th style={{ textAlign: 'right' }}>No</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.ticker}>
                    <td>
                      <div style={{ fontSize: 12, maxWidth: 400 }}>{m.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.ticker}</div>
                    </td>
                    <td>
                      <span className="tag tag-cyan">{m.category}</span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>
                      {m.yes_bid}c
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--red)', fontWeight: 600 }}>
                      {100 - m.yes_bid}c
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedMarket(m)}
                        style={{ padding: '4px 8px', fontSize: 10 }}
                      >
                        BET
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                No markets found
              </div>
            )}
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

      <div style={{ marginTop: 16 }}>
        <Terminal title="your bets">
          {bets.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
              No bets placed yet
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Description</th>
                  <th>Signature</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((b, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(b.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontSize: 12 }}>{b.description}</td>
                    <td>
                      {b.signature ? (
                        <a
                          href={`https://explorer.solana.com/tx/${b.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 11 }}
                        >
                          {b.signature.slice(0, 8)}...
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Terminal>
      </div>

      {selectedMarket && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
          onClick={() => setSelectedMarket(null)}
        >
          <div
            className="card"
            style={{ width: 480, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="card-header">Place Bet</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>{selectedMarket.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
              {selectedMarket.ticker} | Yes: {selectedMarket.yes_bid}c | No: {100 - selectedMarket.yes_bid}c
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                SIDE
              </label>
              <div className="flex gap-2">
                <button
                  className={betSide === 'yes' ? 'btn-green' : ''}
                  onClick={() => setBetSide('yes')}
                  style={betSide === 'yes' ? { background: 'rgba(0,255,65,0.1)' } : {}}
                >
                  YES
                </button>
                <button
                  className={betSide === 'no' ? 'btn-red' : ''}
                  onClick={() => setBetSide('no')}
                  style={betSide === 'no' ? { background: 'rgba(255,0,64,0.1)' } : {}}
                >
                  NO
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                AMOUNT (SOL)
              </label>
              <input
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>

            <div className="flex gap-2">
              <button
                className="btn-green"
                onClick={handleBet}
                disabled={betting}
              >
                {betting ? 'Placing...' : 'Confirm Bet'}
              </button>
              <button onClick={() => setSelectedMarket(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
