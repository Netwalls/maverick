import { Connection } from '@solana/web3.js';
import { WalletManager } from './walletManager.js';
import { BaseAgent } from '../agents/baseAgent.js';
import { MaverickAgent } from '../agents/maverickAgent.js';

export class AgentRegistry {
    private agents: Map<string, BaseAgent> = new Map();

    public registerAgent(name: string, agent: BaseAgent): void {
        this.agents.set(name, agent);
        console.log(`[Registry] Agent registered: ${name}`);
    }

    public getAgent(name: string): BaseAgent | undefined {
        return this.agents.get(name);
    }

    public getAllAgents(): BaseAgent[] {
        return Array.from(this.agents.values());
    }

    public getAllNames(): string[] {
        return Array.from(this.agents.keys());
    }
}
