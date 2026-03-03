import {
    Connection,
    Transaction,
    SystemProgram,
    PublicKey,
    sendAndConfirmTransaction,
    TransactionInstruction
} from '@solana/web3.js';
import { WalletManager } from './walletManager.js';

export class TransactionSigner {
    constructor(private connection: Connection) { }

    public async sendTransfer(
        fromWallet: WalletManager,
        toPubkey: PublicKey,
        amountSol: number
    ): Promise<string> {
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromWallet.getPublicKey(),
                toPubkey,
                lamports: amountSol * 1e9, // Lamports
            })
        );

        console.log(`Sending ${amountSol} SOL to ${toPubkey.toBase58()}...`);

        try {
            const signature = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [fromWallet.getKeypair()]
            );
            console.log('Transaction confirmed with signature:', signature);
            return signature;
        } catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    }

    public async signAndSendCustomTransaction(
        wallet: WalletManager,
        instructions: TransactionInstruction[]
    ): Promise<string> {
        const transaction = new Transaction();
        instructions.forEach(instruction => transaction.add(instruction));

        try {
            const signature = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [wallet.getKeypair()]
            );
            return signature;
        } catch (error) {
            console.error('Custom transaction failed:', error);
            throw error;
        }
    }
}
