import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export class MaverickApiClient {
  private baseUrl: string;
  private keypair: Keypair;
  private walletAddress: string;

  constructor(baseUrl: string, keypair: Keypair) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.keypair = keypair;
    this.walletAddress = keypair.publicKey.toBase58();
  }

  /**
   * Create a wallet signature for request authentication.
   * Signs the message `maverick:<timestamp>` with the wallet's secret key.
   */
  private signRequest(): { wallet: string; timestamp: number; signature: string } {
    const timestamp = Date.now();
    const message = new TextEncoder().encode(`maverick:${timestamp}`);
    const sig = nacl.sign.detached(message, this.keypair.secretKey);
    const signature = Buffer.from(sig).toString('base64');
    return { wallet: this.walletAddress, timestamp, signature };
  }

  async get(path: string, params?: Record<string, string>): Promise<any> {
    const auth = this.signRequest();
    const url = new URL(`${this.baseUrl}${path}`);

    // Add auth as query params for GET requests
    url.searchParams.set('wallet', auth.wallet);
    url.searchParams.set('timestamp', String(auth.timestamp));
    url.searchParams.set('signature', auth.signature);

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const res = await fetch(url.toString());
    const json = await res.json();

    if (!res.ok) {
      throw new ApiError(json.error || `HTTP ${res.status}`, res.status);
    }

    return json;
  }

  async post(path: string, body: Record<string, any> = {}): Promise<any> {
    const auth = this.signRequest();

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...auth, ...body }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new ApiError(json.error || `HTTP ${res.status}`, res.status);
    }

    return json;
  }

  /**
   * Unauthenticated GET (for public endpoints like vault/info, amm/pool, amm/quote)
   */
  async getPublic(path: string, params?: Record<string, string>): Promise<any> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const res = await fetch(url.toString());
    const json = await res.json();

    if (!res.ok) {
      throw new ApiError(json.error || `HTTP ${res.status}`, res.status);
    }

    return json;
  }
}

export class ApiError extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
