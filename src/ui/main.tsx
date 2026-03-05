import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import { Connection, clusterApiUrl, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import { App } from './App.js';
import { WalletManager } from '../core/walletManager.js';
import { MaverickAgent } from '../agents/maverickAgent.js';
import { AgentRegistry } from '../core/agentRegistry.js';
import { MaverickBank } from '../protocols/maverickBank.js';
import { MaverickAMM } from '../protocols/maverickAMM.js';
import { TransactionSigner } from '../core/transactionSigner.js';
import { HistoryProvider } from '../utils/historyProvider.js';
import { TerminalUtils } from '../utils/terminalUtils.js';
import { VaultManager } from '../core/vaultManager.js';
import { KalshiService } from '../core/kalshiService.js';
import type { Services, AgentEntry } from './context/ServicesContext.js';

dotenv.config();

// Start fetching markets immediately (loads disk cache + fires background API call)
KalshiService.prefetch();

// Suppress raw console.log from services while TUI is active
TerminalUtils.isTuiActive = true;

async function bootstrap(): Promise<Omit<Services, 'activeAgentIndex' | 'setActiveAgentIndex'>> {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const history = new HistoryProvider(process.cwd());
    const signer = new TransactionSigner(connection);
    const registry = new AgentRegistry();

    // Vault: load or create keypair. No auto-funding — user funds via faucet or peer transfer.
    // Uses Circle's official devnet USDC — constant address, same for everyone.
    const vaultManager = await VaultManager.loadOrCreate(connection);

    const amm = new MaverickAMM(connection, signer, history, vaultManager.getWallet(), vaultManager.getUSDCMint());
    const bank = new MaverickBank(connection, signer, history, vaultManager.getWallet(), amm);

    // Clear stale signals
    const signalsPath = path.join(process.cwd(), 'signals.json');
    if (fs.existsSync(signalsPath)) fs.writeFileSync(signalsPath, '[]');

    // Dynamic Agent Discovery from .env
    let envKeys = Object.keys(process.env).filter(
        key => key.endsWith('_PRIVATE_KEY') && key !== 'VAULT_PRIVATE_KEY'
    );

    // Auto-create wallet for new user
    if (envKeys.length === 0) {
        const keypair = Keypair.generate();
        const secretKey = bs58.encode(keypair.secretKey);
        const envPath = path.join(process.cwd(), '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        const entry = `AGENT_PRIVATE_KEY=${secretKey}\n`;
        const newContent = envContent.endsWith('\n') || envContent === '' ? `${envContent}${entry}` : `${envContent}\n${entry}`;
        fs.writeFileSync(envPath, newContent);
        process.env['AGENT_PRIVATE_KEY'] = secretKey;
        envKeys = ['AGENT_PRIVATE_KEY'];
    }

    const target = new PublicKey('GfvXqVpM6X9mYh9f8B7xYv7zJkL5n7m5kGv5G5G5G5G5');
    const agents: AgentEntry[] = [];

    for (const key of envKeys) {
        const name = key.replace('_PRIVATE_KEY', '').replace('AGENT', 'Alpha');
        const wallet = new WalletManager(connection, process.env[key], key);
        const agent = new MaverickAgent(connection, wallet, target, bank, name);
        registry.registerAgent(name, agent);
        bank.addParticipant(wallet);
        agents.push({ name, agent, wallet });
    }

    const addAgent = (entry: AgentEntry) => {
        registry.registerAgent(entry.name, entry.agent);
        agents.push(entry);
    };

    return {
        connection,
        bank,
        amm,
        registry,
        signer,
        history,
        agents,
        addAgent,
        vaultManager,
    };
}

async function main() {
    const services = await bootstrap();

    render(
        <App services={services} />
    );
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
