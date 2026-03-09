import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getVaultPublicKey } from '../../lib/vault.js';
import { getVaultSolBalance } from '../../lib/solana.js';
import { getVaultBalance } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const pubkey = getVaultPublicKey().toBase58();
    const [onChainBalance, bookBalance] = await Promise.all([
      getVaultSolBalance(),
      getVaultBalance(),
    ]);

    return res.status(200).json({
      vault: pubkey,
      balanceOnChain: onChainBalance,
      balanceBook: bookBalance,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
