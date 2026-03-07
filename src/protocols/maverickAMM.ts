import { Connection, PublicKey } from '@solana/web3.js';
import { WalletManager } from '../core/walletManager';
import { TransactionSigner } from '../core/transactionSigner';
import { TokenService } from '../core/tokenService';
import { TerminalUtils } from '../utils/terminalUtils';
import { HistoryProvider } from '../utils/historyProvider';
import * as fs from 'fs';
import * as path from 'path';

export class MaverickAMM {
    private reserveSOL: number = 0;
    private reserveUSDC: number = 0;
    private k: number = 0;
    private feeRate: number = 0.003; // 0.3%
    private lpShares: Map<string, number> = new Map();
    private totalShares: number = 0;
    private statePath = path.join(process.cwd(), 'amm.json');

    constructor(
        private connection: Connection,
        private signer: TransactionSigner,
        private history: HistoryProvider,
        private vaultWallet: WalletManager,
        private usdcMint: PublicKey
    ) {
        this.loadState();
    }

    private loadState() {
        if (fs.existsSync(this.statePath)) {
            try {
                const state = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
                this.reserveSOL = state.reserveSOL || 0;
                this.reserveUSDC = state.reserveUSDC || 0;
                this.k = state.k || 0;
                this.totalShares = state.totalShares || 0;
                this.lpShares = new Map(Object.entries(state.lpShares || {}));
            } catch (e) { }
        }
    }

    private persistState() {
        const state = {
            reserveSOL: this.reserveSOL,
            reserveUSDC: this.reserveUSDC,
            k: this.k,
            totalShares: this.totalShares,
            lpShares: Object.fromEntries(this.lpShares)
        };
        fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
    }

    /**
     * Deposit SOL and USDC to provide liquidity (real on-chain transfers)
     */
    public async depositLiquidity(wallet: WalletManager, solAmount: number, usdcAmount: number): Promise<void> {
        const mint = this.usdcMint;
        const address = wallet.getPublicKey().toBase58();

        // 1. Real SOL transfer: agent wallet → vault
        const solSig = await this.signer.sendTransfer(wallet, this.vaultWallet.getPublicKey(), solAmount);

        // 2. Real USDC SPL transfer: agent ATA → vault ATA
        const usdcSig = await TokenService.transferTokens(
            this.connection,
            mint,
            wallet.getKeypair(),
            this.vaultWallet.getPublicKey(),
            usdcAmount
        );

        // 3. Bookkeeping after both txs confirmed
        if (this.totalShares === 0) {
            this.reserveSOL = solAmount;
            this.reserveUSDC = usdcAmount;
            this.k = this.reserveSOL * this.reserveUSDC;
            this.totalShares = Math.sqrt(solAmount * usdcAmount);
            this.lpShares.set(address, this.totalShares);
        } else {
            const shareRatio = Math.min(
                (solAmount * this.totalShares) / this.reserveSOL,
                (usdcAmount * this.totalShares) / this.reserveUSDC
            );

            this.reserveSOL += solAmount;
            this.reserveUSDC += usdcAmount;
            this.k = this.reserveSOL * this.reserveUSDC;

            const currentShares = this.lpShares.get(address) || 0;
            this.lpShares.set(address, currentShares + shareRatio);
            this.totalShares += shareRatio;
        }

        this.persistState();
        TerminalUtils.printSuccess(`LP DEPOSIT: ${address.slice(0, 8)} provided ${solAmount} SOL / ${usdcAmount} USDC.`);

        await this.history.recordAction({
            timestamp: new Date().toISOString(),
            agentAddress: address,
            action: 'AMM_DEPOSIT',
            description: `Provided ${solAmount} SOL and ${usdcAmount} USDC as liquidity to Maverick AMM.`,
            signature: solSig,
        });
    }

    /**
     * Get a swap quote based on current reserves
     */
    public getSwapQuote(input: 'SOL' | 'USDC', amount: number): number {
        if (this.reserveSOL === 0 || this.reserveUSDC === 0) return 0;

        const fee = amount * this.feeRate;
        const amountAfterFee = amount - fee;

        if (input === 'SOL') {
            const newReserveSOL = this.reserveSOL + amountAfterFee;
            const newReserveUSDC = this.k / newReserveSOL;
            return Math.max(0, this.reserveUSDC - newReserveUSDC);
        } else {
            const newReserveUSDC = this.reserveUSDC + amountAfterFee;
            const newReserveSOL = this.k / newReserveUSDC;
            return Math.max(0, this.reserveSOL - newReserveSOL);
        }
    }

    /**
     * Execute a swap against the pool (real on-chain transfers)
     */
    public async swap(wallet: WalletManager, input: 'SOL' | 'USDC', amount: number): Promise<number> {
        const mint = this.usdcMint;
        const output = this.getSwapQuote(input, amount);
        const address = wallet.getPublicKey().toBase58();

        if (output <= 0) {
            TerminalUtils.printError(`AMM Swap Failed: Insufficient liquidity.`);
            return 0;
        }

        if (input === 'SOL') {
            // SOL → USDC: agent sends SOL to vault, vault sends USDC to agent
            const solSig = await this.signer.sendTransfer(wallet, this.vaultWallet.getPublicKey(), amount);

            // Vault sends USDC to agent (vault signs SPL transfer)
            const usdcSig = await TokenService.transferTokens(
                this.connection,
                mint,
                this.vaultWallet.getKeypair(),
                wallet.getPublicKey(),
                output
            );

            this.reserveSOL += amount;
            this.reserveUSDC -= output;
        } else {
            // USDC → SOL: agent sends USDC to vault, vault sends SOL to agent
            const usdcSig = await TokenService.transferTokens(
                this.connection,
                mint,
                wallet.getKeypair(),
                this.vaultWallet.getPublicKey(),
                amount
            );

            // Vault sends SOL to agent (vault signs)
            const solSig = await this.signer.sendTransfer(this.vaultWallet, wallet.getPublicKey(), output);

            this.reserveUSDC += amount;
            this.reserveSOL -= output;
        }

        this.k = this.reserveSOL * this.reserveUSDC;
        this.persistState();
        TerminalUtils.printSuccess(`AMM SWAP: ${address.slice(0, 8)} swapped ${amount} ${input} for ${output.toFixed(4)} ${input === 'SOL' ? 'USDC' : 'SOL'}`);

        await this.history.recordAction({
            timestamp: new Date().toISOString(),
            agentAddress: address,
            action: 'AMM_SWAP',
            description: `Swapped ${amount} ${input} for ${output.toFixed(4)} ${input === 'SOL' ? 'USDC' : 'SOL'} via Maverick AMM.`
        });

        return output;
    }

    public getPoolStats() {
        return {
            sol: this.reserveSOL,
            usdc: this.reserveUSDC,
            lpCount: this.lpShares.size,
            price: this.reserveSOL > 0 ? this.reserveUSDC / this.reserveSOL : 0
        };
    }
}
