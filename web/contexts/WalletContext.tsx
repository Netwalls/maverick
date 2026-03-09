'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Keypair, PublicKey, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  loadOrCreateWallet,
  importWallet,
  exportPrivateKey,
  setWalletName,
  type BrowserWallet,
} from '../lib/browserWallet';

interface WalletContextValue {
  /** The user's wallet — null during SSR / initial load */
  wallet: BrowserWallet | null;
  /** Solana devnet connection */
  connection: Connection;
  /** SOL balance (refreshes periodically) */
  balance: number;
  /** Whether wallet is loading */
  loading: boolean;
  /** Import an existing wallet by private key */
  importKey: (privateKey: string) => void;
  /** Export the current private key */
  exportKey: () => string | null;
  /** Rename the wallet */
  rename: (name: string) => void;
  /** Force refresh balance */
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Initialize wallet from localStorage on mount (client-side only)
  useEffect(() => {
    const w = loadOrCreateWallet();
    setWallet(w);
    setLoading(false);
  }, []);

  // Refresh balance periodically
  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    try {
      const bal = await connection.getBalance(wallet.publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch {
      // silent fail
    }
  }, [wallet]);

  useEffect(() => {
    refreshBalance();
    const interval = setInterval(refreshBalance, 10_000);
    return () => clearInterval(interval);
  }, [refreshBalance]);

  const importKey = useCallback((privateKey: string) => {
    const w = importWallet(privateKey);
    setWallet(w);
  }, []);

  const exportKey = useCallback(() => {
    return exportPrivateKey();
  }, []);

  const rename = useCallback((name: string) => {
    setWalletName(name);
    if (wallet) {
      setWallet({ ...wallet, name });
    }
  }, [wallet]);

  return (
    <WalletContext.Provider
      value={{ wallet, connection, balance, loading, importKey, exportKey, rename, refreshBalance }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
