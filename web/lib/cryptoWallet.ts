/**
 * Client-side wallet encryption + DB-backed auth.
 *
 * Flow:
 *   Register: user picks username + password →
 *     1. Generate Solana keypair
 *     2. Derive AES key from password via PBKDF2 (100k iterations, SHA-256)
 *     3. Encrypt private key with AES-GCM (random salt + iv)
 *     4. POST { usernameHash, encryptedKey, publicAddress, salt, iv } to API
 *     5. Server stores encrypted blob — never sees raw key
 *
 *   Login: user enters username + password →
 *     1. POST { usernameHash } to API → get { encryptedKey, salt, iv }
 *     2. Derive same AES key from password + salt
 *     3. Decrypt private key with AES-GCM
 *     4. Reconstruct Keypair from decrypted bytes
 *
 * The password never leaves the browser. The server only stores ciphertext.
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'https://maverick-api.vercel.app';
}

// ─── Crypto helpers (Web Crypto API) ────────────────────────────────

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptKey(privateKeyBase58: string, password: string): Promise<{
  encrypted: string;
  salt: string;
  iv: string;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveKey(password, salt);

  const plaintext = new TextEncoder().encode(privateKeyBase58);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    plaintext
  );

  return {
    encrypted: bufToBase64(ciphertext),
    salt: bufToBase64(salt.buffer),
    iv: bufToBase64(iv.buffer),
  };
}

async function decryptKey(encrypted: string, password: string, saltB64: string, ivB64: string): Promise<string> {
  const salt = new Uint8Array(base64ToBuf(saltB64));
  const iv = new Uint8Array(base64ToBuf(ivB64));
  const aesKey = await deriveKey(password, salt);

  const ciphertext = base64ToBuf(encrypted);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

// ─── Username hashing ───────────────────────────────────────────────

async function hashUsername(username: string): Promise<string> {
  const data = new TextEncoder().encode(username.toLowerCase().trim());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufToBase64(hash);
}

// ─── API calls ──────────────────────────────────────────────────────

export async function registerAccount(
  username: string,
  password: string
): Promise<{ keypair: Keypair; address: string }> {
  const keypair = Keypair.generate();
  const privateKeyBase58 = bs58.encode(keypair.secretKey);

  const usernameHash = await hashUsername(username);
  const { encrypted, salt, iv } = await encryptKey(privateKeyBase58, password);

  const res = await fetch(`${getApiUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usernameHash,
      encryptedKey: encrypted,
      publicAddress: keypair.publicKey.toBase58(),
      salt,
      iv,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Registration failed (${res.status})`);

  // Cache in localStorage for the current session
  localStorage.setItem('maverick_wallet_key', privateKeyBase58);
  localStorage.setItem('maverick_wallet_name', username);
  localStorage.setItem('maverick_logged_in', 'true');

  return { keypair, address: keypair.publicKey.toBase58() };
}

export async function loginAccount(
  username: string,
  password: string
): Promise<{ keypair: Keypair; address: string }> {
  const usernameHash = await hashUsername(username);

  const res = await fetch(`${getApiUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameHash }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Login failed (${res.status})`);

  // Decrypt client-side
  let privateKeyBase58: string;
  try {
    privateKeyBase58 = await decryptKey(json.encryptedKey, password, json.salt, json.iv);
  } catch {
    throw new Error('Wrong password');
  }

  // Verify the decrypted key produces the expected address
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
  if (keypair.publicKey.toBase58() !== json.publicAddress) {
    throw new Error('Wrong password');
  }

  // Cache in localStorage for the current session
  localStorage.setItem('maverick_wallet_key', privateKeyBase58);
  localStorage.setItem('maverick_wallet_name', username);
  localStorage.setItem('maverick_logged_in', 'true');

  return { keypair, address: json.publicAddress };
}

export function logout(): void {
  localStorage.removeItem('maverick_wallet_key');
  localStorage.removeItem('maverick_wallet_name');
  localStorage.removeItem('maverick_logged_in');
}

export function isLoggedIn(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('maverick_logged_in') === 'true';
}
