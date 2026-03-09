import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, AuthError } from '../../lib/auth.js';
import { verifyTransaction } from '../../lib/solana.js';
import { getVaultPublicKey } from '../../lib/vault.js';
import { addContribution, addHistory } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = verifyAuth(req);
    const { txSignature, amount } = req.body;

    if (!txSignature || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Missing txSignature or invalid amount' });
    }

    // Verify the transaction landed on-chain: user → vault
    const vaultPubkey = getVaultPublicKey().toBase58();
    await verifyTransaction(txSignature, auth.wallet, vaultPubkey, amount);

    // Record in database
    await addContribution(auth.wallet, amount, txSignature);
    await addHistory(auth.wallet, 'BANK_DEPOSIT', `Deposited ${amount} SOL to Maverick Bank Vault`, txSignature);

    return res.status(200).json({
      success: true,
      message: `Deposited ${amount} SOL`,
      txSignature,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}
