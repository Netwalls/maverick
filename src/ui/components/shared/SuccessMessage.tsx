import React from 'react';
import { Text } from 'ink';

export function SuccessMessage({ message }: { message: string }) {
    return <Text color="green">✔ {message}</Text>;
}
