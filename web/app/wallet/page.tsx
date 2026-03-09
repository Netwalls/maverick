'use client';

import { useState, useCallback } from 'react';
import Terminal from '../../components/Terminal';
import { useWallet } from '../../contexts/WalletContext';

export default function WalletPage() {
  const { wallet, balance, loading, connection, importKey, exportKey, refreshBalance } = useWallet();
  const [airdropping, setAirdropping] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [showExport, setShowExport] = useState(false);

  const handleAirdrop = async () => {
    if (!wallet) return;
    setAirdropping(true);
    setMessage('');
    try {
      const sig = await connection.requestAirdrop(wallet.publicKey, 1e9);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
      setMessage(`Airdrop confirmed. Sig: ${sig.slice(0, 20)}...`);
      await refreshBalance();
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setAirdropping(false);
  };

  const copyAddress = useCallback(() => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [wallet]);

  const handleImport = () => {
    try {
      importKey(importValue.trim());
      setShowImport(false);
      setImportValue('');
      setMessage('Wallet imported successfully.');
    } catch (e: any) {
      setMessage(`ERROR: Invalid private key — ${e.message}`);
    }
  };

  return (
    <div>
      <Terminal title="maverick :: wallet">
        <div className="card-header">Wallet Management</div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
          Your wallet key is stored in this browser&apos;s localStorage. It persists across sessions
          but is unique to this browser. Export your key to use the same wallet in the CLI.
        </p>

        {loading ? (
          <div className="loader">Loading wallet</div>
        ) : wallet ? (
          <>
            <div className="grid-2">
              <div className="card">
                <div className="card-header">Balance</div>
                <div className="stat-value" style={{ fontSize: 36 }}>
                  {balance.toFixed(4)}
                </div>
                <div className="stat-label">SOL (devnet)</div>
              </div>

              <div className="card">
                <div className="card-header">Address</div>
                <div
                  className="address"
                  style={{ fontSize: 13, wordBreak: 'break-all', cursor: 'pointer' }}
                  onClick={copyAddress}
                >
                  {wallet.address}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  {copied ? (
                    <span className="msg-success">Copied to clipboard</span>
                  ) : (
                    'Click to copy'
                  )}
                </div>
                <a
                  href={`https://explorer.solana.com/address/${wallet.address}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}
                >
                  View on Explorer
                </a>
              </div>
            </div>

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

            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">Key Management</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn-green" onClick={() => setShowExport(!showExport)}>
                  {showExport ? 'Hide Key' : 'Export Private Key'}
                </button>
                <button className="btn-green" onClick={() => setShowImport(!showImport)}>
                  Import Key
                </button>
              </div>
              {showExport && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 4, wordBreak: 'break-all', fontSize: 12 }}>
                  <div style={{ color: 'var(--red)', fontSize: 11, marginBottom: 8 }}>
                    WARNING: Never share your private key. Anyone with this key controls your wallet.
                  </div>
                  <code>{exportKey()}</code>
                </div>
              )}
              {showImport && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Paste a base58 private key to import an existing wallet.
                    This replaces your current browser wallet.
                  </p>
                  <input
                    type="password"
                    value={importValue}
                    onChange={e => setImportValue(e.target.value)}
                    placeholder="Base58 private key..."
                    style={{ width: '100%', marginBottom: 8 }}
                  />
                  <button className="btn-green" onClick={handleImport}>
                    Import
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="loader">Creating wallet...</div>
        )}
      </Terminal>
    </div>
  );
}
