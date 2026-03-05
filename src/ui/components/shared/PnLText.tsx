import React from 'react';
import { Text } from 'ink';

interface PnLTextProps {
    value: number;
    suffix?: string;
}

export function PnLText({ value, suffix = '' }: PnLTextProps) {
    const color = value >= 0 ? 'green' : 'red';
    const sign = value >= 0 ? '+' : '';
    return <Text color={color}>{sign}{value.toFixed(2)}{suffix}</Text>;
}
