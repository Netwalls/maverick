import React from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { useServices } from '../../context/ServicesContext.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useAgents } from '../../hooks/useAgents.js';
import { theme } from '../../theme.js';

export function AgentsScreen() {
    const { agents } = useServices();
    const { push, pop } = useNavigation();
    const agentStats = useAgents(agents);

    const items: MenuItem[] = [
        ...agents.map((a, i) => ({
            label: `${a.name} (${a.wallet.getPublicKey().toBase58().slice(0, 12)}...)`,
            value: String(i),
        })),
        { label: 'Onboard New Agent', value: '__invite__' },
        { label: 'Back', value: '__back__' },
    ];

    const handleSelect = (item: MenuItem) => {
        if (item.value === '__back__') { pop(); return; }
        if (item.value === '__invite__') { push('invite', 'Invite'); return; }
        const idx = parseInt(item.value);
        push('agentDetail', agents[idx]?.name ?? 'Agent', { agentIndex: idx });
    };

    return (
        <Screen>
            <Text bold color={theme.colors.primary}>Mavericks ({agents.length})</Text>

            {/* Agent table */}
            <Box flexDirection="column" marginY={1}>
                <Box>
                    <Box width={12}><Text bold color={theme.colors.primary}>Name</Text></Box>
                    <Box width={16}><Text bold color={theme.colors.primary}>Address</Text></Box>
                    <Box width={8}><Text bold color={theme.colors.primary}>Trades</Text></Box>
                    <Box width={8}><Text bold color={theme.colors.primary}>Bets</Text></Box>
                    <Box width={10}><Text bold color={theme.colors.primary}>Positions</Text></Box>
                </Box>
                <Text dimColor>{'─'.repeat(54)}</Text>
                {agentStats.map((s, i) => (
                    <Box key={i}>
                        <Box width={12}><Text color={theme.colors.secondary}>{s.name}</Text></Box>
                        <Box width={16}><Text dimColor>{s.address.slice(0, 12)}...</Text></Box>
                        <Box width={8}><Text>{s.trades}</Text></Box>
                        <Box width={8}><Text>{s.bets}</Text></Box>
                        <Box width={10}><Text>{s.positions}</Text></Box>
                    </Box>
                ))}
            </Box>

            <Menu items={items} onSelect={handleSelect} />
        </Screen>
    );
}
