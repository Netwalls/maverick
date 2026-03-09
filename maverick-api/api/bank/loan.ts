import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, AuthError } from '../../lib/auth.js';
import { vaultSendSol } from '../../lib/solana.js';
import { getActiveLoan, addLoan, getVaultBalance, addHistory } from '../../lib/db.js';

const INTEREST_RATE = 0.05; // 5%

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = verifyAuth(req);
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid loan amount' });
    }

    // Check for existing loan
    const existing = await getActiveLoan(auth.wallet);
    if (existing) {
      return res.status(409).json({
        error: 'Outstanding loan exists',
        loan: existing,
      });
    }

    // Check vault liquidity
    const vaultBalance = await getVaultBalance();
    if (vaultBalance < amount) {
      return res.status(400).json({
        error: `Insufficient vault liquidity. Available: ${vaultBalance.toFixed(4)} SOL`,
      });
    }

    // Vault sends SOL to borrower (server-side signing)
    const txSignature = await vaultSendSol(auth.wallet, amount);

    // Record loan in database
    await addLoan(auth.wallet, amount, INTEREST_RATE, txSignature);
    await addHistory(
      auth.wallet,
      'BANK_BORROW',
      `Borrowed ${amount} SOL from Bank Vault. Payback Fee: ${(amount * INTEREST_RATE).toFixed(4)} SOL`,
      txSignature
    );

    return res.status(200).json({
      success: true,
      amount,
      fee: amount * INTEREST_RATE,
      totalPayback: amount + amount * INTEREST_RATE,
      txSignature,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}
