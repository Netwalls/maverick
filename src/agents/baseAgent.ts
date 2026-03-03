import { Connection } from '@solana/web3.js';
import { WalletManager } from '../core/walletManager.js';
import { TransactionSigner } from '../core/transactionSigner.js';

export abstract class BaseAgent {
    protected wallet: WalletManager;
    protected signer: TransactionSigner;
    protected connection: Connection;
    protected isRunning: boolean = false;

    constructor(connection: Connection, wallet: WalletManager) {
        this.connection = connection;
        this.wallet = wallet;
        this.signer = new TransactionSigner(connection);
    }

    public abstract tick(): Promise<void>;
    public abstract executeCycle(): Promise<void>;

    protected async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
