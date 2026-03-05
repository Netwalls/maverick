import React from 'react';
import { Box } from 'ink';
import { Header } from './Header.js';
import { Breadcrumb } from './Breadcrumb.js';
import { useNavigation } from '../../context/NavigationContext.js';

interface ScreenProps {
    children: React.ReactNode;
    solBalance?: number;
    usdcBalance?: number;
}

export function Screen({ children, solBalance, usdcBalance }: ScreenProps) {
    const { breadcrumbs } = useNavigation();

    return (
        <Box flexDirection="column" padding={1}>
            <Header solBalance={solBalance} usdcBalance={usdcBalance} />
            <Breadcrumb items={breadcrumbs} />
            {children}
        </Box>
    );
}
