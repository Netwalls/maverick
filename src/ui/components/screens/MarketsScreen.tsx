import React from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { Spinner } from '../shared/Spinner.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useMarkets } from '../../hooks/useMarkets.js';
import { theme } from '../../theme.js';

export function MarketsScreen() {
    const { push, pop } = useNavigation();
    const { categories, loading } = useMarkets();

    if (loading) {
        return (
            <Screen>
                <Text bold color={theme.colors.primary}>Kalshi Prediction Markets</Text>
                <Spinner label="Scanning Kalshi ecosystem..." />
            </Screen>
        );
    }

    const items: MenuItem[] = [
        ...categories.map(c => ({
            label: `${c.name} (${c.count})`,
            value: c.name,
        })),
        { label: 'Portfolio', value: '__portfolio__' },
        { label: 'Back', value: '__back__' },
    ];

    const handleSelect = (item: MenuItem) => {
        if (item.value === '__back__') { pop(); return; }
        if (item.value === '__portfolio__') { push('portfolio', 'Portfolio'); return; }
        const cat = categories.find(c => c.name === item.value);
        push('marketList', item.value, { category: item.value, subcategories: cat?.subcategories ?? [] });
    };

    return (
        <Screen>
            <Text bold color={theme.colors.primary}>Kalshi Prediction Markets</Text>
            <Text dimColor>{categories.reduce((a, c) => a + c.count, 0)} markets indexed</Text>
            <Box marginTop={1}>
                <Menu items={items} onSelect={handleSelect} />
            </Box>
        </Screen>
    );
}
