import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initSchema } from '../../lib/db.js';

/**
 * One-time schema setup endpoint.
 * Call POST /api/vault/setup after first deploy to create all tables.
 * Protected by a simple secret to prevent unauthorized access.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.headers['x-setup-secret'] || req.body?.secret;
  const expected = process.env.SETUP_SECRET;

  if (expected && secret !== expected) {
    return res.status(403).json({ error: 'Invalid setup secret' });
  }

  try {
    await initSchema();
    return res.status(200).json({ success: true, message: 'Schema initialized' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
