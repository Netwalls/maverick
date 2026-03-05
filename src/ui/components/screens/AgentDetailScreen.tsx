import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { TextPrompt } from '../shared/TextPrompt.js';
import { Spinner } from '../shared/Spinner.js';
import { SuccessMessage } from '../shared/SuccessMessage.js';
import { ErrorMessage } from '../shared/ErrorMessage.js';
import { useServices } from '../../context/ServicesContext.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useBalance } from '../../hooks/useBalance.js';
import { useGovernance } from '../../hooks/useGovernance.js';
import { theme } from '../../theme.js';
import * as fs from 'fs';
import * as path from 'path';

type Step = 'menu' | 'signal' | 'requestFunds' | 'pickProvider' | 'pickToken' | 'pickAmount' | 'sending' | 'done';

interface Signal {
    agentName: string;
    action: string;
    target?: string;
    timestamp: string;
}

function sendSignal(name: string, action: string, target?: string) {
    const signalsPath = path.join(process.cwd(), 'signals.json');
    let signals: Signal[] = [];
    if (fs.existsSync(signalsPath)) {
        try { signals = JSON.parse(fs.readFileSync(signalsPath, 'utf8')); } catch { signals = []; }
    }
    signals = signals.filter(s => s.agentName.toLowerCase() !== name.toLowerCase());
    const signal: Signal = { agentName: name, action: action.toUpperCase(), timestamp: new Date().toISOString() };
    if (target) signal.target = target;
    signals.push(signal);
    fs.writeFileSync(signalsPath, JSON.stringify(signals, null, 2));
}

export function AgentDetailScreen() {
    const { agents, connection } = useServices();
    const { pop, current } = useNavigation();
    const { addRequest } = useGovernance();
    const agentIndex = (current.params?.agentIndex as number) ?? 0;
    const agent = agents[agentIndex];

    const { sol, usdc } = useBalance(agent?.wallet ?? null, connection);

    const [step, setStep] = useState<Step>('menu');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [providerIdx, setProviderIdx] = useState(0);
    const [fundToken, setFundToken] = useState<'SOL' | 'USDC'>('SOL');

    if (!agent) {
        return <Screen><Text>Agent not found.</Text></Screen>;
    }

    const stats = agent.agent.getStats();
    const address = agent.wallet.getPublicKey().toBase58();

    const menuItems: MenuItem[] = [
        { label: 'Send Signal: Trade', value: 'TRADE' },
        { label: 'Send Signal: Bet', value: 'BET' },
        { label: 'Send Signal: Swap', value: 'SWAP' },
        { label: 'Send Signal: Withdraw', value: 'WITHDRAW' },
        { label: 'Send Signal: Deposit', value: 'DEPOSIT' },
        { label: 'Send Signal: LP', value: 'LP' },
        { label: 'Request Funds from Agent', value: '__request_funds__' },
        { label: 'Back', value: '__back__' },
    ];

    const handleSelect = (item: MenuItem) => {
        if (item.value === '__back__') { pop(); return; }
        if (item.value === '__request_funds__') { setStep('pickProvider'); return; }
        sendSignal(agent.name, item.value);
        setMessage({ type: 'success', text: `Signal '${item.value}' sent to ${agent.name}. Will execute next cycle.` });
        setStep('done');
    };

    const otherAgents = agents.filter((_, i) => i !== agentIndex);

    return (
        <Screen solBalance={sol} usdcBalance={usdc}>
            <Box flexDirection="column" marginBottom={1}>
                <Text bold color={theme.colors.primary}>{agent.name}</Text>
                <Text>Address: <Text dimColor>{address}</Text></Text>
                <Text>SOL: <Text color={theme.colors.success}>{sol.toFixed(4)}</Text> | USDC: <Text color={theme.colors.primary}>{usdc.toFixed(2)}</Text></Text>
                <Text>Trades: {stats.trades} | Bets: {stats.bets} | Positions: {stats.positions}</Text>
            </Box>

            {step === 'menu' && <Menu items={menuItems} onSelect={handleSelect} />}

            {step === 'pickProvider' && (
                <Box flexDirection="column">
                    <Text bold>Request funds from which agent?</Text>
                    <Menu
                        items={[
                            ...otherAgents.map((a, i) => ({ label: a.name, value: String(i) })),
                            { label: 'Cancel', value: '__cancel__' },
                        ]}
                        onSelect={(item) => {
                            if (item.value === '__cancel__') { setStep('menu'); return; }
                            setProviderIdx(parseInt(item.value));
                            setStep('pickToken');
                        }}
                    />
                </Box>
            )}

            {step === 'pickToken' && (
                <Menu
                    title="Request which token?"
                    items={[
                        { label: 'SOL', value: 'SOL' },
                        { label: 'USDC', value: 'USDC' },
                        { label: 'Cancel', value: '__cancel__' },
                    ]}
                    onSelect={(item) => {
                        if (item.value === '__cancel__') { setStep('menu'); return; }
                        setFundToken(item.value as 'SOL' | 'USDC');
                        setStep('pickAmount');
                    }}
                />
            )}

            {step === 'pickAmount' && (
                <TextPrompt
                    label={`Amount (${fundToken})`}
                    placeholder="e.g. 0.5"
                    onSubmit={(val) => {
                        const provider = otherAgents[providerIdx];
                        if (provider) {
                            addRequest({
                                requester: address,
                                requesterName: agent.name,
                                provider: provider.wallet.getPublicKey().toBase58(),
                                providerName: provider.name,
                                amount: parseFloat(val),
                                token: fundToken,
                            });
                            setMessage({ type: 'success', text: `Funding request sent: ${val} ${fundToken} from ${provider.name}. Awaiting governance approval.` });
                        }
                        setStep('done');
                    }}
                    validate={(v) => {
                        const n = parseFloat(v);
                        if (isNaN(n) || n <= 0) return 'Enter a positive number';
                        return null;
                    }}
                />
            )}

            {step === 'sending' && <Spinner label="Processing..." />}

            {step === 'done' && (
                <Box flexDirection="column">
                    {message?.type === 'success' && <SuccessMessage message={message.text} />}
                    {message?.type === 'error' && <ErrorMessage message={message.text} />}
                    <Menu items={[{ label: 'Back to Agent', value: 'menu' }, { label: 'Back to Agents', value: 'back' }]} onSelect={(item) => {
                        if (item.value === 'menu') { setStep('menu'); setMessage(null); }
                        else pop();
                    }} />
                </Box>
            )}
        </Screen>
    );
}
