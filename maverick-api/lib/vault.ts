import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

let _vaultKeypair: Keypair | null = null;

/**
 * Load the vault keypair from VAULT_PRIVATE_KEY environment variable.
 * The vault key is stored as base58-encoded secret key.
 */
export function getVaultKeypair(): Keypair {
  if (_vaultKeypair) return _vaultKeypair;

  const key = process.env.VAULT_PRIVATE_KEY;
  if (!key) {
    throw new Error('VAULT_PRIVATE_KEY environment variable not set');
  }

  _vaultKeypair = Keypair.fromSecretKey(bs58.decode(key));
  return _vaultKeypair;
}

export function getVaultPublicKey(): PublicKey {
  return getVaultKeypair().publicKey;
}
