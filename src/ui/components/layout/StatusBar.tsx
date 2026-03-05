import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../theme.js';
import { useInterval } from '../../hooks/useInterval.js';

interface StatusBarProps {
    network: string;
}

export function StatusBar({ network }: StatusBarProps) {
    const [time, setTime] = useState(new Date().toLocaleTimeString());

    useInterval(() => {
        setTime(new Date().toLocaleTimeString());
    }, 1000);

    return (
        <Box marginTop={1}>
            <Text dimColor>{'─'.repeat(60)}</Text>
            <Box justifyContent="space-between">
                <Text dimColor>{network} | {time}</Text>
                <Text dimColor>[V] Voice  [B] Back  [Q] Quit</Text>
            </Box>
        </Box>
    );
}
