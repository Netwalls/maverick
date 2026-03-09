import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import { Connection, clusterApiUrl, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { App } from './App.js';
import { WalletManager } from '../core/walletManager.js';
import { MaverickAgent } from '../agents/maverickAgent.js';
import { AgentRegistry } from '../core/agentRegistry.js';
import { MaverickBank } from '../protocols/maverickBank.js';
import { MaverickAMM } from '../protocols/maverickAMM.js';
import { RemoteMaverickBank } from '../api/RemoteMaverickBank.js';
import { RemoteMaverickAMM } from '../api/RemoteMaverickAMM.js';
import { MaverickApiClient } from '../api/apiClient.js';
import { TransactionSigner } from '../core/transactionSigner.js';
import { HistoryProvider } from '../utils/historyProvider.js';
import { TerminalUtils } from '../utils/terminalUtils.js';
import { VaultManager } from '../core/vaultManager.js';
import { KalshiService } from '../core/kalshiService.js';
import type { Services, AgentEntry } from './context/ServicesContext.js';

// Config directory: ~/.maverick/
const MAVERICK_HOME = path.join(os.homedir(), '.maverick');

function ensureMaverickHome(): void {
    if (!fs.existsSync(MAVERICK_HOME)) {
        fs.mkdirSync(MAVERICK_HOME, { recursive: true });
    }
}

/**
 * Load environment from ~/.maverick/.env (if it exists) and also cwd/.env (for backwards compat).
 * Env vars are merged — ~/.maverick/.env takes precedence for agent keys.
 */
function loadConfig(): void {
    ensureMaverickHome();

    // Load cwd .env first (backwards compat)
    dotenv.config();

    // Then load ~/.maverick/.env (overrides for agent keys)
    const maverickEnv = path.join(MAVERICK_HOME, '.env');
    if (fs.existsSync(maverickEnv)) {
        dotenv.config({ path: maverickEnv, override: true });
    }
}

/**
 * Save an agent key to ~/.maverick/.env
 */
function saveAgentKey(envVarName: string, secretKey: string): void {
    const envPath = path.join(MAVERICK_HOME, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (!envContent.includes(`${envVarName}=`)) {
        const entry = `${envVarName}=${secretKey}\n`;
        envContent = envContent.endsWith('\n') || envContent === '' ? `${envContent}${entry}` : `${envContent}\n${entry}`;
        fs.writeFileSync(envPath, envContent);
    }
}

/**
 * Detect whether to use remote API or local vault.
 * Remote mode is used when API_URL env var is set.
 */
function isRemoteMode(): boolean {
    return !!process.env.API_URL;
}

// Start fetching markets immediately (loads disk cache + fires background API call)
KalshiService.prefetch();

// Suppress raw console.log from services while TUI is active
TerminalUtils.isTuiActive = true;

/**
 * Bootstrap with remote shared vault via API.
 */
async function bootstrapRemote(): Promise<Omit<Services, 'activeAgentIndex' | 'setActiveAgentIndex'>> {
    const apiUrl = process.env.API_URL!;
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const history = new HistoryProvider(MAVERICK_HOME);
    const signer = new TransactionSigner(connection);
    const registry = new AgentRegistry();

    // Clear stale signals
    const signalsPath = path.join(process.cwd(), 'signals.json');
    if (fs.existsSync(signalsPath)) fs.writeFileSync(signalsPath, '[]');

    // Discover agent keys from env
    let envKeys = Object.keys(process.env).filter(
        key => key.endsWith('_PRIVATE_KEY') && key !== 'VAULT_PRIVATE_KEY'
    );

    // Auto-create wallet for new user
    if (envKeys.length === 0) {
        const keypair = Keypair.generate();
        const secretKey = bs58.encode(keypair.secretKey);
        saveAgentKey('AGENT_PRIVATE_KEY', secretKey);
        process.env['AGENT_PRIVATE_KEY'] = secretKey;
        envKeys = ['AGENT_PRIVATE_KEY'];
    }

    // Create API client using first agent's keypair
    const firstKey = process.env[envKeys[0]!]!;
    const firstKeypair = Keypair.fromSecretKey(bs58.decode(firstKey));
    const api = new MaverickApiClient(apiUrl, firstKeypair);

    // Fetch vault pubkey from server
    const vaultInfo = await api.getPublic('/api/vault/info');
    const vaultPubkey = new PublicKey(vaultInfo.vault);

    // Initialize remote AMM and Bank
    const amm = new RemoteMaverickAMM(connection, api, history, vaultPubkey);
    const bank = new RemoteMaverickBank(connection, api, history, vaultPubkey, amm);

    // Sync initial state
    await amm.syncFromServer();

    const target = new PublicKey('GfvXqVpM6X9mYh9f8B7xYv7zJkL5n7m5kGv5G5G5G5G5');
    const agents: AgentEntry[] = [];

    for (const key of envKeys) {
        const name = key.replace('_PRIVATE_KEY', '').replace('AGENT', 'Alpha');
        const wallet = new WalletManager(connection, process.env[key], key);
        const agent = new MaverickAgent(connection, wallet, target, bank as any, name);
        registry.registerAgent(name, agent);
        bank.addParticipant(wallet);
        agents.push({ name, agent, wallet });

        // Sync bank state for each agent
        await bank.syncFromServer(wallet.getPublicKey().toBase58());
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
        vaultManager: null,
    };
}

/**
 * Bootstrap with local vault (original behavior — for development / solo mode).
 */
async function bootstrapLocal(): Promise<Omit<Services, 'activeAgentIndex' | 'setActiveAgentIndex'>> {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const history = new HistoryProvider(process.cwd());
    const signer = new TransactionSigner(connection);
    const registry = new AgentRegistry();

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

async function bootstrap(): Promise<Omit<Services, 'activeAgentIndex' | 'setActiveAgentIndex'>> {
    if (isRemoteMode()) {
        return bootstrapRemote();
    }
    return bootstrapLocal();
}

export async function main() {
    loadConfig();
    const services = await bootstrap();

    render(
        <App services={services} />
    );
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
