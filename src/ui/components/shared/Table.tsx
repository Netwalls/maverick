import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../theme.js';

interface Column {
    key: string;
    label: string;
    width?: number;
    align?: 'left' | 'right';
    color?: string;
}

interface TableProps {
    columns: Column[];
    data: Record<string, string | number>[];
}

export function Table({ columns, data }: TableProps) {
    return (
        <Box flexDirection="column">
            <Box>
                {columns.map((col) => (
                    <Box key={col.key} width={col.width ?? 15}>
                        <Text bold color={theme.colors.primary}>{col.label}</Text>
                    </Box>
                ))}
            </Box>
            <Text dimColor>{'─'.repeat(columns.reduce((acc, c) => acc + (c.width ?? 15), 0))}</Text>
            {data.map((row, i) => (
                <Box key={i}>
                    {columns.map((col) => (
                        <Box key={col.key} width={col.width ?? 15}>
                            <Text {...(col.color ? { color: col.color } : {})}>{String(row[col.key] ?? '')}</Text>
                        </Box>
                    ))}
                </Box>
            ))}
        </Box>
    );
}
