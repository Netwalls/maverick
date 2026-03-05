import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { theme } from '../../theme.js';

export function SettingsScreen() {
    const { pop } = useNavigation();
    const [network] = useState('devnet');

    const items: MenuItem[] = [
        { label: `Network: ${network}`, value: 'network' },
        { label: 'Back', value: 'back' },
    ];

    return (
        <Screen>
            <Text bold color={theme.colors.primary}>Settings</Text>
            <Box flexDirection="column" marginY={1}>
                <Text>Network: <Text color={theme.colors.primary}>{network}</Text></Text>
                <Text dimColor>More settings coming in future updates.</Text>
            </Box>
            <Menu items={items} onSelect={(item) => {
                if (item.value === 'back') pop();
            }} />
        </Screen>
    );
}
