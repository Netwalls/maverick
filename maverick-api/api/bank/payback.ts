import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, AuthError } from '../../lib/auth.js';
import { verifyTransaction } from '../../lib/solana.js';
import { getVaultPublicKey } from '../../lib/vault.js';
import { getActiveLoan, repayLoan, addContribution, addHistory } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = verifyAuth(req);
    const { txSignature } = req.body;

    if (!txSignature) {
      return res.status(400).json({ error: 'Missing txSignature' });
    }

    // Get the active loan
    const loan = await getActiveLoan(auth.wallet);
    if (!loan) {
      return res.status(400).json({ error: 'No active loan to repay' });
    }

    const totalPayback = loan.amount_sol + loan.amount_sol * loan.interest_rate;
    const vaultPubkey = getVaultPublicKey().toBase58();

    // Verify the repayment transaction on-chain: user → vault
    await verifyTransaction(txSignature, auth.wallet, vaultPubkey, totalPayback);

    // Mark loan as repaid, record the repayment as a contribution (interest profit)
    await repayLoan(loan.id);
    await addContribution(auth.wallet, totalPayback, txSignature);
    await addHistory(
      auth.wallet,
      'BANK_PAYBACK',
      `Paid back loan of ${loan.amount_sol} SOL with ${(loan.amount_sol * loan.interest_rate).toFixed(4)} SOL fee.`,
      txSignature
    );

    return res.status(200).json({
      success: true,
      loanAmount: loan.amount_sol,
      feePaid: loan.amount_sol * loan.interest_rate,
      totalPaid: totalPayback,
      txSignature,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}
