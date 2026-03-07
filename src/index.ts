import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { WalletManager } from './core/walletManager';
import { MaverickAgent } from './agents/maverickAgent';
import { AgentRegistry } from './core/agentRegistry';
import { MaverickBank } from './protocols/maverickBank';
import { MaverickAMM } from './protocols/maverickAMM';
import { CommunicationModule } from './core/communicationModule';
import { TransactionSigner } from './core/transactionSigner';
import { HistoryProvider } from './utils/historyProvider';
import { TerminalUtils } from './utils/terminalUtils';
import { VaultManager } from './core/vaultManager';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const WELCOMED_AGENTS = new Set<string>();

async function main() {
    TerminalUtils.printMaverickLogo();
    TerminalUtils.printStep('Initialize', 'Connecting to Solana Devnet...');

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const history = new HistoryProvider(process.cwd());
    const signer = new TransactionSigner(connection);
    const registry = new AgentRegistry();
    const comms = new CommunicationModule(signer, history);

    // Vault: load or create keypair. Uses Circle's official devnet USDC.
    const vaultManager = await VaultManager.loadOrCreate(connection);

    const amm = new MaverickAMM(connection, signer, history, vaultManager.getWallet(), vaultManager.getUSDCMint());
    const bank = new MaverickBank(connection, signer, history, vaultManager.getWallet(), amm);

    // Initial signals cleanup
    if (fs.existsSync('signals.json')) fs.writeFileSync('signals.json', '[]');

    // 1. Dynamic Agent Discovery
    TerminalUtils.printStep('Discovery', 'Scanning for Mavericks in .env...');
    const agentsToRun: { name: string; agent: MaverickAgent; wallet: WalletManager }[] = [];

    const envKeys = Object.keys(process.env).filter(
        key => key.endsWith('_PRIVATE_KEY') && key !== 'VAULT_PRIVATE_KEY'
    );

    if (envKeys.length === 0) {
        TerminalUtils.printAdvice('Warning: No agents found. Initializing defaults...');
        envKeys.push('AGENT_PRIVATE_KEY', 'BETA_PRIVATE_KEY', 'GAMMA_PRIVATE_KEY');
    }

    const target = new PublicKey('GfvXqVpM6X9mYh9f8B7xYv7zJkL5n7m5kGv5G5G5G5G5');

    for (const key of envKeys) {
        const name = key.replace('_PRIVATE_KEY', '').replace('AGENT', 'Alpha');
        const wallet = new WalletManager(connection, process.env[key], key);

        const agent = new MaverickAgent(connection, wallet, target, bank, name);

        registry.registerAgent(name, agent);
        bank.addParticipant(wallet);
        agentsToRun.push({ name, agent, wallet });
    }

    TerminalUtils.printHeader('Active Mavericks');
    agentsToRun.forEach(a => {
        console.log(`${TerminalUtils.colors.fgCyan}${a.name.padEnd(10)}${TerminalUtils.colors.reset}: ${TerminalUtils.colors.dim}${a.wallet.getPublicKey().toBase58()}${TerminalUtils.colors.reset}`);
    });
    TerminalUtils.printDivider('=');

    let cycleCount = 0;

    while (true) {
        cycleCount++;
        TerminalUtils.printHeader(`Global Cycle ${cycleCount}`);

        // Social Onboarding: Welcome new agents
        for (const item of agentsToRun) {
            if (!WELCOMED_AGENTS.has(item.name)) {
                TerminalUtils.printHeader(`Social: Welcome ${item.name}`);
                const reasoning = (item.agent as any).reasoningEngine;
                if (reasoning) {
                    console.log(reasoning.generateWelcome(item.name));
                    console.log(reasoning.getCapabilities(item.name));
                }
                WELCOMED_AGENTS.add(item.name);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // A. Each Agent executes their autonomous logic
        TerminalUtils.printStep('Execution', 'Mavericks running strategies...');
        for (const item of agentsToRun) {
            await item.agent.tick();
        }

        // B. Inter-Agent Communication (Lending)
        TerminalUtils.printStep('Social', 'Checking ecosystem liquidity...');
        for (const requester of agentsToRun) {
            const balance = await requester.wallet.getBalance();
            if (balance < 0.2) {
                console.log(`${TerminalUtils.colors.fgYellow}!! ${requester.name}${TerminalUtils.colors.reset} low balance (${balance.toFixed(4)} SOL). Searching for peer provider...`);
                for (const provider of agentsToRun) {
                    if (requester.name === provider.name) continue;
                    const providerBalance = await provider.wallet.getBalance();
                    if (providerBalance > 1) {
                        await comms.requestFunding(requester.wallet, provider.wallet, 0.2);
                        break;
                    }
                }
            }
        }

        // C. Maverick Bank Operations - Every 3 cycles
        if (cycleCount % 3 === 0) {
            TerminalUtils.printHeader('Maverick Bank Protocol');
            await bank.collectContributions();
            if (cycleCount % 6 === 0) {
                await bank.payout();
            }
        }

        // D. Global Ecosystem Dashboard
        const stats = await Promise.all(agentsToRun.map(async (item) => {
            const balance = await item.wallet.getBalance();
            const agentStats = item.agent.getStats();
            const loan = bank.getOutstandingLoan(item.wallet.getPublicKey().toBase58());
            return {
                name: item.name,
                balance,
                debt: loan ? (loan.amount + loan.fee) : 0,
                trades: agentStats.trades,
                bets: agentStats.bets
            };
        }));
        TerminalUtils.printEcosystemStatus(stats);

        TerminalUtils.printDivider('=');
        await new Promise(resolve => setTimeout(resolve, 15000));
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
});
