import { Connection } from '@solana/web3.js';
import { MaverickAgent } from '../../src/agents/maverickAgent';
import { AgentRegistry } from '../../src/core/agentRegistry';
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
export declare function getServices(): Promise<WebServices>;
//# sourceMappingURL=services.d.ts.map