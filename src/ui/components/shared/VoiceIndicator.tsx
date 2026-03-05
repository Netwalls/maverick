import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../theme.js';
import type { VoiceState } from '../../hooks/useVoice.js';

interface VoiceIndicatorProps {
    state: VoiceState;
    response: string;
}

export function VoiceIndicator({ state, response }: VoiceIndicatorProps) {
    if (state === 'idle' && !response) return null;

    return (
        <Box paddingX={1}>
            {state === 'listening' && (
                <Text color={theme.colors.warning} bold>Listening...</Text>
            )}
            {state === 'processing' && (
                <Text color={theme.colors.primary}>Processing...</Text>
            )}
            {(state === 'speaking' || state === 'idle') && response && (
                <Text color={state === 'speaking' ? theme.colors.success : theme.colors.muted}>{response}</Text>
            )}
        </Box>
    );
}
