import { PublicKey, Connection } from '@solana/web3.js';
import { BaseAgent } from './baseAgent';
import { WalletManager } from '../core/walletManager';
import { TransactionSigner } from '../core/transactionSigner';
import { MarketSentiment, ReasoningEngine } from '../intelligence/reasoningEngine';
import { HistoryProvider } from '../utils/historyProvider';
import { TerminalUtils } from '../utils/terminalUtils';
import { MaverickBank } from '../protocols/maverickBank';
import type { Loan } from '../protocols/maverickBank';
import * as fs from 'fs';
import * as path from 'path';
import { KalshiService } from '../core/kalshiService';
import { TokenService } from '../core/tokenService';
import { LiquidityRouter } from '../core/liquidityRouter';

export interface Position {
    marketName: string;
    ticker: string;
    side: 'YES' | 'NO';
    shares: number;
    entryPrice: number;
    currentPrice: number;
}

export class MaverickAgent extends BaseAgent {
    private targetAddress: PublicKey;
    private predictionMarketAddress: PublicKey = new PublicKey('675k1S2wER9S7z7E6FfEuef1zYpDq98yPz2RE65RE65R');
    private activePositions: Position[] = [];
    private trades: number = 0;
    private bets: number = 0;

    protected reasoningEngine: ReasoningEngine;
    protected historyProvider: HistoryProvider;
    private router: LiquidityRouter;

    constructor(
        connection: Connection,
        wallet: WalletManager,
        targetAddress: PublicKey,
        private bank: MaverickBank,
        private name: string
    ) {
        super(connection, wallet);
        this.signer = new TransactionSigner(connection);
        this.targetAddress = targetAddress;
        this.reasoningEngine = new ReasoningEngine();
        this.historyProvider = new HistoryProvider(process.cwd());
        this.router = new LiquidityRouter(connection, bank.amm);
    }

    public async tick(): Promise<void> {
        await this.executeCycle();
    }

    public async executeCycle(): Promise<void> {
        TerminalUtils.printHeader(`Maverick: ${this.name} (${this.wallet.getPublicKey().toBase58().slice(0, 8)})`);

        const balance = await this.wallet.getBalance();
        const sentiment = this.reasoningEngine.getSimulatedSentiment();

        // Ensure we are registered in the bank if not already
        this.bank.addParticipant(this.wallet);

        // 1. Check for User Commands (Signals)
        const signal = await this.pollSignals();
        if (signal) {
            TerminalUtils.printStep(this.name, `Executing user command: ${signal.action}`);
            if (signal.action === 'TRADE') await this.performStandardTrade(balance, sentiment);
            if (signal.action === 'BET') await this.performPredictionBet(balance, sentiment, signal.target);
            if (signal.action === 'WITHDRAW') await this.performBankWithdraw();
            if (signal.action === 'DEPOSIT') await this.performKalshiDeposit();
            if (signal.action === 'SWAP') await this.performSwap(balance);
            if (signal.action === 'LP') await this.performAMMAction(balance);
        } else {
            // Autonomous Decision
            const actionType = Math.random() > 0.7 ? 'BET' : 'TRADE';
            if (actionType === 'TRADE') {
                await this.performStandardTrade(balance, sentiment);
            } else if (Math.random() > 0.5) {
                await this.performPredictionBet(balance, sentiment);
            }
        }

        // 2. Bank Interactions (If low on funds, borrow)
        if (balance < 0.2) {
            const success = await this.bank.requestLoan(this.wallet, 0.5);
            if (success) {
                TerminalUtils.printSuccess(`Emergency funding provided by Maverick Bank.`);
            } else if (balance < 0.05) {
                await this.requestAirdrop();
            }
        } else {
            // Check if we have an outstanding loan to payback
            const loan = this.bank.getOutstandingLoan(this.wallet.getPublicKey().toBase58());
            if (loan && balance > 1.0) {
                await this.bank.payback(this.wallet);
            }
        }

        await this.updatePositions();
        await this.displayPortfolio(balance);
        TerminalUtils.printFooter();
    }

