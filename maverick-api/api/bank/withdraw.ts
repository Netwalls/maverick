import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, AuthError } from '../../lib/auth.js';
import { vaultSendSol } from '../../lib/solana.js';
import { getActiveLoan, getContributions, reduceContribution, getVaultBalance, addHistory } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = verifyAuth(req);
    const { amount } = req.body;

    // Check for active loan
    const loan = await getActiveLoan(auth.wallet);
    if (loan) {
      return res.status(400).json({ error: 'Cannot withdraw with an active loan' });
    }

    // Check contributions
    const contribution = await getContributions(auth.wallet);
    const withdrawAmount = amount || contribution;

    if (withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Nothing to withdraw' });
    }

    if (withdrawAmount > contribution) {
      return res.status(400).json({
        error: `Amount exceeds contributions. Available: ${contribution.toFixed(4)} SOL`,
      });
    }

    // Check vault liquidity
    const vaultBalance = await getVaultBalance();
    if (vaultBalance < withdrawAmount) {
      return res.status(400).json({
        error: `Insufficient vault liquidity. Available: ${vaultBalance.toFixed(4)} SOL`,
      });
    }

    // Vault sends SOL to user (server-side signing)
    const txSignature = await vaultSendSol(auth.wallet, withdrawAmount);

    // Reduce contribution in database
    await reduceContribution(auth.wallet, withdrawAmount);
    await addHistory(
      auth.wallet,
      'BANK_WITHDRAW',
      `Withdrew ${withdrawAmount} SOL from Maverick Bank.`,
      txSignature
    );

    return res.status(200).json({
      success: true,
      amount: withdrawAmount,
      txSignature,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}
