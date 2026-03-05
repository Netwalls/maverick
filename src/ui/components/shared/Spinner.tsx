import React from 'react';
import { Box, Text } from 'ink';
import InkSpinner from 'ink-spinner';
import { theme } from '../../theme.js';

interface SpinnerProps {
    label: string;
}

export function Spinner({ label }: SpinnerProps) {
    return (
        <Box>
            <Text color={theme.colors.primary}><InkSpinner type="dots" /></Text>
            <Text> {label}</Text>
        </Box>
    );
}
