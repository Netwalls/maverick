/**
 * Browser-side wallet management using localStorage.
 *
 * Key storage per platform:
 *   CLI (npx maverick) → ~/.maverick/.env
 *   Web (browser)      → localStorage("maverick_wallet_key")
 *
 * The private key is stored as base58-encoded secret key.
 * On first visit, a new Solana keypair is generated automatically.
 */

import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

const STORAGE_KEY = 'maverick_wallet_key';
const WALLET_NAME_KEY = 'maverick_wallet_name';

export interface BrowserWallet {
  keypair: Keypair;
  publicKey: PublicKey;
  address: string;
  name: string;
}

/**
 * Load wallet from localStorage, or generate a new one.
 */
export function loadOrCreateWallet(): BrowserWallet {
  if (typeof window === 'undefined') {
    throw new Error('BrowserWallet can only be used in browser');
  }

  let keypair: Keypair;
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      keypair = Keypair.fromSecretKey(bs58.decode(stored));
    } catch {
      // Corrupted key — regenerate
      keypair = Keypair.generate();
      localStorage.setItem(STORAGE_KEY, bs58.encode(keypair.secretKey));
    }
  } else {
    keypair = Keypair.generate();
    localStorage.setItem(STORAGE_KEY, bs58.encode(keypair.secretKey));
  }

  const name = localStorage.getItem(WALLET_NAME_KEY) || 'Alpha';

  return {
    keypair,
    publicKey: keypair.publicKey,
    address: keypair.publicKey.toBase58(),
    name,
  };
}

/**
 * Import wallet from a base58 private key string.
 */
export function importWallet(privateKeyBase58: string): BrowserWallet {
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
  localStorage.setItem(STORAGE_KEY, privateKeyBase58);

  return {
    keypair,
    publicKey: keypair.publicKey,
    address: keypair.publicKey.toBase58(),
    name: localStorage.getItem(WALLET_NAME_KEY) || 'Alpha',
  };
}

/**
 * Export the current wallet's private key.
 */
export function exportPrivateKey(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Set the wallet display name.
 */
export function setWalletName(name: string): void {
  localStorage.setItem(WALLET_NAME_KEY, name);
}

/**
 * Check if a wallet exists in localStorage.
 */
export function hasWallet(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(STORAGE_KEY);
}

/**
 * Sign a message for API authentication.
 * Signs `maverick:<timestamp>` with the wallet's nacl secret key.
 */
export function signAuthPayload(keypair: Keypair): {
  wallet: string;
  timestamp: number;
  signature: string;
} {
  const timestamp = Date.now();
  const message = new TextEncoder().encode(`maverick:${timestamp}`);

  // nacl.sign.detached using the keypair's secret key (first 64 bytes)
  // @solana/web3.js Keypair.secretKey is the full 64-byte nacl secret key
  const { sign } = nacl();
  const sig = sign.detached(message, keypair.secretKey);
  const signature = btoa(String.fromCharCode(...sig));

  return { wallet: keypair.publicKey.toBase58(), timestamp, signature };
}

/**
 * Lazy-load tweetnacl. We use a helper so it works in browser.
 */
function nacl(): typeof import('tweetnacl') {
  // tweetnacl is a small sync lib that works in browser
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('tweetnacl');
}
