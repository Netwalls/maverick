import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';
import { TerminalUtils } from './utils/terminalUtils';

dotenv.config();

function invite(name: string, type: string = 'trader') {
    if (!name) {
        TerminalUtils.printError('Missing Name. Usage: npm run invite -- <NAME> [type]');
        TerminalUtils.printAdvice('Available types: trader (default), predbot');
        process.exit(1);
    }

    const envKey = `${name.toUpperCase()}_PRIVATE_KEY`;
    const typeKey = `${name.toUpperCase()}_TYPE`;

    if (process.env[envKey]) {
        TerminalUtils.printError(`Maverick '${name}' already exists in .env.`);
        process.exit(1);
    }

    const keypair = Keypair.generate();
    const secretKey = bs58.encode(keypair.secretKey);
    const publicKey = keypair.publicKey.toBase58();

    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    const newEntries = `\n${envKey}=${secretKey}\n${typeKey}=${type.toLowerCase()}\n`;
    const newContent = envContent.endsWith('\n') || envContent === '' ? `${envContent}${newEntries}` : `${envContent}\n${newEntries}`;

    fs.writeFileSync(envPath, newContent);

    TerminalUtils.printHeader('Maverick Invitation');
    console.log(`${TerminalUtils.colors.fgCyan}Name      :${TerminalUtils.colors.reset} ${name}`);
    console.log(`${TerminalUtils.colors.fgCyan}Type      :${TerminalUtils.colors.reset} ${type.toUpperCase()}`);
    console.log(`${TerminalUtils.colors.fgCyan}Public Key:${TerminalUtils.colors.reset} ${publicKey}`);
    TerminalUtils.printDivider();
    TerminalUtils.printSuccess(`Maverick '${name}' added to .env.`);
    TerminalUtils.printAdvice(`Share this secret key with your friend for Phantom import:`);
    console.log(`${TerminalUtils.colors.bright}${secretKey}${TerminalUtils.colors.reset}`);
    TerminalUtils.printFooter();
}

const args = process.argv.slice(2);
invite(args[0] || '', args[1] || 'trader');
