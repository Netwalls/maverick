import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../theme.js';

interface HeaderProps {
    solBalance?: number | undefined;
    usdcBalance?: number | undefined;
    network?: string | undefined;
}

export function Header({ solBalance, usdcBalance, network = 'devnet' }: HeaderProps) {
    return (
        <Box flexDirection="column">
            <Text color={theme.colors.primary} bold>{theme.logo}</Text>
            <Text dimColor>{theme.tagline}</Text>
            <Box marginTop={1} justifyContent="space-between">
                <Text dimColor>Network: <Text color={theme.colors.primary}>{network}</Text></Text>
                {solBalance !== undefined && (
                    <Text>
                        <Text color={theme.colors.success}>{solBalance.toFixed(4)} SOL</Text>
                        <Text dimColor> | </Text>
                        <Text color={theme.colors.primary}>{(usdcBalance ?? 0).toFixed(2)} USDC</Text>
                    </Text>
                )}
            </Box>
            <Box>
                <Text dimColor>{'─'.repeat(60)}</Text>
            </Box>
        </Box>
    );
}
