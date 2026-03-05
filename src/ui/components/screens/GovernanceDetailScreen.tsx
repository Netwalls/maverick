import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { PublicKey } from '@solana/web3.js';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { Spinner } from '../shared/Spinner.js';
import { SuccessMessage } from '../shared/SuccessMessage.js';
import { ErrorMessage } from '../shared/ErrorMessage.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useServices } from '../../context/ServicesContext.js';
import { useGovernance } from '../../hooks/useGovernance.js';
import { TokenService } from '../../../core/tokenService.js';
import { theme } from '../../theme.js';

export function GovernanceDetailScreen() {
    const { pop, current } = useNavigation();
    const { agents, signer, connection, vaultManager } = useServices();
    const requestIndex = (current.params?.requestIndex as number) ?? 0;
    const { requests, approve, reject } = useGovernance();
    const [decided, setDecided] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [decision, setDecision] = useState('');
    const [error, setError] = useState('');

    const request = requests[requestIndex];
    if (!request) {
        return <Screen><Text>Request not found.</Text></Screen>;
    }

    const handleSelect = async (item: MenuItem) => {
        if (item.value === 'approve') {
            setExecuting(true);
            setError('');
            try {
                // Find provider wallet from agents list
                const providerAgent = agents.find(a =>
                    a.wallet.getPublicKey().toBase58() === request.provider
                );

                if (!providerAgent) {
                    setError('Provider wallet not found in active agents.');
                    setExecuting(false);
                    return;
                }

                const requesterPubkey = new PublicKey(request.requester);

                if (request.token === 'SOL') {
                    // Real SOL transfer: provider → requester
                    await signer.sendTransfer(providerAgent.wallet, requesterPubkey, request.amount);
                } else {
                    // Real USDC SPL transfer: provider → requester
                    const usdcMint = vaultManager.getUSDCMint();
                    await TokenService.transferTokens(
                        connection,
                        usdcMint,
                        providerAgent.wallet.getKeypair(),
                        requesterPubkey,
                        request.amount
                    );
                }

                approve(requestIndex);
                setDecision('Approved');
                setDecided(true);
            } catch (e: any) {
                setError(`Transfer failed: ${e.message ?? e}`);
            }
            setExecuting(false);
        } else if (item.value === 'reject') {
            reject(requestIndex);
            setDecision('Rejected');
            setDecided(true);
        } else {
            pop();
        }
    };

    return (
        <Screen>
            <Text bold color={theme.colors.primary}>Funding Request Detail</Text>
            <Box flexDirection="column" marginY={1}>
                <Text>Requester: <Text color={theme.colors.secondary}>{request.requesterName}</Text> ({request.requester.slice(0, 12)}...)</Text>
                <Text>Provider:  <Text color={theme.colors.secondary}>{request.providerName}</Text> ({request.provider.slice(0, 12)}...)</Text>
                <Text>Amount:    <Text bold>{request.amount} {request.token}</Text></Text>
                <Text>Status:    <Text color={request.status === 'PENDING' ? theme.colors.warning : theme.colors.success}>{request.status}</Text></Text>
                <Text dimColor>Requested: {new Date(request.timestamp).toLocaleString()}</Text>
            </Box>

            {executing && <Spinner label="Executing transfer..." />}
            {error && <ErrorMessage message={error} />}

            {decided ? (
                <Box flexDirection="column">
                    <SuccessMessage message={`Request ${decision}.`} />
                    <Menu items={[{ label: 'Back to Governance', value: 'back' }]} onSelect={pop} />
                </Box>
            ) : !executing ? (
                <Menu
                    items={[
                        { label: 'Approve', value: 'approve' },
                        { label: 'Reject', value: 'reject' },
                        { label: 'Back', value: 'back' },
                    ]}
                    onSelect={(item) => void handleSelect(item)}
                />
            ) : null}
        </Screen>
    );
}
