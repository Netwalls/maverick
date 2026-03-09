import type { VercelRequest } from '@vercel/node';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const MAX_TIMESTAMP_DRIFT_MS = 60_000; // 60 seconds

export interface AuthPayload {
  wallet: string;
  timestamp: number;
  signature: string;
}

/**
 * Extract and verify wallet signature authentication from request body.
 * The client signs the message `maverick:<timestamp>` with their wallet's secret key.
 * We verify using nacl.sign.detached.verify with the wallet's public key.
 */
export function verifyAuth(req: VercelRequest): AuthPayload {
  const { wallet, timestamp, signature } = req.body as Partial<AuthPayload>;

  if (!wallet || !timestamp || !signature) {
    throw new AuthError('Missing auth fields: wallet, timestamp, signature');
  }

  // Check timestamp freshness
  const now = Date.now();
  if (Math.abs(now - timestamp) > MAX_TIMESTAMP_DRIFT_MS) {
    throw new AuthError('Request expired — timestamp too old');
  }

  // Reconstruct the signed message
  const message = new TextEncoder().encode(`maverick:${timestamp}`);

  // Decode wallet pubkey and signature
  let pubkeyBytes: Uint8Array;
  let sigBytes: Uint8Array;
  try {
    pubkeyBytes = bs58.decode(wallet);
    sigBytes = Buffer.from(signature, 'base64');
  } catch {
    throw new AuthError('Invalid wallet or signature encoding');
  }

  // Verify with nacl
  const valid = nacl.sign.detached.verify(message, sigBytes, pubkeyBytes);
  if (!valid) {
    throw new AuthError('Invalid wallet signature');
  }

  return { wallet, timestamp, signature };
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
