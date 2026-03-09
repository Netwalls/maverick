import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWalletByUsername } from '../../lib/db.js';

/**
 * POST /api/auth/login
 *
 * Retrieve the encrypted wallet for a given username.
 * Returns the encrypted blob + salt + iv — decryption happens CLIENT-SIDE.
 *
 * Body: { usernameHash }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { usernameHash } = req.body ?? {};

  if (!usernameHash) {
    return res.status(400).json({ error: 'Missing field: usernameHash' });
  }

  try {
    const wallet = await getWalletByUsername(usernameHash);
    if (!wallet) {
      return res.status(404).json({ error: 'Account not found' });
    }

    return res.status(200).json({
      encryptedKey: wallet.encrypted_private_key,
      publicAddress: wallet.public_address,
      salt: wallet.salt,
      iv: wallet.iv,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
