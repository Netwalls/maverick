import {
    Connection,
    Transaction,
    SystemProgram,
    PublicKey,
    sendAndConfirmTransaction,
    TransactionInstruction,
    Keypair,
} from '@solana/web3.js';
import { WalletManager } from './walletManager.js';

export class TransactionSigner {
    constructor(private connection: Connection) { }

    /**
     * Send a transaction with a fresh blockhash and confirmation retry.
     * If confirmation times out but the tx landed on-chain, returns the sig instead of throwing.
     */
    private async sendWithRetry(
        transaction: Transaction,
        signers: Keypair[]
    ): Promise<string> {
        // Get a fresh blockhash right before sending
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = signers[0]!.publicKey;

        // Sign
        transaction.sign(...signers);

        // Send raw — don't wait for confirmation yet
        const rawTx = transaction.serialize();
        const sig = await this.connection.sendRawTransaction(rawTx, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        // Try to confirm with timeout
        try {
            await this.connection.confirmTransaction(
                { signature: sig, blockhash, lastValidBlockHeight },
                'confirmed'
            );
        } catch (err: any) {
            // Block height exceeded = blockhash expired, but tx may have landed
            if (err?.message?.includes('block height exceeded') || err?.message?.includes('expired')) {
                // Check if the tx actually landed on-chain
                const status = await this.connection.getSignatureStatus(sig);
                if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
                    return sig; // Tx succeeded despite timeout
                }
                // One more attempt — wait a bit and check again
                await new Promise(r => setTimeout(r, 2000));
                const retry = await this.connection.getSignatureStatus(sig);
                if (retry?.value?.confirmationStatus) {
                    return sig;
                }
            }
            throw err;
        }

        return sig;
    }

    public async sendTransfer(
        fromWallet: WalletManager,
        toPubkey: PublicKey,
        amountSol: number
    ): Promise<string> {
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromWallet.getPublicKey(),
                toPubkey,
                lamports: Math.round(amountSol * 1e9),
            })
        );

        return this.sendWithRetry(transaction, [fromWallet.getKeypair()]);
    }

    public async signAndSendCustomTransaction(
        wallet: WalletManager,
        instructions: TransactionInstruction[]
    ): Promise<string> {
        const transaction = new Transaction();
        instructions.forEach(instruction => transaction.add(instruction));

        return this.sendWithRetry(transaction, [wallet.getKeypair()]);
    }
}
