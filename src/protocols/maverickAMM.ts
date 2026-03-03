import { WalletManager } from '../core/walletManager.js';
import { TerminalUtils } from '../utils/terminalUtils.js';
import { HistoryProvider } from '../utils/historyProvider.js';
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

    constructor(private history: HistoryProvider) {
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
     * Deposit SOL and USDC to provide liquidity
     */
    public async depositLiquidity(wallet: WalletManager, solAmount: number, usdcAmount: number): Promise<void> {
        const address = wallet.getPublicKey().toBase58();

        // Initial deposit
        if (this.totalShares === 0) {
            this.reserveSOL = solAmount;
            this.reserveUSDC = usdcAmount;
            this.k = this.reserveSOL * this.reserveUSDC;
            this.totalShares = Math.sqrt(solAmount * usdcAmount);
            this.lpShares.set(address, this.totalShares);
        } else {
            // Maintain ratio
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
            description: `Provided ${solAmount} SOL and ${usdcAmount} USDC as liquidity to Maverick AMM.`
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
            // swapping SOL for USDC
            // (reserveSOL + amountAfterFee) * (reserveUSDC - output) = k
            // output = reserveUSDC - k / (reserveSOL + amountAfterFee)
            const newReserveSOL = this.reserveSOL + amountAfterFee;
            const newReserveUSDC = this.k / newReserveSOL;
            return Math.max(0, this.reserveUSDC - newReserveUSDC);
        } else {
            // swapping USDC for SOL
            const newReserveUSDC = this.reserveUSDC + amountAfterFee;
            const newReserveSOL = this.k / newReserveUSDC;
            return Math.max(0, this.reserveSOL - newReserveSOL);
        }
    }

    /**
     * Execute a swap against the pool
     */
    public async swap(wallet: WalletManager, input: 'SOL' | 'USDC', amount: number): Promise<number> {
        const output = this.getSwapQuote(input, amount);
        const address = wallet.getPublicKey().toBase58();

        if (output <= 0) {
            TerminalUtils.printError(`AMM Swap Failed: Insufficient liquidity.`);
            return 0;
        }

        if (input === 'SOL') {
            this.reserveSOL += amount;
            this.reserveUSDC -= output;
        } else {
            this.reserveUSDC += amount;
            this.reserveSOL -= output;
        }

        // Constant product update (k grows slightly due to fees)
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
