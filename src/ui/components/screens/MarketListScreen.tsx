import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { Spinner } from '../shared/Spinner.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useMarkets } from '../../hooks/useMarkets.js';
import { theme } from '../../theme.js';
import type { KalshiMarket } from '../../../core/kalshiService.js';

export function MarketListScreen() {
    const { push, pop, current } = useNavigation();
    const category = current.params?.category as string;
    const subcategories = current.params?.subcategories as { name: string; count: number }[] | undefined;
    const [selectedSub, setSelectedSub] = useState<string | null>(null);
    const { getMarketsByCategory, loading } = useMarkets();
    const [filteredMarkets, setFilteredMarkets] = useState<KalshiMarket[]>([]);

    useEffect(() => {
        const markets = getMarketsByCategory(category, selectedSub ?? undefined);
        // Top 10 by activity (has yes_bid > 0)
        const sorted = [...markets].sort((a, b) => (b.yes_bid + b.yes_ask) - (a.yes_bid + a.yes_ask));
        setFilteredMarkets(sorted.slice(0, 10));
    }, [category, selectedSub, getMarketsByCategory]);

    if (loading) {
        return <Screen><Spinner label="Loading markets..." /></Screen>;
    }

    // If subcategories exist and none selected, show subcategory picker
    if (!selectedSub && subcategories && subcategories.length > 1) {
        const subItems: MenuItem[] = [
            { label: `All ${category}`, value: '__all__' },
            ...subcategories.map(s => ({
                label: `${s.name} (${s.count})`,
                value: s.name,
            })),
            { label: 'Back', value: '__back__' },
        ];

        return (
            <Screen>
                <Text bold color={theme.colors.primary}>{category}</Text>
                <Menu items={subItems} onSelect={(item) => {
                    if (item.value === '__back__') { pop(); return; }
                    setSelectedSub(item.value === '__all__' ? '' : item.value);
                }} />
            </Screen>
        );
    }

    // AI Suggestion: pick the market with highest spread (most opportunity)
    const suggested = filteredMarkets.length > 0
        ? filteredMarkets.reduce((best, m) => {
            const spread = Math.abs(m.yes_ask - m.yes_bid);
            const bestSpread = Math.abs(best.yes_ask - best.yes_bid);
            return spread > bestSpread ? m : best;
        }, filteredMarkets[0]!)
        : null;

    const suggestedSide = suggested && suggested.yes_bid > 50 ? 'YES' : 'NO';

    const items: MenuItem[] = [
        ...filteredMarkets.map((m, i) => ({
            label: `#${i + 1} ${m.title.slice(0, 40)}${m.title.length > 40 ? '...' : ''} | YES:$${(m.yes_bid / 100).toFixed(2)} NO:$${((100 - m.yes_ask) / 100).toFixed(2)}`,
            value: m.ticker,
        })),
        { label: 'Back', value: '__back__' },
    ];

    return (
        <Screen>
            <Text bold color={theme.colors.primary}>{category}{selectedSub ? ` > ${selectedSub}` : ''} - Top 10</Text>

            {/* AI Suggestion */}
            {suggested && (
                <Box flexDirection="column" marginY={1} borderStyle="round" borderColor="cyan" paddingX={1}>
                    <Text bold color={theme.colors.info}>MAVERICK SUGGESTS</Text>
                    <Text>{suggested.title}</Text>
                    <Text>
                        Side: <Text bold color={suggestedSide === 'YES' ? 'green' : 'red'}>{suggestedSide}</Text>
                        {' '}@ ${suggestedSide === 'YES' ? (suggested.yes_ask / 100).toFixed(2) : ((100 - suggested.yes_bid) / 100).toFixed(2)}
                    </Text>
                    <Text dimColor>Reasoning: Best spread opportunity in category. High liquidity signal.</Text>
                </Box>
            )}

            <Menu items={items} onSelect={(item) => {
                if (item.value === '__back__') { selectedSub ? setSelectedSub(null) : pop(); return; }
                const market = filteredMarkets.find(m => m.ticker === item.value);
                if (market) {
                    push('bet', market.title.slice(0, 25), { market, suggested: market.ticker === suggested?.ticker ? suggestedSide : null });
                }
            }} />
        </Screen>
    );
}
