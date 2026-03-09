import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getVaultKeypair } from './vault.js';

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (_connection) return _connection;
  const rpc = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';
  _connection = new Connection(rpc, 'confirmed');
  return _connection;
}

/**
 * Verify that a transaction signature exists on-chain and matches expected details.
 * Returns the parsed transaction or throws.
 */
export async function verifyTransaction(
  signature: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmountSol: number
): Promise<{ confirmed: boolean; slot: number }> {
  const conn = getConnection();

  // Retry a few times — tx may still be confirming
  let tx = null;
  for (let i = 0; i < 5; i++) {
    tx = await conn.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (tx) break;
    await new Promise(r => setTimeout(r, 2000));
  }

  if (!tx) {
    throw new Error(`Transaction ${signature} not found on-chain`);
  }

  if (tx.meta?.err) {
    throw new Error(`Transaction ${signature} failed on-chain: ${JSON.stringify(tx.meta.err)}`);
  }

  // Verify the transfer details from account keys and balance changes
  const accountKeys = tx.transaction.message.getAccountKeys();
  const fromIndex = accountKeys.staticAccountKeys.findIndex(
    (k: PublicKey) => k.toBase58() === expectedFrom
  );
  const toIndex = accountKeys.staticAccountKeys.findIndex(
    (k: PublicKey) => k.toBase58() === expectedTo
  );

  if (fromIndex === -1 || toIndex === -1) {
    throw new Error('Transaction does not involve expected accounts');
  }

  // Check balance changes
  const preBalances = tx.meta?.preBalances ?? [];
  const postBalances = tx.meta?.postBalances ?? [];

  const toReceived = ((postBalances[toIndex] ?? 0) - (preBalances[toIndex] ?? 0)) / LAMPORTS_PER_SOL;

  // Allow small tolerance for fees
  const expectedAmount = expectedAmountSol;
  if (toReceived < expectedAmount * 0.99) {
    throw new Error(
      `Amount mismatch: expected ${expectedAmount} SOL, recipient got ${toReceived.toFixed(6)} SOL`
    );
  }

  return { confirmed: true, slot: tx.slot };
}

/**
 * Send SOL from the vault to a recipient. Vault signs server-side.
 */
export async function vaultSendSol(
  recipientPubkey: string,
  amountSol: number
): Promise<string> {
  const conn = getConnection();
  const vault = getVaultKeypair();
  const recipient = new PublicKey(recipientPubkey);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: vault.publicKey,
      toPubkey: recipient,
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    })
  );

  const signature = await sendAndConfirmTransaction(conn, transaction, [vault], {
    commitment: 'confirmed',
  });

  return signature;
}

/**
 * Get the vault's on-chain SOL balance.
 */
export async function getVaultSolBalance(): Promise<number> {
  const conn = getConnection();
  const vault = getVaultKeypair();
  const balance = await conn.getBalance(vault.publicKey);
  return balance / LAMPORTS_PER_SOL;
}
