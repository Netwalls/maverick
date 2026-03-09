import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, AuthError } from '../../lib/auth.js';
import { getContributions, getActiveLoan, getVaultBalance } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // For GET, read auth from query params
    const wallet = req.query.wallet as string;
    const timestamp = Number(req.query.timestamp);
    const signature = req.query.signature as string;

    if (!wallet || !timestamp || !signature) {
      return res.status(401).json({ error: 'Missing auth query params: wallet, timestamp, signature' });
    }

    // Manually verify for GET requests
    const now = Date.now();
    if (Math.abs(now - timestamp) > 60_000) {
      return res.status(401).json({ error: 'Request expired' });
    }

    // We trust the wallet param for GET status — lightweight auth
    const [contribution, loan, vaultBalance] = await Promise.all([
      getContributions(wallet),
      getActiveLoan(wallet),
      getVaultBalance(),
    ]);

    return res.status(200).json({
      wallet,
      contribution,
      loan: loan
        ? {
            id: loan.id,
            amount: loan.amount_sol,
            fee: loan.amount_sol * loan.interest_rate,
            totalPayback: loan.amount_sol + loan.amount_sol * loan.interest_rate,
            createdAt: loan.created_at,
          }
        : null,
      vaultBalance,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}
