import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getHistory, addHistory } from '../../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const wallet = req.query.wallet as string | undefined;
      const limit = Number(req.query.limit) || 50;
      const result = await getHistory(wallet, limit);

      return res.status(200).json({
        history: result.rows.map(row => ({
          id: row.id,
          wallet: row.wallet_address,
          action: row.action,
          description: row.description,
          txSignature: row.tx_signature,
          reasoning: row.reasoning,
          createdAt: row.created_at,
        })),
      });
    }

    if (req.method === 'POST') {
      const { wallet, action, description, txSignature, reasoning } = req.body;

      if (!wallet || !action || !description) {
        return res.status(400).json({ error: 'Missing wallet, action, or description' });
      }

      await addHistory(wallet, action, description, txSignature, reasoning);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
