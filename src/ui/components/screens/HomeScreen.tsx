import React from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { useServices } from '../../context/ServicesContext.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useBalance } from '../../hooks/useBalance.js';
import { useAMMStats } from '../../hooks/useAMMStats.js';
import { useGovernance } from '../../hooks/useGovernance.js';
import { theme } from '../../theme.js';
import * as fs from 'fs';
import * as path from 'path';

const baseMenuItems: MenuItem[] = [
    { label: 'Wallet', value: 'wallet', description: 'Airdrop, mint USDC, send tokens' },
    { label: 'Send', value: 'send', description: 'Send SOL or USDC to any address' },
    { label: 'Swap', value: 'swap', description: 'SOL <-> USDC via AJO Bank AMM' },
    { label: 'AJO Bank', value: 'bank', description: 'Vault deposit, withdraw, loans' },
    { label: 'Markets', value: 'markets', description: 'Kalshi prediction markets' },
    { label: 'Agents', value: 'agents', description: 'View mavericks, send commands' },
    { label: 'Invite', value: 'invite', description: 'Onboard a friend' },
    { label: 'Governance', value: 'governance', description: 'Pending funding requests' },
    { label: 'History', value: 'history', description: 'Transaction log' },
    { label: 'Settings', value: 'settings', description: 'Network & preferences' },
    { label: 'Quit', value: 'quit' },
];

export function HomeScreen() {
    const { agents, connection, amm, activeAgentIndex, setActiveAgentIndex } = useServices();
    const { push } = useNavigation();

    const activeAgent = agents[activeAgentIndex] ?? agents[0];
    const { sol, usdc } = useBalance(activeAgent?.wallet ?? null, connection);
    const ammStats = useAMMStats(amm);
    const { pending } = useGovernance();

    // Read recent history
    const historyPath = path.join(process.cwd(), 'history.json');
    let recentFeed: { timestamp: string; action: string; description: string }[] = [];
    try {
        if (fs.existsSync(historyPath)) {
            const all = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            recentFeed = all.slice(-5).reverse();
        }
    } catch { /* ignore */ }

    // Build menu with switch option if multiple agents
    const menuItems: MenuItem[] = agents.length > 1
        ? [
            { label: `Switch Agent (${activeAgent?.name})`, value: 'switchAgent', description: 'Change active agent' },
            ...baseMenuItems,
        ]
        : baseMenuItems;

    const handleSelect = (item: MenuItem) => {
        if (item.value === 'quit') {
            process.exit(0);
        }
        if (item.value === 'switchAgent') {
            const nextIdx = (activeAgentIndex + 1) % agents.length;
            setActiveAgentIndex(nextIdx);
            return;
        }
        const labelMap: Record<string, string> = {
            wallet: 'Wallet', send: 'Send', swap: 'Swap', bank: 'AJO Bank', markets: 'Markets',
            agents: 'Agents', invite: 'Invite', governance: 'Governance',
            history: 'History', settings: 'Settings',
        };
        push(item.value as any, labelMap[item.value] ?? item.label);
    };

    return (
        <Screen solBalance={sol} usdcBalance={usdc}>
            {/* Active agent */}
            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={theme.colors.primary}>Active: <Text color={theme.colors.success}>{activeAgent?.name}</Text></Text>
                <Text dimColor> {activeAgent?.wallet.getPublicKey().toBase58()}</Text>
                {agents.length > 1 && (
                    <Text dimColor> ({agents.length} agents — switch via menu)</Text>
                )}
            </Box>

            {/* AMM Status */}
            {ammStats.sol > 0 && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text bold>AJO Bank AMM</Text>
                    <Text>
                        <Text> Pool: </Text>
                        <Text color={theme.colors.success}>{ammStats.sol.toFixed(2)} SOL</Text>
                        <Text> / </Text>
                        <Text color={theme.colors.primary}>{ammStats.usdc.toFixed(2)} USDC</Text>
                        <Text> | Price: 1 SOL = {ammStats.price.toFixed(2)} USDC | LPs: {ammStats.lpCount}</Text>
                    </Text>
                </Box>
            )}

            {/* Governance alerts */}
            {pending.length > 0 && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text bold color={theme.colors.warning}>Pending Governance ({pending.length})</Text>
                    {pending.slice(0, 3).map((r, i) => (
                        <Text key={i} dimColor>
                            {' '}{r.requesterName} requests {r.amount} {r.token} from {r.providerName}
                        </Text>
                    ))}
                </Box>
            )}

            {/* Live feed */}
            {recentFeed.length > 0 && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text bold>Live Feed</Text>
                    {recentFeed.map((e, i) => (
                        <Text key={i}>
                            <Text dimColor> [{new Date(e.timestamp).toLocaleTimeString()}]</Text>
                            <Text color={theme.colors.secondary}> {e.action.padEnd(12)}</Text>
                            <Text>{e.description}</Text>
                        </Text>
                    ))}
                </Box>
            )}

            <Menu items={menuItems} onSelect={handleSelect} />
        </Screen>
    );
}
