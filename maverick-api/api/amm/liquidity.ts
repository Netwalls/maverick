import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, AuthError } from '../../lib/auth.js';
import { verifyTransaction } from '../../lib/solana.js';
import { getVaultPublicKey } from '../../lib/vault.js';
import { getAmmState, updateAmmState, getLpShares, upsertLpShares, addHistory } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = verifyAuth(req);
    const { solAmount, usdcAmount, solTxSignature, usdcTxSignature } = req.body;

    if (!solAmount || solAmount <= 0 || !usdcAmount || usdcAmount <= 0) {
      return res.status(400).json({ error: 'Both solAmount and usdcAmount must be positive' });
    }

    if (!solTxSignature) {
      return res.status(400).json({ error: 'Missing solTxSignature' });
    }

    // Verify SOL transfer on-chain
    const vaultPubkey = getVaultPublicKey().toBase58();
    await verifyTransaction(solTxSignature, auth.wallet, vaultPubkey, solAmount);

    // Get current AMM state
    const state = await getAmmState();
    if (!state) {
      return res.status(500).json({ error: 'AMM state not initialized' });
    }

    let newShares: number;
    let newSolReserve: number;
    let newUsdcReserve: number;
    let newTotalShares: number;

    if (state.total_shares === 0) {
      // First liquidity provider
      newSolReserve = solAmount;
      newUsdcReserve = usdcAmount;
      newShares = Math.sqrt(solAmount * usdcAmount);
      newTotalShares = newShares;
    } else {
      // Proportional shares
      const shareRatio = Math.min(
        (solAmount * state.total_shares) / state.sol_reserve,
        (usdcAmount * state.total_shares) / state.usdc_reserve
      );

      newSolReserve = state.sol_reserve + solAmount;
      newUsdcReserve = state.usdc_reserve + usdcAmount;
      newShares = shareRatio;
      newTotalShares = state.total_shares + shareRatio;
    }

    const newK = newSolReserve * newUsdcReserve;

    // Update state and LP shares
    await updateAmmState(newSolReserve, newUsdcReserve, newK, newTotalShares);
    await upsertLpShares(auth.wallet, newShares);

    await addHistory(
      auth.wallet,
      'AMM_DEPOSIT',
      `Provided ${solAmount} SOL and ${usdcAmount} USDC as liquidity to Maverick AMM.`,
      solTxSignature
    );

    const currentShares = await getLpShares(auth.wallet);

    return res.status(200).json({
      success: true,
      solDeposited: solAmount,
      usdcDeposited: usdcAmount,
      sharesReceived: newShares,
      totalShares: currentShares,
      pool: {
        sol: newSolReserve,
        usdc: newUsdcReserve,
        k: newK,
      },
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}
