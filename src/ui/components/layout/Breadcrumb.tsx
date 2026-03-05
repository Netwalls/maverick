import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../theme.js';

interface BreadcrumbProps {
    items: string[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
    if (items.length <= 1) return null;
    return (
        <Box marginBottom={1}>
            {items.map((item, i) => (
                <Text key={i}>
                    {i > 0 && <Text dimColor> &gt; </Text>}
                    <Text color={i === items.length - 1 ? theme.colors.primary : theme.colors.muted}>{item}</Text>
                </Text>
            ))}
        </Box>
    );
}
