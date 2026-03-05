import { useState, useEffect } from 'react';
import type { AgentEntry } from '../context/ServicesContext.js';

export function useAgents(agents: AgentEntry[]) {
    const [agentStats, setAgentStats] = useState<{
        name: string;
        address: string;
        trades: number;
        bets: number;
        positions: number;
    }[]>([]);

    useEffect(() => {
        const stats = agents.map(a => {
            const s = a.agent.getStats();
            return {
                name: a.name,
                address: a.wallet.getPublicKey().toBase58(),
                trades: s.trades,
                bets: s.bets,
                positions: s.positions,
            };
        });
        setAgentStats(stats);
    }, [agents]);

    return agentStats;
}
