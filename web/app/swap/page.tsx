'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import Terminal from '../../components/Terminal';
import { useWallet } from '../../contexts/WalletContext';
import { getVaultInfo, ammPool, ammQuote, ammSwap } from '../../lib/maverickApi';

interface PoolStats {
  sol: number;
  usdc: number;
  price: number;
}

export default function SwapPage() {
  const { wallet, connection, refreshBalance, authenticated, loading: walletLoading } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!walletLoading && !authenticated) router.push('/wallet');
  }, [walletLoading, authenticated, router]);
  const [pool, setPool] = useState<PoolStats | null>(null);
  const [vaultPubkey, setVaultPubkey] = useState<string | null>(null);
  const [input, setInput] = useState<'SOL' | 'USDC'>('SOL');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);
  const [message, setMessage] = useState('');

  const fetchPool = useCallback(async () => {
    try {
      const [poolData, vault] = await Promise.all([ammPool(), getVaultInfo()]);
      setPool({ sol: poolData.sol, usdc: poolData.usdc, price: poolData.price });
      setVaultPubkey(vault.vault);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPool(); }, [fetchPool]);

  // Live quote
  useEffect(() => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setQuote(0); return; }
    ammQuote(input, amt)
      .then(data => setQuote(data.output || 0))
      .catch(() => setQuote(0));
  }, [amount, input]);

  const handleSwap = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !wallet || !vaultPubkey) return;
    setSwapping(true);
    setMessage('');
    try {
      const result = await ammSwap(connection, wallet.keypair, new PublicKey(vaultPubkey), input, amt);
      setMessage(`Swapped ${amt} ${input} for ${result.output.toFixed(4)} ${input === 'SOL' ? 'USDC' : 'SOL'}`);
      setAmount('');
      await Promise.all([fetchPool(), refreshBalance()]);
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setSwapping(false);
  };

  const outputToken = input === 'SOL' ? 'USDC' : 'SOL';

  return (
    <div>
      <Terminal title="maverick :: swap">
        <div className="card-header">AMM Swap (Shared Pool)</div>

        {loading ? (
          <div className="loader">Loading pool data</div>
        ) : (
          <>
            {pool && (
              <div className="grid-3" style={{ marginBottom: 24 }}>
                <div className="card">
                  <div className="stat">
                    <div className="stat-value">{pool.sol.toFixed(4)}</div>
                    <div className="stat-label">SOL Reserve</div>
                  </div>
                </div>
                <div className="card">
                  <div className="stat">
                    <div className="stat-value">{pool.usdc.toFixed(4)}</div>
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
                    {quote.toFixed(4)} {outputToken}
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
                {swapping ? 'Signing tx...' : `Swap ${input} -> ${outputToken}`}
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
