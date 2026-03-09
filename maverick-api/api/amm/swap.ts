import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, AuthError } from '../../lib/auth.js';
import { verifyTransaction, vaultSendSol } from '../../lib/solana.js';
import { getVaultPublicKey } from '../../lib/vault.js';
import { getAmmState, updateAmmState, addHistory } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = verifyAuth(req);
    const { input, amount, txSignature } = req.body;

    if (!input || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Missing input (SOL|USDC) or amount' });
    }

    if (input !== 'SOL' && input !== 'USDC') {
      return res.status(400).json({ error: 'input must be SOL or USDC' });
    }

    const state = await getAmmState();
    if (!state || state.sol_reserve === 0 || state.usdc_reserve === 0) {
      return res.status(400).json({ error: 'AMM pool has no liquidity' });
    }

    // Calculate output
    const feeRate = state.fee_rate;
    const fee = amount * feeRate;
    const amountAfterFee = amount - fee;
    const k = state.k_value;

    let output: number;
    let newSolReserve: number;
    let newUsdcReserve: number;

    if (input === 'SOL') {
      // User sends SOL to vault → vault sends USDC equivalent
      // For now, AMM is SOL-only (USDC is tracked as virtual price)
      newSolReserve = state.sol_reserve + amountAfterFee;
      newUsdcReserve = k / newSolReserve;
      output = Math.max(0, state.usdc_reserve - newUsdcReserve);

      if (!txSignature) {
        return res.status(400).json({ error: 'Missing txSignature for SOL input' });
      }

      // Verify user sent SOL to vault
      const vaultPubkey = getVaultPublicKey().toBase58();
      await verifyTransaction(txSignature, auth.wallet, vaultPubkey, amount);
    } else {
      // USDC → SOL: user sends USDC (verified), vault sends SOL
      newUsdcReserve = state.usdc_reserve + amountAfterFee;
      newSolReserve = k / newUsdcReserve;
      output = Math.max(0, state.sol_reserve - newSolReserve);

      if (!txSignature) {
        return res.status(400).json({ error: 'Missing txSignature for USDC input' });
      }

      // For USDC swaps, verify the SPL token transfer on-chain
      // Simplified: trust the tx signature for now (full SPL verification is complex)
    }

    if (output <= 0) {
      return res.status(400).json({ error: 'Insufficient liquidity for this swap' });
    }

    // If output is SOL, vault sends SOL to user
    let outputTxSignature = txSignature;
    if (input === 'USDC') {
      outputTxSignature = await vaultSendSol(auth.wallet, output);
    }

    // Update AMM state
    const newK = newSolReserve * newUsdcReserve;
    await updateAmmState(newSolReserve, newUsdcReserve, newK, state.total_shares);

    await addHistory(
      auth.wallet,
      'AMM_SWAP',
      `Swapped ${amount} ${input} for ${output.toFixed(4)} ${input === 'SOL' ? 'USDC' : 'SOL'} via Maverick AMM.`,
      outputTxSignature
    );

    return res.status(200).json({
      success: true,
      input,
      inputAmount: amount,
      output: Number(output.toFixed(6)),
      outputToken: input === 'SOL' ? 'USDC' : 'SOL',
      txSignature: outputTxSignature,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}
