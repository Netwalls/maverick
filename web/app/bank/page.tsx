'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import Terminal from '../../components/Terminal';
import { useWallet } from '../../contexts/WalletContext';
import { getVaultInfo, bankDeposit, bankLoan, bankPayback, bankWithdraw, bankStatus } from '../../lib/maverickApi';

interface BankData {
  vaultBalance: number;
  contribution: number;
  loan: { id: number; amount: number; fee: number; totalPayback: number; createdAt: string } | null;
}

export default function BankPage() {
  const { wallet, connection, refreshBalance, authenticated, loading: walletLoading } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!walletLoading && !authenticated) router.push('/wallet');
  }, [walletLoading, authenticated, router]);
  const [data, setData] = useState<BankData | null>(null);
  const [vaultPubkey, setVaultPubkey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState('');

  const fetchBank = useCallback(async () => {
    if (!wallet) return;
    try {
      const [vault, status] = await Promise.all([
        getVaultInfo(),
        bankStatus(wallet.keypair),
      ]);
      setVaultPubkey(vault.vault);
      setData({
        vaultBalance: vault.balanceOnChain,
        contribution: status.contribution,
        loan: status.loan,
      });
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setLoading(false);
  }, [wallet]);

  useEffect(() => { fetchBank(); }, [fetchBank]);

  const doDeposit = async () => {
    if (!wallet || !vaultPubkey) return;
    setActionLoading('deposit');
    setMessage('');
    try {
      const amt = parseFloat(amount) || 0.1;
      await bankDeposit(connection, wallet.keypair, new PublicKey(vaultPubkey), amt);
      setMessage(`DEPOSIT completed: ${amt} SOL`);
      setAmount('');
      await Promise.all([fetchBank(), refreshBalance()]);
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setActionLoading('');
  };

  const doWithdraw = async () => {
    if (!wallet) return;
    setActionLoading('withdraw');
    setMessage('');
    try {
      const amt = parseFloat(amount) || undefined;
      const result = await bankWithdraw(wallet.keypair, amt);
      setMessage(`WITHDRAWAL completed: ${result.amount} SOL`);
      setAmount('');
      await Promise.all([fetchBank(), refreshBalance()]);
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setActionLoading('');
  };

  const doLoan = async () => {
    if (!wallet) return;
    setActionLoading('loan');
    setMessage('');
    try {
      const amt = parseFloat(amount) || 0.1;
      const result = await bankLoan(wallet.keypair, amt);
      setMessage(`LOAN GRANTED: ${amt} SOL. Payback: ${result.totalPayback.toFixed(4)} SOL`);
      setAmount('');
      await Promise.all([fetchBank(), refreshBalance()]);
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setActionLoading('');
  };

  const doPayback = async () => {
    if (!wallet || !vaultPubkey || !data?.loan) return;
    setActionLoading('payback');
    setMessage('');
    try {
      await bankPayback(connection, wallet.keypair, new PublicKey(vaultPubkey), data.loan.totalPayback);
      setMessage(`PAYBACK completed: ${data.loan.totalPayback.toFixed(4)} SOL`);
      await Promise.all([fetchBank(), refreshBalance()]);
    } catch (e: any) {
      setMessage(`ERROR: ${e.message}`);
    }
    setActionLoading('');
  };

  return (
    <div>
      <Terminal title="maverick :: bank">
        <div className="card-header">Maverick Bank (Shared Vault)</div>

        {loading ? (
          <div className="loader">Loading bank data</div>
        ) : data ? (
          <>
            <div className="grid-3" style={{ marginBottom: 24 }}>
              <div className="card">
                <div className="stat">
                  <div className="stat-value">{data.vaultBalance.toFixed(4)}</div>
                  <div className="stat-label">Vault Balance (SOL)</div>
                </div>
              </div>
              <div className="card">
                <div className="stat">
                  <div className="stat-value" style={{ color: 'var(--cyan)' }}>
                    {data.contribution.toFixed(4)}
                  </div>
                  <div className="stat-label">Your Contribution</div>
                </div>
              </div>
              <div className="card">
                <div className="stat">
                  <div className="stat-value" style={{ color: data.loan ? 'var(--red)' : 'var(--text-muted)' }}>
                    {data.loan ? data.loan.amount.toFixed(4) : '0.00'}
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
                  <button className="btn-green" onClick={doDeposit} disabled={!!actionLoading}>
                    {actionLoading === 'deposit' ? 'Signing tx...' : 'Deposit'}
                  </button>
                  <button onClick={doWithdraw} disabled={!!actionLoading}>
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
                    <button className="btn-red" onClick={doPayback} disabled={!!actionLoading}>
                      {actionLoading === 'payback' ? 'Signing tx...' : 'Payback Loan'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                      No outstanding loan. Request a loan from the shared vault.
                    </p>
                    <button className="btn-green" onClick={doLoan} disabled={!!actionLoading}>
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
                border: `1px solid ${message.startsWith('ERROR') ? 'var(--red)' : 'var(--green)'}`,
                color: message.startsWith('ERROR') ? 'var(--red)' : 'var(--green)',
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
