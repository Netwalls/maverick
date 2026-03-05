import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { useServices } from '../../context/ServicesContext.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useBalance } from '../../hooks/useBalance.js';
import { theme } from '../../theme.js';

export function BankScreen() {
    const { agents, connection, bank, activeAgentIndex } = useServices();
    const { push, pop } = useNavigation();
    const [vaultOnChain, setVaultOnChain] = useState<number | null>(null);

    const agent = agents[activeAgentIndex];
    const { sol, usdc } = useBalance(agent?.wallet ?? null, connection);

    useEffect(() => {
        let cancelled = false;
        bank.getVaultBalanceOnChain().then(bal => {
            if (!cancelled) setVaultOnChain(bal);
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [bank]);

    if (!agent) {
        return <Screen><Text>No agents found.</Text></Screen>;
    }

    const address = agent.wallet.getPublicKey().toBase58();
    const vault = bank.getVaultBalance();
    const contribution = bank.getContribution(address);
    const loan = bank.getOutstandingLoan(address);
    const debt = loan ? loan.amount + loan.fee : 0;

    const items: MenuItem[] = [
        { label: 'Deposit SOL', value: 'deposit' },
        { label: 'Withdraw', value: 'withdraw' },
        { label: 'Request Loan', value: 'loan' },
        { label: 'Repay Loan', value: 'repay' },
        { label: 'Back', value: 'back' },
    ];

    const handleSelect = (item: MenuItem) => {
        if (item.value === 'back') { pop(); return; }
        push('bankAction', item.label, { action: item.value });
    };

    return (
        <Screen solBalance={sol} usdcBalance={usdc}>
            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={theme.colors.primary}>AJO Bank - {agent.name}</Text>
                <Text>Vault Balance: <Text color={theme.colors.success} bold>{vault.toFixed(4)} SOL</Text>
                    {vaultOnChain !== null && <Text dimColor> (on-chain: {vaultOnChain.toFixed(4)})</Text>}
                </Text>
                <Text>Your Contribution: <Text bold>{contribution.toFixed(4)} SOL</Text></Text>
                <Text>Outstanding Debt: <Text color={debt > 0 ? theme.colors.error : theme.colors.success} bold>{debt.toFixed(4)} SOL</Text></Text>
            </Box>
            <Menu items={items} onSelect={handleSelect} />
        </Screen>
    );
}
