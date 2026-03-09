/**
 * Browser-side API client for the shared Maverick backend.
 *
 * Workflow:
 *   1. Web user's keypair lives in localStorage (browserWallet.ts)
 *   2. Every POST is signed with the user's wallet (nacl.sign.detached)
 *   3. User signs their own on-chain txns in the browser
 *   4. For deposits/paybacks: user sends SOL on-chain, then POSTs tx sig to API
 *   5. For loans/withdrawals: API builds + signs tx server-side, returns sig
 *
 * The API_URL comes from the Next.js public env: NEXT_PUBLIC_API_URL
 */

import { Keypair, Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { signAuthPayload } from './browserWallet';

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'https://maverick-api.vercel.app';
}

// ─── Auth helpers ────────────────────────────────────────────────────

function authHeaders(keypair: Keypair) {
  return signAuthPayload(keypair);
}

async function apiGet(path: string, params?: Record<string, string>) {
  const url = new URL(`${getApiUrl()}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString());
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

async function apiPost(path: string, keypair: Keypair, body: Record<string, any> = {}) {
  const auth = authHeaders(keypair);
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...auth, ...body }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

async function apiGetAuth(path: string, keypair: Keypair, params?: Record<string, string>) {
  const auth = authHeaders(keypair);
  const url = new URL(`${getApiUrl()}${path}`);
  url.searchParams.set('wallet', auth.wallet);
  url.searchParams.set('timestamp', String(auth.timestamp));
  url.searchParams.set('signature', auth.signature);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString());
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// ─── Vault ───────────────────────────────────────────────────────────

export async function getVaultInfo() {
  return apiGet('/api/vault/info');
}

// ─── Bank ────────────────────────────────────────────────────────────

/**
 * Deposit SOL to the shared vault.
 * 1. Build + sign tx in browser
 * 2. Send SOL on-chain to vault
 * 3. POST tx signature to API for recording
 */
export async function bankDeposit(
  connection: Connection,
  keypair: Keypair,
  vaultPubkey: PublicKey,
  amount: number
): Promise<{ txSignature: string }> {
  // Step 1: Send SOL on-chain
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: vaultPubkey,
      lamports: Math.round(amount * 1e9),
    })
  );
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);

  // Step 2: Report to API
  const result = await apiPost('/api/bank/deposit', keypair, {
    txSignature: sig,
    amount,
  });

  return { txSignature: sig, ...result };
}

/**
 * Request a loan from the vault (vault signs server-side).
 */
export async function bankLoan(keypair: Keypair, amount: number) {
  return apiPost('/api/bank/loan', keypair, { amount });
}

/**
 * Payback a loan.
 * 1. Get loan details from API
 * 2. Send total payback on-chain
 * 3. POST tx signature to API
 */
export async function bankPayback(
  connection: Connection,
  keypair: Keypair,
  vaultPubkey: PublicKey,
  totalPayback: number
): Promise<{ txSignature: string }> {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: vaultPubkey,
      lamports: Math.round(totalPayback * 1e9),
    })
  );
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
  const result = await apiPost('/api/bank/payback', keypair, { txSignature: sig });
  return { txSignature: sig, ...result };
}

/**
 * Withdraw contributions (vault signs server-side).
 */
export async function bankWithdraw(keypair: Keypair, amount?: number) {
  return apiPost('/api/bank/withdraw', keypair, { amount });
}

/**
 * Get bank status for the current user.
 */
export async function bankStatus(keypair: Keypair) {
  return apiGetAuth('/api/bank/status', keypair);
}

// ─── AMM ─────────────────────────────────────────────────────────────

/**
 * Get pool reserves and stats (public, no auth).
 */
export async function ammPool() {
  return apiGet('/api/amm/pool');
}

/**
 * Get swap quote (public, no auth).
 */
export async function ammQuote(input: 'SOL' | 'USDC', amount: number) {
  return apiGet('/api/amm/quote', { input, amount: String(amount) });
}

/**
 * Execute a swap.
 * For SOL→USDC: user sends SOL on-chain, then POSTs.
 */
export async function ammSwap(
  connection: Connection,
  keypair: Keypair,
  vaultPubkey: PublicKey,
  input: 'SOL' | 'USDC',
  amount: number
) {
  let txSignature: string;

  if (input === 'SOL') {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: vaultPubkey,
        lamports: Math.round(amount * 1e9),
      })
    );
    txSignature = await sendAndConfirmTransaction(connection, tx, [keypair]);
  } else {
    // USDC swap — SPL token transfer needed
    txSignature = 'usdc-browser-pending';
  }

  return apiPost('/api/amm/swap', keypair, { input, amount, txSignature });
}

/**
 * Add liquidity to the AMM pool.
 */
export async function ammAddLiquidity(
  connection: Connection,
  keypair: Keypair,
  vaultPubkey: PublicKey,
  solAmount: number,
  usdcAmount: number
) {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: vaultPubkey,
      lamports: Math.round(solAmount * 1e9),
    })
  );
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);

  return apiPost('/api/amm/liquidity', keypair, {
    solAmount,
    usdcAmount,
    solTxSignature: sig,
  });
}

// ─── History ─────────────────────────────────────────────────────────

export async function getHistory(wallet?: string, limit = 50) {
  const params: Record<string, string> = { limit: String(limit) };
  if (wallet) params.wallet = wallet;
  return apiGet('/api/history', params);
}
