import type { VercelRequest, VercelResponse } from '@vercel/node';
import { registerWallet, getWalletByUsername } from '../../lib/db.js';

/**
 * POST /api/auth/register
 *
 * Register a new wallet with encrypted private key storage.
 * The private key is encrypted CLIENT-SIDE — the server never sees the raw key.
 *
 * Body: { usernameHash, encryptedKey, publicAddress, salt, iv }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { usernameHash, encryptedKey, publicAddress, salt, iv } = req.body ?? {};

  if (!usernameHash || !encryptedKey || !publicAddress || !salt || !iv) {
    return res.status(400).json({ error: 'Missing fields: usernameHash, encryptedKey, publicAddress, salt, iv' });
  }

  try {
    // Check if username already taken
    const existing = await getWalletByUsername(usernameHash);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    await registerWallet(usernameHash, encryptedKey, publicAddress, salt, iv);
    return res.status(201).json({ success: true, publicAddress });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
