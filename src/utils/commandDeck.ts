import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import { TerminalUtils } from './terminalUtils.js';
import { KalshiService } from '../core/kalshiService.js';

dotenv.config();

enum DeckState {
    MAIN_MENU,
    GOVERNANCE_MENU,
    ACTION_MENU,
    CATEGORY_MENU,
    MARKET_MENU,
    PAUSED
}

class CommandDeck {
    private rl: readline.Interface;
    private agents: string[] = [];
    private state: DeckState = DeckState.MAIN_MENU;
    private selectedAgent: string | null = null;
    private selectedGovIdx: number | null = null;
    private selectedCategory: string | null = null;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        });

        const envKeys = Object.keys(process.env).filter(key => key.endsWith('_PRIVATE_KEY'));
        this.agents = envKeys.map(k => k.replace('_PRIVATE_KEY', '').replace('AGENT', 'Alpha'));
    }

    public async start() {
        await this.refresh();
        this.rl.on('line', (line) => this.processInput(line));

        // Auto-refresh stats every 5 seconds (only if in main menu)
        setInterval(async () => {
            if (this.state === DeckState.MAIN_MENU) {
                await this.refresh();
            }
        }, 5000);
    }

    private clear() {
        process.stdout.write('\x1Bc');
    }

    private async refresh() {
        this.clear();
        TerminalUtils.printMaverickLogo();

        switch (this.state) {
            case DeckState.MAIN_MENU:
                this.printMainDashboard();
                break;
            case DeckState.GOVERNANCE_MENU:
                this.renderGovernance();
                break;
            case DeckState.ACTION_MENU:
                this.renderActionMenu();
                break;
            case DeckState.CATEGORY_MENU:
                await this.renderCategoryMenu();
                break;
            case DeckState.MARKET_MENU:
                await this.renderMarketMenu();
                break;
        }
    }

    private printMainDashboard() {
        this.printStats();
        this.printAMMStatus();
        this.printGovernancePanel();
        this.printLiveFeed();
        this.printMainMenuOptions();
    }

    private printAMMStatus() {
        const ammPath = path.join(process.cwd(), 'amm.json');
        if (fs.existsSync(ammPath)) {
            try {
                const state = JSON.parse(fs.readFileSync(ammPath, 'utf8'));
                const price = state.reserveSOL > 0 ? (state.reserveUSDC / state.reserveSOL).toFixed(2) : '0.00';

                TerminalUtils.printDivider();
                console.log(` ${TerminalUtils.colors.bright}MAVERICK AMM (x * y = k)${TerminalUtils.colors.reset}`);
                console.log(` Pool: ${TerminalUtils.colors.fgGreen}${state.reserveSOL.toFixed(2)} SOL${TerminalUtils.colors.reset} / ${TerminalUtils.colors.fgCyan}${state.reserveUSDC.toFixed(2)} USDC${TerminalUtils.colors.reset}`);
                console.log(` Price: 1 SOL = ${price} USDC | LPs: ${Object.keys(state.lpShares).length}`);
            } catch (e) { }
        }
    }

    private printStats() {
        console.log(`\n${TerminalUtils.colors.bright}=== MAVERICK ECOSYSTEM STATUS ===${TerminalUtils.colors.reset}`);
        console.log(`${TerminalUtils.colors.fgCyan}${'MAVERICK'.padEnd(10)} | ${'LAST ACTION'.padEnd(20)} | ${'STATUS'}${TerminalUtils.colors.reset}`);
        TerminalUtils.printDivider('-');

        this.agents.forEach(agent => {
            console.log(`${agent.padEnd(10)} | ${TerminalUtils.colors.dim}${'Checking...'.padEnd(20)}${TerminalUtils.colors.reset} | ${TerminalUtils.colors.fgGreen}ACTIVE${TerminalUtils.colors.reset}`);
        });
        console.log('--------------------------------------------------');
    }

    private printGovernancePanel() {
        const govPath = path.join(process.cwd(), 'governance.json');
        if (fs.existsSync(govPath)) {
            try {
                const queue = JSON.parse(fs.readFileSync(govPath, 'utf8'));
                if (queue.length > 0) {
                    console.log(`\n${TerminalUtils.colors.bright}${TerminalUtils.colors.fgMagenta}⚖️ PENDING GOVERNANCE (${queue.length})${TerminalUtils.colors.reset}`);
                    queue.forEach((r: any, i: number) => {
                        console.log(` [G${i + 1}] ${r.requester.slice(0, 8)} requests ${r.amount} SOL from ${r.provider.slice(0, 8)}`);
                    });
                }
            } catch (e) { }
        }
    }

    private printLiveFeed() {
        console.log(`\n${TerminalUtils.colors.bright}=== GLOBAL LIVE FEED ===${TerminalUtils.colors.reset}`);
        const historyPath = path.join(process.cwd(), 'history.json');
        if (fs.existsSync(historyPath)) {
            try {
                const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
                const latest = history.slice(-5).reverse();
                latest.forEach((a: any) => {
                    console.log(`${TerminalUtils.colors.dim}[${new Date(a.timestamp).toLocaleTimeString()}]${TerminalUtils.colors.reset} ${TerminalUtils.colors.fgYellow}${a.action.padEnd(10)}${TerminalUtils.colors.reset}: ${a.description}`);
                });
            } catch (e) { }
        }
    }

    private printMainMenuOptions() {
        console.log(`\n${TerminalUtils.colors.bright}=== COMMAND DECK SELECTOR ===${TerminalUtils.colors.reset}`);
        console.log(`${TerminalUtils.colors.fgCyan}Step 1: Choose Maverick${TerminalUtils.colors.reset}`);
        this.agents.forEach((a, i) => {
            console.log(` [${i + 1}] ${a}`);
        });
        console.log(` [H] History Auditor (Global) | [X] Exit Deck`);
        process.stdout.write(`\nSelect Maverick ID or Governance ID (e.g. G1): `);
    }

    private renderGovernance() {
        const govPath = path.join(process.cwd(), 'governance.json');
        const queue = JSON.parse(fs.readFileSync(govPath, 'utf8'));
        const request = queue[this.selectedGovIdx!];

        TerminalUtils.printHeader('MAVERICK GOVERNANCE');
        console.log(`\nRequest: ${request.requester.slice(0, 8)} needs ${request.amount} SOL.`);
        console.log(`Provider: ${request.provider.slice(0, 8)}`);
        console.log(`\n[Y] Approve Funding  [N] Deny Request  [B] Back`);
        process.stdout.write(`\nDecision: `);
    }

    private renderActionMenu() {
        TerminalUtils.printHeader(`COMMANDING: ${this.selectedAgent}`);
        console.log(`What should ${this.selectedAgent} perform next?`);
        console.log(` [1] Standard Trade  [2] Prediction Bet (Categorical)`);
        console.log(` [3] Bank Withdrawal [4] Deposit to Kalshi Bridge`);
        console.log(` [5] AMM Swap (Auto) [6] Add AMM Liquidity (LP)`);
        console.log(` [B] Back to Status  [A] Audit ${this.selectedAgent}`);
        process.stdout.write(`\nSelection: `);
    }

    private async renderCategoryMenu() {
        const markets = await KalshiService.getMarkets();
        const categories = Array.from(new Set(markets.map((m: any) => m.category))).sort();

        TerminalUtils.printHeader(`SELECT A CATEGORY (INDEXED: ${markets.length})`);

        if (KalshiService.isLoading() || markets.length === 0) {
            TerminalUtils.printAdvice(`Maverick is scanning the Kalshi ecosystem...`);
            console.log(`${TerminalUtils.colors.dim}  [ Progress: ${KalshiService.getIndexingProgress()} markets found ]${TerminalUtils.colors.reset}\n`);
            // Show whatever we have or wait a bit
            if (markets.length === 0) {
                setTimeout(async () => await this.refresh(), 2000);
                return;
            }
        } else if (markets.length > 0 && KalshiService.getIndexingProgress() > markets.length) {
            console.log(`${TerminalUtils.colors.dim}  (Background scan active: ${KalshiService.getIndexingProgress()} total markets found)${TerminalUtils.colors.reset}\n`);
        }

        // Calculate counts
        const counts: { [key: string]: number } = {};
        markets.forEach((m: any) => {
            counts[m.category] = (counts[m.category] || 0) + 1;
        });


        // Display in a more visual list
        categories.forEach((cat, i) => {
            const label = `${cat} (${counts[cat]})`;
            console.log(` [${i + 1}] ${label.padEnd(20)}`);
        });

        console.log(`\n [B] Back`);
        process.stdout.write(`\nSelect Category: `);
    }

    private async renderMarketMenu() {
        TerminalUtils.printHeader(`${this.selectedCategory?.toUpperCase()} MARKETS`);
        const all = await KalshiService.getMarkets();
        const markets = all.filter((m: any) => m.category === this.selectedCategory);
        markets.forEach((m: any, i: number) => {
            console.log(` [${i + 1}] ${m.title}`);
        });
        console.log(` [B] Back`);
        process.stdout.write(`\nSelect Market: `);
    }

    private async processInput(input: string) {
        const choice = input.trim().toUpperCase();
        if (!choice && this.state !== DeckState.MAIN_MENU && this.state !== DeckState.PAUSED) return;

        switch (this.state) {
            case DeckState.MAIN_MENU:
                this.handleMainMenu(choice);
                break;
            case DeckState.GOVERNANCE_MENU:
                this.handleGovMenu(choice);
                break;
            case DeckState.ACTION_MENU:
                this.handleActionMenu(choice);
                break;
            case DeckState.CATEGORY_MENU:
                await this.handleCategoryMenu(choice);
                break;
            case DeckState.MARKET_MENU:
                await this.handleMarketMenu(choice);
                break;
            case DeckState.PAUSED:
                this.state = DeckState.MAIN_MENU;
                await this.refresh();
                break;
        }
    }

    private async handleMainMenu(choice: string) {
        if (choice === 'X') process.exit(0);
        if (choice === 'H') {
            this.runCommand('npm run history -- BANK');
            return;
        }
        if (choice.startsWith('G')) {
            const idx = parseInt(choice.substring(1)) - 1;
            this.selectedGovIdx = idx;
            this.state = DeckState.GOVERNANCE_MENU;
            await this.refresh();
            return;
        }

        const idx = parseInt(choice) - 1;
        if (this.agents[idx]) {
            this.selectedAgent = this.agents[idx];
            this.state = DeckState.ACTION_MENU;
            await this.refresh();
        } else {
            TerminalUtils.printError('Invalid Selection.');
            setTimeout(async () => await this.refresh(), 1000);
        }
    }

    private async handleGovMenu(choice: string) {
        const govPath = path.join(process.cwd(), 'governance.json');
        const queue = JSON.parse(fs.readFileSync(govPath, 'utf8'));
        const request = queue[this.selectedGovIdx!];

        if (choice === 'Y' && request) {
            request.status = 'APPROVED';
            fs.writeFileSync(govPath, JSON.stringify(queue, null, 2));
            TerminalUtils.printSuccess('Approved!');
            this.state = DeckState.MAIN_MENU;
            setTimeout(async () => await this.refresh(), 1500);
        } else if (choice === 'N' && request) {
            request.status = 'REJECTED';
            fs.writeFileSync(govPath, JSON.stringify(queue, null, 2));
            TerminalUtils.printStep('Governance', 'Rejected.');
            this.state = DeckState.MAIN_MENU;
            setTimeout(async () => await this.refresh(), 1500);
        } else {
            this.state = DeckState.MAIN_MENU;
            await this.refresh();
        }
    }

    private async handleActionMenu(choice: string) {
        if (choice === 'B') { this.state = DeckState.MAIN_MENU; await this.refresh(); return; }
        if (choice === 'A') { this.runCommand(`npm run history -- ${this.selectedAgent}`); return; }

        // Proactively start indexing if they even look at prediction options
        if (choice === '2') {
            KalshiService.getMarkets(); // Trigger background scan
            this.state = DeckState.CATEGORY_MENU;
            await this.refresh();
            return;
        }

        let signal = '';
        if (choice === '1') signal = 'TRADE';
        if (choice === '3') signal = 'WITHDRAW';
        if (choice === '4') signal = 'DEPOSIT';
        if (choice === '5') signal = 'SWAP';
        if (choice === '6') signal = 'LP';

        if (signal) {
            this.runCommand(`npm run command -- ${this.selectedAgent} ${signal}`);
            this.state = DeckState.MAIN_MENU;
        } else {
            await this.refresh();
        }
    }

    private async handleCategoryMenu(choice: string) {
        if (choice === 'B') { this.state = DeckState.ACTION_MENU; await this.refresh(); return; }
        const markets = await KalshiService.getMarkets();
        const categories = Array.from(new Set(markets.map((m: any) => m.category)));
        const idx = parseInt(choice) - 1;
        if (categories[idx]) {
            this.selectedCategory = categories[idx] as string;
            this.state = DeckState.MARKET_MENU;
            await this.refresh();
        } else {
            await this.refresh();
        }
    }

    private async handleMarketMenu(choice: string) {
        if (choice === 'B') { this.state = DeckState.CATEGORY_MENU; await this.refresh(); return; }
        const all = await KalshiService.getMarkets();
        const markets = all.filter((m: any) => m.category === this.selectedCategory);
        const idx = parseInt(choice) - 1;
        if (markets[idx]) {
            this.runCommand(`npm run command -- ${this.selectedAgent} BET ${markets[idx].ticker}`);
            this.state = DeckState.MAIN_MENU;
        } else {
            await this.refresh();
        }
    }

    private runCommand(cmd: string) {
        this.state = DeckState.PAUSED;
        this.clear();
        TerminalUtils.printStep('Deck', `Executing: ${cmd}`);

        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                TerminalUtils.printError(`Execution failed: ${err.message}`);
            }
            if (stdout) console.log(stdout);
            if (stderr) console.error(stderr);

            console.log(`\n${TerminalUtils.colors.bright}>>> Press [ENTER] to return to Maverick Dashboard <<<${TerminalUtils.colors.reset}`);
        });
    }
}

new CommandDeck().start();
