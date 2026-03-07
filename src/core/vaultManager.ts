import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { WalletManager } from './walletManager';
import { USDC_MINT_DEVNET } from './tokenService';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';

export class VaultManager {
    private vaultWallet: WalletManager;

    private constructor(private connection: Connection, vaultWallet: WalletManager) {
        this.vaultWallet = vaultWallet;
    }

    /**
     * Load vault keypair from .env or generate a new one.
     * No auto-funding — vault is funded via faucet or peer transfers.
     */
    public static async loadOrCreate(connection: Connection): Promise<VaultManager> {
        dotenv.config();
        const envPath = path.join(process.cwd(), '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

        let vaultKey = process.env.VAULT_PRIVATE_KEY;
        if (!vaultKey) {
            const keypair = Keypair.generate();
            vaultKey = bs58.encode(keypair.secretKey);
            const entry = `VAULT_PRIVATE_KEY=${vaultKey}\n`;
            envContent = envContent.endsWith('\n') || envContent === ''
                ? `${envContent}${entry}`
                : `${envContent}\n${entry}`;
            fs.writeFileSync(envPath, envContent);
            process.env.VAULT_PRIVATE_KEY = vaultKey;
        }

        const wallet = new WalletManager(connection, vaultKey, 'VAULT_PRIVATE_KEY');
        return new VaultManager(connection, wallet);
    }

    public getWallet(): WalletManager {
        return this.vaultWallet;
    }

    public getPublicKey(): PublicKey {
        return this.vaultWallet.getPublicKey();
    }

    /** Circle's official devnet USDC — constant, same for everyone. */
    public getUSDCMint(): PublicKey {
        return USDC_MINT_DEVNET;
    }
}
