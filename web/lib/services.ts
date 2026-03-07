import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { MaverickAgent } from '../../src/agents/maverickAgent';
import { AgentRegistry } from '../../src/core/agentRegistry';
import { KalshiService } from '../../src/core/kalshiService';
import { TransactionSigner } from '../../src/core/transactionSigner';
import { VaultManager } from '../../src/core/vaultManager';
import { WalletManager } from '../../src/core/walletManager';
import { MaverickAMM } from '../../src/protocols/maverickAMM';
import { MaverickBank } from '../../src/protocols/maverickBank';
import { HistoryProvider } from '../../src/utils/historyProvider';

export interface AgentEntry {
  name: string;
  agent: MaverickAgent;
  wallet: WalletManager;
}

export interface WebServices {
  connection: Connection;
  history: HistoryProvider;
  signer: TransactionSigner;
  registry: AgentRegistry;
  amm: MaverickAMM;
  bank: MaverickBank;
  agents: AgentEntry[];
  vaultManager: VaultManager;
}

const TARGET_ADDRESS = new PublicKey('GfvXqVpM6X9mYh9f8B7xYv7zJkL5n7m5kGv5G5G5G5G5');

function resolveProjectRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'src')) && fs.existsSync(path.join(cwd, 'web'))) {
    return cwd;
  }

  const parent = path.resolve(cwd, '..');
  if (fs.existsSync(path.join(parent, 'src')) && fs.existsSync(path.join(parent, 'web'))) {
    return parent;
  }

  return cwd;
}

function getAgentEnvKeys(): string[] {
  const envKeys = Object.keys(process.env)
    .filter((key) => key.endsWith('_PRIVATE_KEY') && key !== 'VAULT_PRIVATE_KEY')
    .sort();

  if (envKeys.length > 0) {
    return envKeys;
  }

  return ['AGENT_PRIVATE_KEY', 'BETA_PRIVATE_KEY', 'GAMMA_PRIVATE_KEY'];
}

function toAgentName(envKey: string): string {
  return envKey.replace('_PRIVATE_KEY', '').replace('AGENT', 'Alpha');
}

async function initServices(): Promise<WebServices> {
  const projectRoot = resolveProjectRoot();
  dotenv.config({ path: path.join(projectRoot, '.env') });

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const history = new HistoryProvider(projectRoot);
  const signer = new TransactionSigner(connection);
  const registry = new AgentRegistry();

  const vaultManager = await VaultManager.loadOrCreate(connection);
  const amm = new MaverickAMM(
    connection,
    signer,
    history,
    vaultManager.getWallet(),
    vaultManager.getUSDCMint()
  );
  const bank = new MaverickBank(connection, signer, history, vaultManager.getWallet(), amm);

  const agents: AgentEntry[] = [];
  for (const key of getAgentEnvKeys()) {
    const wallet = new WalletManager(connection, process.env[key], key);
    const name = toAgentName(key);
    const agent = new MaverickAgent(connection, wallet, TARGET_ADDRESS, bank, name);

    registry.registerAgent(name, agent);
    bank.addParticipant(wallet);
    agents.push({ name, agent, wallet });
  }

  KalshiService.prefetch();

  return {
    connection,
    history,
    signer,
    registry,
    amm,
    bank,
    agents,
    vaultManager,
  };
}

const globalForMaverick = globalThis as typeof globalThis & {
  __maverickServicesPromise?: Promise<WebServices>;
};

export function getServices(): Promise<WebServices> {
  if (!globalForMaverick.__maverickServicesPromise) {
    globalForMaverick.__maverickServicesPromise = initServices().catch((error) => {
      globalForMaverick.__maverickServicesPromise = undefined;
      throw error;
    });
  }

  return globalForMaverick.__maverickServicesPromise;
}
