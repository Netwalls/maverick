import React, { createContext, useContext } from 'react';
import type { Connection } from '@solana/web3.js';
import type { MaverickBank } from '../../protocols/maverickBank.js';
import type { MaverickAMM } from '../../protocols/maverickAMM.js';
import type { RemoteMaverickBank } from '../../api/RemoteMaverickBank.js';
import type { RemoteMaverickAMM } from '../../api/RemoteMaverickAMM.js';
import type { AgentRegistry } from '../../core/agentRegistry.js';
import type { TransactionSigner } from '../../core/transactionSigner.js';
import type { HistoryProvider } from '../../utils/historyProvider.js';
import type { MaverickAgent } from '../../agents/maverickAgent.js';
import type { WalletManager } from '../../core/walletManager.js';
import type { VaultManager } from '../../core/vaultManager.js';

export interface AgentEntry {
    name: string;
    agent: MaverickAgent;
    wallet: WalletManager;
}

export interface Services {
    connection: Connection;
    bank: MaverickBank | RemoteMaverickBank;
    amm: MaverickAMM | RemoteMaverickAMM;
    registry: AgentRegistry;
    signer: TransactionSigner;
    history: HistoryProvider;
    agents: AgentEntry[];
    addAgent: (entry: AgentEntry) => void;
    vaultManager: VaultManager | null;
    activeAgentIndex: number;
    setActiveAgentIndex: (idx: number) => void;
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ value, children }: { value: Services; children: React.ReactNode }) {
    return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
    const ctx = useContext(ServicesContext);
    if (!ctx) throw new Error('useServices must be used within ServicesProvider');
    return ctx;
}
