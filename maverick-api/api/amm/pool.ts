import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAmmState } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const state = await getAmmState();
    if (!state) {
      return res.status(200).json({ sol: 0, usdc: 0, k: 0, price: 0, totalShares: 0 });
    }

    return res.status(200).json({
      sol: state.sol_reserve,
      usdc: state.usdc_reserve,
      k: state.k_value,
      price: state.sol_reserve > 0 ? state.usdc_reserve / state.sol_reserve : 0,
      totalShares: state.total_shares,
      feeRate: state.fee_rate,
      updatedAt: state.updated_at,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
