import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { theme } from '../../theme.js';

interface TextPromptProps {
    label: string;
    placeholder?: string;
    onSubmit: (value: string) => void;
    validate?: (value: string) => string | null;
}

export function TextPrompt({ label, placeholder, onSubmit, validate }: TextPromptProps) {
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (val: string) => {
        if (validate) {
            const err = validate(val);
            if (err) {
                setError(err);
                return;
            }
        }
        setError(null);
        onSubmit(val);
    };

    return (
        <Box flexDirection="column">
            <Box>
                <Text color={theme.colors.secondary}>{label}: </Text>
                <TextInput
                    value={value}
                    onChange={(v) => { setValue(v); setError(null); }}
                    onSubmit={handleSubmit}
                    {...(placeholder ? { placeholder } : {})}
                />
            </Box>
            {error && <Text color={theme.colors.error}>{error}</Text>}
        </Box>
    );
}
