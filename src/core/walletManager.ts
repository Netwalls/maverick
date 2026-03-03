import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

export class WalletManager {
    private keypair: Keypair;
    private connection: Connection;

    constructor(connection: Connection, privateKeyBase58?: string, envVarName?: string) {
        this.connection = connection;
        if (privateKeyBase58) {
            this.keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
        } else {
            this.keypair = Keypair.generate();
            console.log(`New wallet generated: ${this.keypair.publicKey.toBase58()}`);
            if (envVarName) {
                this.saveToEnv(envVarName, bs58.encode(this.keypair.secretKey));
            }
        }
    }

    private saveToEnv(key: string, value: string): void {
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        if (!envContent.includes(`${key}=`)) {
            const newContent = envContent.endsWith('\n') || envContent === '' ? `${envContent}${key}=${value}\n` : `${envContent}\n${key}=${value}\n`;
            fs.writeFileSync(envPath, newContent);
            console.log(`[PERSISTENCE] Saved new key to .env: ${key}`);
        }
    }

    public getPublicKey(): PublicKey {
        return this.keypair.publicKey;
    }

    public getSecretKey(): string {
        return bs58.encode(this.keypair.secretKey);
    }

    public async getBalance(): Promise<number> {
        const balance = await this.connection.getBalance(this.keypair.publicKey);
        return balance / LAMPORTS_PER_SOL;
    }

    public async airdrop(amount: number = 1): Promise<string> {
        console.log(`Requesting airdrop of ${amount} SOL to ${this.keypair.publicKey.toBase58()}...`);
        const signature = await this.connection.requestAirdrop(
            this.keypair.publicKey,
            amount * LAMPORTS_PER_SOL
        );
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
        await this.connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        });
        console.log('Airdrop confirmed.');
        return signature;
    }

    public getKeypair(): Keypair {
        return this.keypair;
    }
}
