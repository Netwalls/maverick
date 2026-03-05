import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import { Spinner } from '../shared/Spinner.js';
import { PnLText } from '../shared/PnLText.js';
import { useServices } from '../../context/ServicesContext.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { KalshiService } from '../../../core/kalshiService.js';
import { theme } from '../../theme.js';

interface Position {
    agentName: string;
    ticker: string;
    marketName: string;
    side: string;
    shares: number;
    entryPrice: number;
    costSol: number;
    currentPrice: number;
    timestamp: string;
}

/** Parse bet entries from history.json */
function parseBetsFromHistory(history: any[], agentAddressMap: Map<string, string>): Position[] {
    const positions: Position[] = [];

    for (const entry of history) {
        if (entry.action !== 'BET') continue;

        const desc: string = entry.description || '';
        const agentName = agentAddressMap.get(entry.agentAddress) || entry.agentAddress?.slice(0, 8) || '?';

        // Parse: "Placed YES bet on TICKER for 0.02 SOL (2.8 shares @ $0.500)"
        const match = desc.match(/Placed (YES|NO) bet on (\S+) for ([\d.]+) SOL \(([\d.]+) shares @ \$([\d.]+)\)/);
        if (match) {
            positions.push({
                agentName,
                ticker: match[2]!,
                marketName: match[2]!,
                side: match[1]!,
                shares: parseFloat(match[4]!),
                entryPrice: parseFloat(match[5]!),
                costSol: parseFloat(match[3]!),
                currentPrice: 0,
                timestamp: entry.timestamp,
            });
        }
    }

    return positions;
}

export function PortfolioScreen() {
    const { agents, history, activeAgentIndex } = useServices();
    const { pop } = useNavigation();
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            // Build address -> name map
            const addressMap = new Map<string, string>();
            for (const a of agents) {
                addressMap.set(a.wallet.getPublicKey().toBase58(), a.name);
            }

            // Read all bets from history
            const allHistory = history.getHistory();
            const bets = parseBetsFromHistory(allHistory, addressMap);

            // Fetch live prices for each unique ticker
            const tickers = [...new Set(bets.map(b => b.ticker))];
            const priceMap = new Map<string, { bid: number; ask: number }>();
            await Promise.all(
                tickers.map(async (t) => {
                    const price = await KalshiService.getMarketPrice(t);
                    priceMap.set(t, price);
                })
            );

            // Enrich positions with live price and market title
            const markets = await KalshiService.getMarkets();
            const marketMap = new Map(markets.map(m => [m.ticker, m]));

            for (const pos of bets) {
                const price = priceMap.get(pos.ticker);
                const market = marketMap.get(pos.ticker);
                if (price) {
                    pos.currentPrice = pos.side === 'YES' ? price.bid / 100 : (100 - price.ask) / 100;
                }
                if (market) {
                    pos.marketName = market.title.slice(0, 30);
                }
            }

            if (!cancelled) {
                setPositions(bets);
                setLoading(false);
            }
        }

        void load();
        return () => { cancelled = true; };
    }, [agents, history]);

    // Filter to active agent or show all
    const activeAgent = agents[activeAgentIndex];
    const activeAddress = activeAgent?.wallet.getPublicKey().toBase58();
    const filtered = positions.filter(p => p.agentName === activeAgent?.name);
    const totalCost = filtered.reduce((sum, p) => sum + p.costSol, 0);

    if (loading) {
        return (
            <Screen>
                <Text bold color={theme.colors.primary}>Portfolio</Text>
                <Spinner label="Loading positions..." />
            </Screen>
        );
    }

    return (
        <Screen>
            <Text bold color={theme.colors.primary}>Portfolio - {activeAgent?.name ?? 'All'}</Text>

            {filtered.length === 0 ? (
                <Box marginY={1}>
                    <Text dimColor>No positions found. Place a bet in Markets to get started.</Text>
                </Box>
            ) : (
                <Box flexDirection="column" marginY={1}>
                    {/* Header */}
                    <Box>
                        <Box width={22}><Text bold color={theme.colors.primary}>Market</Text></Box>
                        <Box width={6}><Text bold color={theme.colors.primary}>Side</Text></Box>
                        <Box width={10}><Text bold color={theme.colors.primary}>Shares</Text></Box>
                        <Box width={10}><Text bold color={theme.colors.primary}>Entry</Text></Box>
                        <Box width={10}><Text bold color={theme.colors.primary}>Now</Text></Box>
                        <Box width={10}><Text bold color={theme.colors.primary}>Cost</Text></Box>
                    </Box>
                    <Text dimColor>{'─'.repeat(68)}</Text>
                    {filtered.map((p, i) => (
                        <Box key={i}>
                            <Box width={22}><Text>{p.marketName.slice(0, 20)}{p.marketName.length > 20 ? '..' : ''}</Text></Box>
                            <Box width={6}><Text color={p.side === 'YES' ? 'green' : 'red'}>{p.side}</Text></Box>
                            <Box width={10}><Text>{p.shares.toFixed(1)}</Text></Box>
                            <Box width={10}><Text>${p.entryPrice.toFixed(3)}</Text></Box>
                            <Box width={10}><Text>${p.currentPrice.toFixed(3)}</Text></Box>
                            <Box width={10}><Text>{p.costSol.toFixed(4)} SOL</Text></Box>
                        </Box>
                    ))}
                    <Text dimColor>{'─'.repeat(68)}</Text>
                    <Text bold>Total Invested: {totalCost.toFixed(4)} SOL across {filtered.length} position{filtered.length !== 1 ? 's' : ''}</Text>
                </Box>
            )}

            {/* Show all agents' positions count */}
            {agents.length > 1 && positions.length > filtered.length && (
                <Text dimColor>({positions.length - filtered.length} positions from other agents)</Text>
            )}

            <Menu items={[{ label: 'Back', value: 'back' }]} onSelect={pop} />
        </Screen>
    );
}
