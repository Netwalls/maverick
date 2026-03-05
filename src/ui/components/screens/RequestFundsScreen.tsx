import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { TextPrompt } from '../shared/TextPrompt.js';
import { SuccessMessage } from '../shared/SuccessMessage.js';
import { useServices } from '../../context/ServicesContext.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useGovernance } from '../../hooks/useGovernance.js';
import { theme } from '../../theme.js';

type Step = 'provider' | 'token' | 'amount' | 'done';

export function RequestFundsScreen() {
    const { agents, activeAgentIndex } = useServices();
    const { pop } = useNavigation();
    const { addRequest } = useGovernance();

    const [step, setStep] = useState<Step>('provider');
    const [providerIdx, setProviderIdx] = useState(0);
    const [token, setToken] = useState<'SOL' | 'USDC'>('SOL');
    const [amount, setAmount] = useState('');

    const agent = agents[activeAgentIndex];
    if (!agent) return <Screen><Text>No agent selected.</Text></Screen>;

    // Other agents to request from (exclude self)
    const otherAgents = agents.filter((_, i) => i !== activeAgentIndex);

    if (otherAgents.length === 0) {
        return (
            <Screen>
                <Text bold color={theme.colors.primary}>Request Funds</Text>
                <Box marginY={1}>
                    <Text dimColor>No other agents to request from. Invite an agent first.</Text>
                </Box>
                <Menu items={[{ label: 'Back', value: 'back' }]} onSelect={pop} />
            </Screen>
        );
    }

    const handleSubmit = (amt: string) => {
        setAmount(amt);
        const provider = otherAgents[providerIdx]!;
        addRequest({
            requester: agent.wallet.getPublicKey().toBase58(),
            requesterName: agent.name,
            provider: provider.wallet.getPublicKey().toBase58(),
            providerName: provider.name,
            amount: parseFloat(amt),
            token,
        });
        setStep('done');
    };

    return (
        <Screen>
            <Text bold color={theme.colors.primary}>Request Funds from Agent</Text>

            {step === 'provider' && (
                <Menu
                    title="Request from:"
                    items={[
                        ...otherAgents.map((a, i) => ({
                            label: `${a.name} (${a.wallet.getPublicKey().toBase58().slice(0, 12)}...)`,
                            value: String(i),
                        })),
                        { label: 'Back', value: 'back' },
                    ]}
                    onSelect={(item) => {
                        if (item.value === 'back') { pop(); return; }
                        setProviderIdx(parseInt(item.value));
                        setStep('token');
                    }}
                />
            )}

            {step === 'token' && (
                <Menu
                    title="Token:"
                    items={[
                        { label: 'SOL', value: 'SOL' },
                        { label: 'USDC', value: 'USDC' },
                        { label: 'Back', value: 'back' },
                    ]}
                    onSelect={(item) => {
                        if (item.value === 'back') { setStep('provider'); return; }
                        setToken(item.value as 'SOL' | 'USDC');
                        setStep('amount');
                    }}
                />
            )}

            {step === 'amount' && (
                <TextPrompt
                    label={`Amount (${token})`}
                    placeholder="e.g. 0.5"
                    onSubmit={handleSubmit}
                    validate={(v) => {
                        const n = parseFloat(v);
                        if (isNaN(n) || n <= 0) return 'Enter a positive number';
                        return null;
                    }}
                />
            )}

            {step === 'done' && (
                <Box flexDirection="column">
                    <SuccessMessage message={`Request sent! ${agent.name} asked ${otherAgents[providerIdx]!.name} for ${amount} ${token}.`} />
                    <Text dimColor>The provider will see this in Governance and can approve/reject.</Text>
                    <Box marginTop={1}>
                        <Menu items={[
                            { label: 'Request more', value: 'again' },
                            { label: 'Back', value: 'back' },
                        ]} onSelect={(item) => {
                            if (item.value === 'again') { setStep('provider'); }
                            else pop();
                        }} />
                    </Box>
                </Box>
            )}
        </Screen>
    );
}
