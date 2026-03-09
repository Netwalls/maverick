'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  loadOrCreateWallet,
  exportPrivateKey,
  setWalletName,
  type BrowserWallet,
} from '../lib/browserWallet';
import {
  registerAccount,
  loginAccount,
  logout as cryptoLogout,
  isLoggedIn,
} from '../lib/cryptoWallet';

interface WalletContextValue {
  /** The user's wallet — null if not logged in */
  wallet: BrowserWallet | null;
  /** Solana devnet connection */
  connection: Connection;
  /** SOL balance (refreshes periodically) */
  balance: number;
  /** Whether wallet is loading */
  loading: boolean;
  /** Whether user is authenticated */
  authenticated: boolean;
  /** Register a new account (username + password) */
  register: (username: string, password: string) => Promise<void>;
  /** Login with existing account */
  login: (username: string, password: string) => Promise<void>;
  /** Logout and clear session */
  logout: () => void;
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
  const [authenticated, setAuthenticated] = useState(false);

  // On mount: check if user has an active session in localStorage
  useEffect(() => {
    if (isLoggedIn()) {
      try {
        const w = loadOrCreateWallet();
        setWallet(w);
        setAuthenticated(true);
      } catch {
        // Corrupted session — clear it
        cryptoLogout();
      }
    }
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

  const register = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const { keypair } = await registerAccount(username, password);
      const w: BrowserWallet = {
        keypair,
        publicKey: keypair.publicKey,
        address: keypair.publicKey.toBase58(),
        name: username,
      };
      setWallet(w);
      setAuthenticated(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const { keypair } = await loginAccount(username, password);
      const w: BrowserWallet = {
        keypair,
        publicKey: keypair.publicKey,
        address: keypair.publicKey.toBase58(),
        name: username,
      };
      setWallet(w);
      setAuthenticated(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    cryptoLogout();
    setWallet(null);
    setBalance(0);
    setAuthenticated(false);
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
      value={{
        wallet,
        connection,
        balance,
        loading,
        authenticated,
        register,
        login,
        logout,
        exportKey,
        rename,
        refreshBalance,
      }}
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
