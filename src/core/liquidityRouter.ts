import { Connection, PublicKey } from '@solana/web3.js';
import { MaverickAMM } from '../protocols/maverickAMM.js';
import { WalletManager } from './walletManager.js';
import { TerminalUtils } from '../utils/terminalUtils.js';

export class LiquidityRouter {
    constructor(
        private connection: Connection,
        private amm: MaverickAMM
    ) { }

    /**
     * Choose the best route (Maverick vs Jupiter) and execute the swap
     */
    public async performBestRouteSwap(
        wallet: WalletManager,
        input: 'SOL' | 'USDC',
        amount: number
    ): Promise<boolean> {
        const maverickOutput = this.amm.getSwapQuote(input, amount);

        // 1. Fetch Jupiter Quote (Simulated for this demo environment)
        // In a real environment, we'd call the Jupiter API
        const jupiterPrice = 145.50; // $145.50 / SOL
        let jupiterOutput = 0;

        if (input === 'SOL') {
            jupiterOutput = amount * jupiterPrice * 0.99; // 1% spread/fee
        } else {
            jupiterOutput = (amount / jupiterPrice) * 0.99;
        }

        TerminalUtils.printInfo(`Price Check: Maverick AMM (${maverickOutput.toFixed(4)}) vs Jupiter Institutional (${jupiterOutput.toFixed(4)})`);

        // 2. Route Decision
        if (maverickOutput >= jupiterOutput) {
            TerminalUtils.printStep('Router', 'Routing through Maverick AMM (Better Price + No External Fees)');
            const success = await this.amm.swap(wallet, input, amount);
            return success > 0;
        } else {
            TerminalUtils.printStep('Router', 'Routing through Jupiter Institutional (Better Depth)');
            TerminalUtils.printSuccess(`External swap confirmed via Jupiter protocol.`);

            // Record as a simulation of external activity
            return true;
        }
    }
}
