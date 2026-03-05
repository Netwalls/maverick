import {
    Connection,
    PublicKey,
    TransactionInstruction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Transaction,
    Keypair,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
    createMint as splCreateMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    transfer as splTransfer,
    getAssociatedTokenAddress as splGetATA,
} from '@solana/spl-token';
import { WalletManager } from './walletManager.js';

// Constants for USDC
export const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export class TokenService {
    public static async getUSDCAddress(connection: Connection): Promise<PublicKey> {
        const genesis = await connection.getGenesisHash();
        // Mainnet genesis hash starts with 5ey
        return genesis.startsWith('5ey') ? USDC_MINT_MAINNET : USDC_MINT_DEVNET;
    }
    public static async getTokenBalance(connection: Connection, walletAddress: PublicKey, mint: PublicKey): Promise<number> {
        try {
            const ata = this.getAssociatedTokenAddress(mint, walletAddress);
            const balance = await connection.getTokenAccountBalance(ata);
            return balance.value.uiAmount || 0;
        } catch (e) {
            return 0; // Account likely doesn't exist
        }
    }

    public static getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): PublicKey {
        return PublicKey.findProgramAddressSync(
            [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];
    }

    /**
     * Creates a transfer instruction for SPL tokens (USDC)
     */
    public static createTokenTransferInstruction(
        from: PublicKey,
        to: PublicKey,
        owner: PublicKey,
        amount: number,
        decimals: number = 6
    ): TransactionInstruction {
        const data = Buffer.alloc(9);
        data.writeUInt8(3, 0); // Transfer instruction index
        data.writeBigUInt64LE(BigInt(Math.floor(amount * Math.pow(10, decimals))), 1);

        return new TransactionInstruction({
            keys: [
                { pubkey: from, isSigner: false, isWritable: true },
                { pubkey: to, isSigner: false, isWritable: true },
                { pubkey: owner, isSigner: true, isWritable: false },
            ],
            programId: TOKEN_PROGRAM_ID,
            data
        });
    }

    // ─── Real SPL Token Operations (via @solana/spl-token) ──────────────────

    /**
     * Create a new SPL token mint. Returns the mint public key.
     */
    public static async createMint(
        connection: Connection,
        payer: Keypair,
        decimals: number = 6
    ): Promise<PublicKey> {
        return splCreateMint(
            connection,
            payer,
            payer.publicKey, // mint authority
            payer.publicKey, // freeze authority
            decimals
        );
    }

    /**
     * Ensure an Associated Token Account exists for the given owner + mint.
     * Creates one (payer pays rent) if it doesn't exist. Returns the ATA address.
     */
    public static async ensureATA(
        connection: Connection,
        payer: Keypair,
        owner: PublicKey,
        mint: PublicKey
    ): Promise<PublicKey> {
        const ata = await getOrCreateAssociatedTokenAccount(
            connection,
            payer,
            mint,
            owner
        );
        return ata.address;
    }

    /**
     * Mint SPL tokens to a recipient. The payer must be the mint authority.
     * `amount` is in human-readable units (e.g. 100 USDC), auto-scaled by decimals.
     */
    public static async mintTokens(
        connection: Connection,
        mint: PublicKey,
        authority: Keypair,
        recipientPubkey: PublicKey,
        amount: number,
        decimals: number = 6
    ): Promise<string> {
        const destATA = await this.ensureATA(connection, authority, recipientPubkey, mint);
        const sig = await mintTo(
            connection,
            authority,       // payer
            mint,
            destATA,
            authority,       // mint authority
            BigInt(Math.floor(amount * Math.pow(10, decimals)))
        );
        return sig;
    }

    /**
     * Transfer SPL tokens between two wallets. The owner signs the transaction.
     * `amount` is in human-readable units (e.g. 50 USDC).
     * Handles block height expiry gracefully — checks if tx landed on-chain before throwing.
     */
    public static async transferTokens(
        connection: Connection,
        mint: PublicKey,
        ownerKeypair: Keypair,
        recipientPubkey: PublicKey,
        amount: number,
        decimals: number = 6
    ): Promise<string> {
        const fromATA = await this.ensureATA(connection, ownerKeypair, ownerKeypair.publicKey, mint);
        const toATA = await this.ensureATA(connection, ownerKeypair, recipientPubkey, mint);
        try {
            const sig = await splTransfer(
                connection,
                ownerKeypair,   // payer
                fromATA,
                toATA,
                ownerKeypair,   // owner of source account
                BigInt(Math.floor(amount * Math.pow(10, decimals)))
            );
            return sig;
        } catch (err: any) {
            // If block height expired, the tx may have actually landed
            const msg = err?.message ?? '';
            if (msg.includes('block height exceeded') || msg.includes('expired')) {
                // Try to extract sig from the error or recent tx
                const sig = err?.signature ?? err?.transactionMessage?.signature;
                if (sig) {
                    const status = await connection.getSignatureStatus(sig);
                    if (status?.value?.confirmationStatus) return sig;
                    await new Promise(r => setTimeout(r, 2000));
                    const retry = await connection.getSignatureStatus(sig);
                    if (retry?.value?.confirmationStatus) return sig;
                }
            }
            throw err;
        }
    }
}
