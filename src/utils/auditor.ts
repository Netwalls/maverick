import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { TerminalUtils } from './terminalUtils.js';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

dotenv.config();

function viewHistory(name: string) {
    if (!name) {
        TerminalUtils.printError('Usage: npm run history -- <NAME>');
        process.exit(1);
    }

    const historyPath = path.join(process.cwd(), 'history.json');
    if (!fs.existsSync(historyPath)) {
        TerminalUtils.printError('No history found. Run the project first!');
        process.exit(1);
    }

    // 1. Try to find address for NAME from .env
    let searchAddress = '';
    const envName = name.toUpperCase() === 'ALPHA' ? 'AGENT' : name.toUpperCase();
    const envKey = `${envName}_PRIVATE_KEY`;
    const secretKeyStr = process.env[envKey];

    if (secretKeyStr) {
        try {
            const secretKey = bs58.decode(secretKeyStr);
            const keypair = Keypair.fromSecretKey(secretKey);
            searchAddress = keypair.publicKey.toBase58();
        } catch (e) {
            // Not a valid key, will fallback to string search
        }
    }

    // We'll search by NAME or ADDRESS in the history
    TerminalUtils.printHeader(`Audit Report: ${name}`);
    if (searchAddress) {
        TerminalUtils.printAdvice(`Resolved Address: ${searchAddress}`);
    }

    try {
        const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        const isBankAudit = name.toUpperCase() === 'BANK' || name.toUpperCase() === 'VAULT' || name.toUpperCase() === 'AJO';

        const actions = history.filter((a: any) => {
            if (isBankAudit) {
                return a.action.startsWith('BANK_') || a.action.startsWith('AJO_');
            }

            const matchesAddress = searchAddress && a.agentAddress === searchAddress;
            const matchesName = a.agentAddress.toLowerCase().includes(name.toLowerCase()) ||
                (a.description && a.description.toLowerCase().includes(name.toLowerCase()));

            return matchesAddress || matchesName;
        });

        if (actions.length === 0) {
            TerminalUtils.printAdvice('No recorded actions for this Maverick yet.');
            return;
        }

        const limit = 40;
        const displayActions = actions.slice(-limit);

        displayActions.forEach((a: any) => {
            console.log(`${TerminalUtils.colors.dim}[${new Date(a.timestamp).toLocaleTimeString()}]${TerminalUtils.colors.reset} ${TerminalUtils.colors.fgYellow}${a.action.padEnd(10)}${TerminalUtils.colors.reset} | ${a.description}`);
            if (a.reasoning) {
                console.log(`   ${TerminalUtils.colors.fgMagenta}Reasoning:${TerminalUtils.colors.reset} ${a.reasoning}`);
            }
            if (a.signature) {
                console.log(`   ${TerminalUtils.colors.dim}TX: ${a.signature}${TerminalUtils.colors.reset}`);
            }
            console.log('---');
        });

        TerminalUtils.printSuccess(`Showing last ${displayActions.length} actions for Maverick '${name}' (out of ${actions.length} total).`);
    } catch (e) {
        TerminalUtils.printError(`Failed to read history: ${e}`);
    }
    TerminalUtils.printFooter();
}

const args = process.argv.slice(2);
viewHistory(args[0] || '');
