import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useGovernance } from '../../hooks/useGovernance.js';
import { theme } from '../../theme.js';

export function GovernanceScreen() {
    const { push, pop } = useNavigation();
    const { pending, requests, refresh } = useGovernance();

    useEffect(() => { refresh(); }, [refresh]);

    const items: MenuItem[] = [
        ...pending.map((r, i) => ({
            label: `${r.requesterName} -> ${r.amount} ${r.token} from ${r.providerName}`,
            value: String(i),
        })),
        { label: 'Back', value: 'back' },
    ];

    const handleSelect = (item: MenuItem) => {
        if (item.value === 'back') { pop(); return; }
        const idx = parseInt(item.value);
        // Find the actual index in the full requests array
        const pendingReq = pending[idx];
        const realIdx = requests.findIndex(r => r === pendingReq);
        push('governanceDetail', `Request #${idx + 1}`, { requestIndex: realIdx });
    };

    return (
        <Screen>
            <Text bold color={theme.colors.primary}>Governance - Funding Requests</Text>
            {pending.length === 0 ? (
                <Box marginY={1}>
                    <Text dimColor>No pending requests.</Text>
                </Box>
            ) : (
                <Box marginY={1} flexDirection="column">
                    <Text>Pending: <Text bold color={theme.colors.warning}>{pending.length}</Text></Text>
                </Box>
            )}
            <Menu items={items} onSelect={handleSelect} />
        </Screen>
    );
}
