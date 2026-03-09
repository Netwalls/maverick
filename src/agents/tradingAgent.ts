import { Connection, PublicKey } from '@solana/web3.js';
import { BaseAgent } from './baseAgent.js';
import { WalletManager } from '../core/walletManager.js';
import { ReasoningEngine, MarketSentiment } from '../intelligence/reasoningEngine.js';
import { HistoryProvider } from '../utils/historyProvider.js';
import { TerminalUtils } from '../utils/terminalUtils.js';

export class TradingAgent extends BaseAgent {
    private targetAddress: PublicKey;
    private checkIntervalMs: number = 10000; // 10 seconds
    protected reasoningEngine: ReasoningEngine;
    protected historyProvider: HistoryProvider;

    constructor(connection: Connection, wallet: WalletManager, targetAddress: PublicKey) {
        super(connection, wallet);
        this.targetAddress = targetAddress;
        this.reasoningEngine = new ReasoningEngine();
        this.historyProvider = new HistoryProvider(process.cwd());
    }

    public async tick(): Promise<void> {
        await this.executeCycle();
    }

    public async executeCycle(): Promise<void> {
        TerminalUtils.printHeader(`Maverick: ${this.wallet.getPublicKey().toBase58().slice(0, 8)}...`);
        const balance = await this.wallet.getBalance();
        const sentiment = this.reasoningEngine.getSimulatedSentiment();

        TerminalUtils.printInfo(`Current Balance: ${balance} SOL`);
        TerminalUtils.printInfo(`Simulated Market Sentiment: ${sentiment}`);

        const advice = this.reasoningEngine.generateAdvice('TRADE', sentiment, balance);
        TerminalUtils.printAdvice(advice);

        if (balance > 0.5 && sentiment !== MarketSentiment.BEARISH) {
            TerminalUtils.printStep(this.wallet.getPublicKey().toBase58().slice(0, 8), 'Conditions favorable. Executing autonomous trade...');
            const tradeAmount = 0.01;
            try {
                const signature = await this.signer.sendTransfer(this.wallet, this.targetAddress, tradeAmount);
                TerminalUtils.printSuccess(`Sent ${tradeAmount} SOL to ${this.targetAddress.toBase58().slice(0, 8)}...`);

                await this.historyProvider.recordAction({
                    timestamp: new Date().toISOString(),
                    agentAddress: this.wallet.getPublicKey().toBase58(),
                    action: 'TRADE',
                    description: `Sent ${tradeAmount} SOL to ${this.targetAddress.toBase58()}`,
                    signature,
                    reasoning: advice
                });
            } catch (error) {
                TerminalUtils.printError(`Trade failed: ${error}`);
            }
        } else if (balance < 0.1) {
            TerminalUtils.printStep(this.wallet.getPublicKey().toBase58().slice(0, 8), 'Balance low. Attempting autonomous airdrop...');
            try {
                const signature = await this.wallet.airdrop(1);
                TerminalUtils.printSuccess('Airdrop confirmed.');
                await this.historyProvider.recordAction({
                    timestamp: new Date().toISOString(),
                    agentAddress: this.wallet.getPublicKey().toBase58(),
                    action: 'AIRDROP',
                    description: 'Requested 1 SOL airdrop',
                    signature
                });
            } catch (error) {
                TerminalUtils.printError('Airdrop failed. Faucet may be rate-limited.');
            }
        } else {
            TerminalUtils.printStep(this.wallet.getPublicKey().toBase58().slice(0, 8), `Holding. Balance: ${balance.toFixed(4)} SOL | Sentiment: ${sentiment}`);
        }
        TerminalUtils.printFooter();
    }
}
