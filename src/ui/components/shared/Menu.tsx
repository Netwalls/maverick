import React from 'react';
import SelectInput from 'ink-select-input';
import { Box, Text } from 'ink';
import { theme } from '../../theme.js';

export interface MenuItem {
    label: string;
    value: string;
    description?: string;
}

interface MenuProps {
    items: MenuItem[];
    onSelect: (item: MenuItem) => void;
    title?: string;
}

export function Menu({ items, onSelect, title }: MenuProps) {
    return (
        <Box flexDirection="column">
            {title && (
                <Text bold color={theme.colors.primary}>{title}</Text>
            )}
            <SelectInput
                items={items}
                onSelect={(item) => onSelect(item as MenuItem)}
            />
        </Box>
    );
}
