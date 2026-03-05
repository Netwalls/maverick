import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { TextPrompt } from '../shared/TextPrompt.js';
import { useServices } from '../../context/ServicesContext.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useHistory } from '../../hooks/useHistory.js';
import { theme } from '../../theme.js';

const PAGE_SIZE = 15;

export function HistoryScreen() {
    const { history: historyProvider } = useServices();
    const { pop } = useNavigation();
    const { entries, filter, setFilter, refresh } = useHistory(historyProvider);
    const [page, setPage] = useState(0);
    const [filtering, setFiltering] = useState(false);

    useEffect(() => { refresh(); }, [refresh, filter]);

    const reversed = [...entries].reverse();
    const totalPages = Math.ceil(reversed.length / PAGE_SIZE);
    const pageEntries = reversed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const navItems: MenuItem[] = [
        { label: 'Filter', value: 'filter' },
        ...(filter ? [{ label: `Clear filter: "${filter}"`, value: 'clear' }] : []),
        ...(page > 0 ? [{ label: 'Previous Page', value: 'prev' }] : []),
        ...(page < totalPages - 1 ? [{ label: 'Next Page', value: 'next' }] : []),
        { label: 'Back', value: 'back' },
    ];

    if (filtering) {
        return (
            <Screen>
                <Text bold color={theme.colors.primary}>Filter History</Text>
                <TextPrompt
                    label="Filter by action, address, or description"
                    placeholder="e.g. TRADE, BANK, BET..."
                    onSubmit={(val) => { setFilter(val); setFiltering(false); setPage(0); }}
                />
            </Screen>
        );
    }

    return (
        <Screen>
            <Text bold color={theme.colors.primary}>Transaction History ({entries.length} entries){filter && ` [filter: ${filter}]`}</Text>

            <Box flexDirection="column" marginY={1}>
                {pageEntries.length === 0 ? (
                    <Text dimColor>No entries found.</Text>
                ) : (
                    pageEntries.map((e, i) => (
                        <Box key={i}>
                            <Text dimColor>[{new Date(e.timestamp).toLocaleString()}] </Text>
                            <Text color={theme.colors.secondary}>{e.action.padEnd(15)} </Text>
                            <Text>{e.description.slice(0, 50)}</Text>
                        </Box>
                    ))
                )}
            </Box>

            {totalPages > 1 && (
                <Text dimColor>Page {page + 1}/{totalPages}</Text>
            )}

            <Menu items={navItems} onSelect={(item) => {
                if (item.value === 'back') pop();
                else if (item.value === 'filter') setFiltering(true);
                else if (item.value === 'clear') { setFilter(''); setPage(0); }
                else if (item.value === 'prev') setPage(p => Math.max(0, p - 1));
                else if (item.value === 'next') setPage(p => p + 1);
            }} />
        </Screen>
    );
}
