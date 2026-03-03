import {
    Connection,
    PublicKey,
    TransactionInstruction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Transaction
} from '@solana/web3.js';
import { WalletManager } from './walletManager.js';

// Constants for USDC
export const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const USDC_MINT_DEVNET = new PublicKey('4zMMC9srtvSqzNQZ5oM1bPshvM3p8S7vsh53mXhGhtV');
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
        // This is a simplified version of the transfer instruction
        // In a real app we'd use @solana/spl-token, but we're keeping it light
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
}
