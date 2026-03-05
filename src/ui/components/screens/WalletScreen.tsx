import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { Spinner } from '../shared/Spinner.js';
import { SuccessMessage } from '../shared/SuccessMessage.js';
import { ErrorMessage } from '../shared/ErrorMessage.js';
import { useServices } from '../../context/ServicesContext.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useBalance } from '../../hooks/useBalance.js';
import { theme } from '../../theme.js';

export function WalletScreen() {
    const { agents, connection, activeAgentIndex } = useServices();
    const { push, pop } = useNavigation();
    const [airdropping, setAirdropping] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const agent = agents[activeAgentIndex];
    const { sol, usdc, loading } = useBalance(agent?.wallet ?? null, connection);

    if (!agent) {
        return <Screen><Text>No agents found.</Text></Screen>;
    }

    const handleAirdrop = async () => {
        setAirdropping(true);
        setMessage(null);
        try {
            await agent.wallet.airdrop(1);
            setMessage({ type: 'success', text: 'Airdrop of 1 SOL confirmed!' });
        } catch {
            setMessage({ type: 'error', text: 'Airdrop failed (rate limited). Try again later.' });
        }
        setAirdropping(false);
    };

    const items: MenuItem[] = [
        { label: 'Request Airdrop (1 SOL)', value: 'airdrop' },
        { label: 'Request Funds from Agent', value: 'requestFunds' },
        { label: 'Send SOL / USDC', value: 'send' },
        { label: 'Back', value: 'back' },
    ];

    const handleSelect = (item: MenuItem) => {
        if (item.value === 'back') pop();
        else if (item.value === 'airdrop') void handleAirdrop();
        else if (item.value === 'send') push('send', 'Send');
        else if (item.value === 'requestFunds') push('requestFunds', 'Request Funds');
    };

    return (
        <Screen solBalance={sol} usdcBalance={usdc}>
            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={theme.colors.primary}>Wallet: {agent.name}</Text>
                <Text>Address: <Text color={theme.colors.secondary}>{agent.wallet.getPublicKey().toBase58()}</Text></Text>
                {loading ? (
                    <Spinner label="Loading balance..." />
                ) : (
                    <Box flexDirection="column">
                        <Text>SOL:  <Text color={theme.colors.success} bold>{sol.toFixed(4)}</Text></Text>
                        <Text>USDC: <Text color={theme.colors.primary} bold>{usdc.toFixed(2)}</Text></Text>
                    </Box>
                )}
            </Box>

            <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor={sol === 0 || usdc === 0 ? theme.colors.warning : theme.colors.secondary} paddingX={1}>
                <Text bold color={theme.colors.primary}>Fund Wallet</Text>
                <Text> SOL Faucet:  <Text color={theme.colors.secondary}>https://faucet.solana.com</Text>{sol === 0 && <Text color={theme.colors.warning}> (empty!)</Text>}</Text>
                <Text> USDC Faucet: <Text color={theme.colors.secondary}>https://faucet.circle.com</Text>{usdc === 0 && <Text color={theme.colors.warning}> (empty!)</Text>}</Text>
                <Text dimColor> Paste your address above into the faucet, or ask a peer to send you tokens.</Text>
            </Box>

            {airdropping && <Spinner label="Requesting airdrop..." />}
            {message?.type === 'success' && <SuccessMessage message={message.text} />}
            {message?.type === 'error' && <ErrorMessage message={message.text} />}

            <Menu items={items} onSelect={handleSelect} />
        </Screen>
    );
}
