export class TerminalUtils {
    public static colors = {
        reset: "\x1b[0m",
        bright: "\x1b[1m",
        dim: "\x1b[2m",
        underscore: "\x1b[4m",
        blink: "\x1b[5m",
        reverse: "\x1b[7m",
        hidden: "\x1b[8m",

        fgBlack: "\x1b[30m",
        fgRed: "\x1b[31m",
        fgGreen: "\x1b[32m",
        fgYellow: "\x1b[33m",
        fgBlue: "\x1b[34m",
        fgMagenta: "\x1b[35m",
        fgCyan: "\x1b[36m",
        fgWhite: "\x1b[37m",

        bgBlack: "\x1b[40m",
        bgRed: "\x1b[41m",
        bgGreen: "\x1b[42m",
        bgYellow: "\x1b[43m",
        bgBlue: "\x1b[44m",
        bgMagenta: "\x1b[45m",
        bgCyan: "\x1b[46m",
        bgWhite: "\x1b[47m"
    };

    public static printHeader(text: string): void {
        console.log(`\n${this.colors.bright}${this.colors.fgCyan}=== ${text.toUpperCase()} ===${this.colors.reset}`);
    }

    public static printStep(step: string, details: string): void {
        console.log(`${this.colors.fgYellow}>> ${step}:${this.colors.reset} ${details}`);
    }

    public static printInfo(text: string): void {
        console.log(`${this.colors.dim}${text}${this.colors.reset}`);
    }

    public static printSuccess(text: string): void {
        console.log(`${this.colors.fgGreen}✔ SUCCESS:${this.colors.reset} ${text}`);
    }

    public static printError(text: string): void {
        console.log(`${this.colors.fgRed}✖ ERROR:${this.colors.reset} ${text}`);
    }

    public static printAdvice(advice: string): void {
        console.log(`${this.colors.dim}${this.colors.fgMagenta}${advice}${this.colors.reset}`);
    }

    public static printDivider(char: string = '-', length: number = 50): void {
        console.log(this.colors.dim + char.repeat(length) + this.colors.reset);
    }

    public static printFooter(): void {
        console.log("\n");
    }

    public static printEcosystemStatus(agents: { name: string, balance: number, debt: number, trades: number, bets: number }[]): void {
        console.log(`\n${this.colors.bright}=================== MAVERICK ECOSYSTEM STATUS ===================${this.colors.reset}`);
        console.log(`${this.colors.fgCyan}${'NAME'.padEnd(10)} | ${'BALANCE'.padEnd(10)} | ${'DEBT'.padEnd(8)} | ${'TRADES'.padEnd(7)} | ${'BETS'}${this.colors.reset}`);
        this.printDivider('-');
        for (const a of agents) {
            const row = `${a.name.padEnd(10)} | ${a.balance.toFixed(4).padEnd(10)} | ${a.debt.toFixed(2).padEnd(8)} | ${a.trades.toString().padEnd(7)} | ${a.bets}`;
            console.log(row);
        }
        console.log(`${this.colors.bright}=================================================================${this.colors.reset}\n`);
    }

    public static printPositionAlerts(positions: { marketName: string, side: string, shares: number, entryPrice: number, currentPrice: number, pnl: number, pnlPercent: number }[]): void {
        console.log(`\n${this.colors.bright}${this.colors.fgYellow}POSITION ALERTS (${positions.length})${this.colors.reset}\n`);

        for (const p of positions) {
            const isUp = p.currentPrice >= p.entryPrice;
            const arrow = isUp ? 'UP' : 'DOWN';
            const arrowColor = isUp ? this.colors.fgGreen : this.colors.fgRed;
            const pnlColor = p.pnl >= 0 ? this.colors.fgGreen : this.colors.fgRed;

            console.log(`  ${arrowColor}${arrow}${this.colors.reset} ${this.colors.bright}${p.marketName}${this.colors.reset}`);
            console.log(`    ${p.side === 'YES' ? 'Yes' : 'No'} | ${p.shares.toFixed(1)} shares`);
            console.log(`    Entry: $${p.entryPrice.toFixed(3)} -> Now: $${p.currentPrice.toFixed(3)}`);
            console.log(`    PnL: ${pnlColor}${p.pnl >= 0 ? '+' : ''}$${p.pnl.toFixed(2)}${this.colors.reset} (${pnlColor}${p.pnlPercent >= 0 ? '+' : ''}${p.pnlPercent.toFixed(1)}%${this.colors.reset})\n`);
        }
    }

    public static printMaverickLogo(): void {
        console.log(this.colors.bright + this.colors.fgCyan + `
   __  __                       _      _   
  |  \\/  |                     (_)    | |  
  | \\  / | __ _ __   __ ___  _ __  _  | | __
  | |\\/| |/ _\` |\\ \\ / // _ \\| '__|| | | |/ /
  | |  | | (_| | \\ V /|  __/| |   | | |   < 
  |_|  |_|\\__,_|  \\_/  \\___||_|   |_| |_|\\_\\
        ` + this.colors.reset);
        console.log(this.colors.dim + "      Fine Terminal Multi-Agent Ecosystem" + this.colors.reset + "\n");
    }
}