    private async updatePositions() {
        // Fetch real current prices from Kalshi
        for (const p of this.activePositions) {
            try {
                const live = await KalshiService.getMarketPrice(p.ticker);
                p.currentPrice = p.side === 'YES' ? live.bid / 100 : (100 - live.ask) / 100;
            } catch (e) { }
        }
    }

    private async pollSignals(): Promise<{ action: string, target?: string } | null> {
        const signalsPath = path.join(process.cwd(), 'signals.json');
        if (!fs.existsSync(signalsPath)) return null;

        try {
            const signals = JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
            const index = signals.findIndex((s: any) => s.agentName.toLowerCase() === this.name.toLowerCase());

            if (index !== -1) {
                const signal = signals[index];
                // Consume signal
                signals.splice(index, 1);
                fs.writeFileSync(signalsPath, JSON.stringify(signals, null, 2));
                return { action: signal.action, target: signal.target };
            }
        } catch (e) { }
        return null;
    }

    private async displayPortfolio(balance: number) {
        const loan = this.bank.getOutstandingLoan(this.wallet.getPublicKey().toBase58());
        const contribution = this.bank.getContribution(this.wallet.getPublicKey().toBase58());
        const usdcMint = await TokenService.getUSDCAddress(this.connection);
        const currentUSDC = await TokenService.getTokenBalance(this.connection, this.wallet.getPublicKey(), usdcMint);
        TerminalUtils.printDivider();
        TerminalUtils.printInfo(`[PORTFOLIO] SOL: ${balance.toFixed(4)} | USDC: ${currentUSDC.toFixed(2)} | Contribution: ${contribution.toFixed(2)} | Debt: ${loan ? (loan.amount + loan.fee).toFixed(2) : '0.00'}`);

        if (this.activePositions.length > 0) {
            const alertData = this.activePositions.map(p => {
                const entryVal = p.shares * p.entryPrice;
                const currentVal = p.shares * p.currentPrice;
                const pnl = currentVal - entryVal;
                const pnlPercent = (pnl / (entryVal || 1)) * 100;
                return {
                    marketName: p.marketName,
                    side: p.side,
                    shares: p.shares,
                    entryPrice: p.entryPrice,
                    currentPrice: p.currentPrice,
                    pnl,
                    pnlPercent
                };
            });
            TerminalUtils.printPositionAlerts(alertData);
        }
    }

    private async performBankWithdraw() {
        TerminalUtils.printStep(this.name, 'Attempting to withdraw bank contributions...');
        const success = await this.bank.withdraw(this.wallet);
        if (!success) {
            TerminalUtils.printError('Withdrawal process aborted by Bank protocol.');
        }
    }

    private async performStandardTrade(balance: number, sentiment: MarketSentiment) {
        const advice = this.reasoningEngine.generateAdvice('TRADE', sentiment, balance);
        TerminalUtils.printAdvice(advice);

        if (balance > 0.5 && sentiment !== MarketSentiment.BEARISH) {
            TerminalUtils.printStep(this.name, 'Conditions favorable. Executing SOL trade...');
            const amount = 0.01;
            try {
                const signature = await this.signer.sendTransfer(this.wallet, this.targetAddress, amount);
                TerminalUtils.printSuccess(`Sent ${amount} SOL to ${this.targetAddress.toBase58().slice(0, 8)}`);
                this.trades++;
                await this.record('TRADE', `Sent ${amount} SOL`, signature, advice);
            } catch (e) {
                TerminalUtils.printError(`Trade failed: ${e}`);
            }
        } else {
            TerminalUtils.printStep(this.name, 'Holding. Sentiment or balance not optimal for trading.');
        }
    }

