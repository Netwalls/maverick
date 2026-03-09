import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAmmState } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const input = req.query.input as string; // 'SOL' or 'USDC'
    const amount = Number(req.query.amount);

    if (!input || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Missing input (SOL|USDC) or amount' });
    }

    if (input !== 'SOL' && input !== 'USDC') {
      return res.status(400).json({ error: 'input must be SOL or USDC' });
    }

    const state = await getAmmState();
    if (!state || state.sol_reserve === 0 || state.usdc_reserve === 0) {
      return res.status(200).json({ output: 0, input, amount, priceImpact: 0 });
    }

    const feeRate = state.fee_rate;
    const fee = amount * feeRate;
    const amountAfterFee = amount - fee;
    const k = state.k_value;

    let output: number;
    if (input === 'SOL') {
      const newReserveSOL = state.sol_reserve + amountAfterFee;
      const newReserveUSDC = k / newReserveSOL;
      output = Math.max(0, state.usdc_reserve - newReserveUSDC);
    } else {
      const newReserveUSDC = state.usdc_reserve + amountAfterFee;
      const newReserveSOL = k / newReserveUSDC;
      output = Math.max(0, state.sol_reserve - newReserveSOL);
    }

    const spotPrice = input === 'SOL'
      ? state.usdc_reserve / state.sol_reserve
      : state.sol_reserve / state.usdc_reserve;
    const effectivePrice = output / amount;
    const priceImpact = spotPrice > 0 ? Math.abs(1 - effectivePrice / spotPrice) : 0;

    return res.status(200).json({
      input,
      amount,
      output: Number(output.toFixed(6)),
      outputToken: input === 'SOL' ? 'USDC' : 'SOL',
      fee,
      priceImpact: Number(priceImpact.toFixed(6)),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
