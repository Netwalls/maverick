'use client';

import { useState, useCallback } from 'react';
import Terminal from '../../components/Terminal';
import { useWallet } from '../../contexts/WalletContext';

export default function WalletPage() {
  const {
    wallet, balance, loading, connection, authenticated,
    register, login, logout, exportKey, refreshBalance,
  } = useWallet();

  const [airdropping, setAirdropping] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Auth form state
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuth = async () => {
    setMessage('');
    if (!username.trim() || !password) {
      setMessage('ERROR: Username and password required');
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setMessage('ERROR: Passwords do not match');
      return;
    }
    if (isRegister && password.length < 6) {
      setMessage('ERROR: Password must be at least 6 characters');
      return;
    }

    setAuthLoading(true);
    try {
      if (isRegister) {
        await register(username.trim(), password);
        setMessage('Account created. A new Solana wallet has been generated for you.');
      } else {
        await login(username.trim(), password);
        setMessage('Logged in successfully.');
      }
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setAuthLoading(false);
  };

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

  // Not authenticated — show login/register
  if (!authenticated && !loading) {
    return (
      <div>
        <Terminal title="maverick :: wallet">
          <div className="card-header">
            {isRegister ? 'Create Account' : 'Login'}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
            {isRegister
              ? 'Pick a username and password. A new Solana wallet will be generated and encrypted with your password. The server never sees your private key.'
              : 'Enter your username and password to decrypt your wallet.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              style={{ width: '100%' }}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              style={{ width: '100%' }}
              onKeyDown={e => { if (e.key === 'Enter' && !isRegister) handleAuth(); }}
            />
            {isRegister && (
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                style={{ width: '100%' }}
                onKeyDown={e => { if (e.key === 'Enter') handleAuth(); }}
              />
            )}
            <button
              className="btn-green"
              onClick={handleAuth}
              disabled={authLoading}
              style={{ marginTop: 4 }}
            >
              {authLoading
                ? (isRegister ? 'Creating...' : 'Logging in...')
                : (isRegister ? 'Create Account' : 'Login')}
            </button>
          </div>

          <div style={{ marginTop: 16, fontSize: 12 }}>
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <a href="#" onClick={e => { e.preventDefault(); setIsRegister(false); setMessage(''); }}>
                  Login
                </a>
              </span>
            ) : (
              <span>
                New here?{' '}
                <a href="#" onClick={e => { e.preventDefault(); setIsRegister(true); setMessage(''); }}>
                  Create Account
                </a>
              </span>
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
        </Terminal>
      </div>
    );
  }

  return (
    <div>
      <Terminal title="maverick :: wallet">
        <div className="card-header">Wallet Management</div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
          Your encrypted wallet is stored on the server. You can log in from any device
          with your username and password. The server never sees your private key.
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
              <div className="card-header">Account</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn-green" onClick={() => setShowExport(!showExport)}>
                  {showExport ? 'Hide Key' : 'Export Private Key'}
                </button>
                <button
                  className="btn-green"
                  onClick={logout}
                  style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
                >
                  Logout
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
            </div>
          </>
        ) : (
          <div className="loader">Loading wallet...</div>
        )}
      </Terminal>
    </div>
  );
}