    private async performPredictionBet(balance: number, sentiment: MarketSentiment, marketId?: string) {
        const advice = `[LIVE SCAN]: Analyzing Kalshi orderbook for ${marketId || 'optimal market'}...`;
        TerminalUtils.printAdvice(advice);

        if (balance > 0.1) {
            let market: any = null;
            if (marketId) {
                const all = await KalshiService.getMarkets();
                market = all.find(m => m.ticker === marketId);
            }

            if (!market) {
                const all = await KalshiService.getMarkets();
                market = all[Math.floor(Math.random() * all.length)];
            }
            if (!market) return;

            const side = sentiment === MarketSentiment.BULLISH ? 'YES' : 'NO';
            TerminalUtils.printStep(this.name, `Entering position on: ${market.title}`);

            const cost = 0.05;
            const livePrice = await KalshiService.getMarketPrice(market.ticker);
            const entryPriceCents = side === 'YES' ? livePrice.ask : (100 - livePrice.bid);
            const entryPrice = entryPriceCents / 100;

            // shares calculation: $0.05 SOL = ~$7 (simulated) 
            // Let's just say 1 SOL = $140 for the demo aesthetic
            const shares = (cost * 140) / entryPrice;

            try {
                const signature = await this.signer.sendTransfer(this.wallet, this.predictionMarketAddress, cost);

                this.activePositions.push({
                    marketName: market.title,
                    ticker: market.ticker,
                    side,
                    shares,
                    entryPrice: entryPrice,
                    currentPrice: entryPrice
                });

                TerminalUtils.printSuccess(`Position Locked! ${shares.toFixed(1)} shares added to portfolio.`);
                this.bets++;
                await this.record('BET', `Placed ${side} bet on ${market.ticker}`, signature, advice);
            } catch (e) {
                TerminalUtils.printError(`Bet execution failed: ${e}`);
            }
        } else {
            TerminalUtils.printStep(this.name, 'Insufficient balance for new prediction entry.');
        }
    }

    private async performSwap(balance: number) {
        TerminalUtils.printStep(this.name, 'Analysing liquidity routes for SOL/USDC swap...');
        if (balance > 0.5) {
            await this.router.performBestRouteSwap(this.wallet, 'SOL', 0.1);
        } else {
            const usdcMint = await TokenService.getUSDCAddress(this.connection);
            const usdc = await TokenService.getTokenBalance(this.connection, this.wallet.getPublicKey(), usdcMint);
            if (usdc > 10) {
                await this.router.performBestRouteSwap(this.wallet, 'USDC', 10);
            }
        }
    }

    private async performAMMAction(balance: number) {
        TerminalUtils.printStep(this.name, 'Evaluating Liquidity Provisioning options...');
        if (balance > 1.0) {
            const amount = 0.2;
            const usdcNeeded = amount * 145; // Simulated price
            await this.bank.amm.depositLiquidity(this.wallet, amount, usdcNeeded);
        }
    }

    private async performKalshiDeposit() {
        TerminalUtils.printStep(this.name, 'Bridging SOL to Kalshi Prediction Market...');
        const amount = 0.5;
        try {
            const signature = await this.signer.sendTransfer(this.wallet, this.predictionMarketAddress, amount);
            TerminalUtils.printSuccess(`Bridge Complete! ${amount} SOL deposited to Kalshi.`);
            await this.record('DEPOSIT_KALSHI', `Bridged ${amount} SOL to Kalshi for trading`, signature, 'User requested liquidity at Kalshi.');
        } catch (e) {
            TerminalUtils.printError(`Deposit failed: ${e}`);
        }
    }

    public getStats() {
        return {
            name: this.name,
            trades: this.trades,
            bets: this.bets,
            positions: this.activePositions.length
        };
    }

    private async requestAirdrop() {
        TerminalUtils.printStep(this.name, 'Balance low. Requesting airdrop...');
        try {
            const signature = await this.wallet.airdrop(1);
            TerminalUtils.printSuccess('Airdrop confirmed.');
            await this.record('AIRDROP', 'Requested 1 SOL airdrop', signature);
        } catch (e) {
            TerminalUtils.printError('Airdrop rate-limited.');
        }
    }

    private getName(): string {
        return this.wallet.getPublicKey().toBase58().slice(0, 8);
    }

    private async record(action: string, desc: string, sig?: string, reason?: string) {
        await this.historyProvider.recordAction({
            timestamp: new Date().toISOString(),
            agentAddress: this.wallet.getPublicKey().toBase58(),
            action,
            description: desc,
            signature: sig || '',
            reasoning: reason || ''
        });
    }
}
