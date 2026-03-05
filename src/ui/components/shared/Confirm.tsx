import React from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../../theme.js';

interface ConfirmProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function Confirm({ message, onConfirm, onCancel }: ConfirmProps) {
    useInput((input) => {
        if (input.toLowerCase() === 'y') onConfirm();
        if (input.toLowerCase() === 'n') onCancel();
    });

    return (
        <Box>
            <Text color={theme.colors.warning}>{message} </Text>
            <Text>[<Text color={theme.colors.success}>Y</Text>/<Text color={theme.colors.error}>N</Text>]</Text>
        </Box>
    );
}
