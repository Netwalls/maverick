import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { PublicKey } from '@solana/web3.js';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { TextPrompt } from '../shared/TextPrompt.js';
import { Confirm } from '../shared/Confirm.js';
import { Spinner } from '../shared/Spinner.js';
import { SuccessMessage } from '../shared/SuccessMessage.js';
import { ErrorMessage } from '../shared/ErrorMessage.js';
import { useServices } from '../../context/ServicesContext.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { useBalance } from '../../hooks/useBalance.js';
import { TokenService } from '../../../core/tokenService.js';
import { theme } from '../../theme.js';

type Step = 'token' | 'recipient' | 'amount' | 'confirm' | 'sending' | 'done';

export function SendScreen() {
    const { agents, connection, signer, history, vaultManager, activeAgentIndex } = useServices();
    const { pop } = useNavigation();
    const agent = agents[activeAgentIndex];

    const { sol, usdc } = useBalance(agent?.wallet ?? null, connection);

    const [step, setStep] = useState<Step>('token');
    const [token, setToken] = useState<'SOL' | 'USDC'>('SOL');
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    if (!agent) {
        return <Screen><Text>No agent selected.</Text></Screen>;
    }

    const handleTokenSelect = (item: MenuItem) => {
        if (item.value === 'back') { pop(); return; }
        setToken(item.value as 'SOL' | 'USDC');
        setStep('recipient');
    };

    const handleRecipient = (val: string) => {
        setRecipient(val);
        setStep('amount');
    };

    const handleAmount = (val: string) => {
        setAmount(val);
        setStep('confirm');
    };

    const handleConfirm = async () => {
        setStep('sending');
        try {
            const toPubkey = new PublicKey(recipient);
            const amt = parseFloat(amount);

            if (token === 'SOL') {
                const sig = await signer.sendTransfer(agent.wallet, toPubkey, amt);
                await history.recordAction({
                    timestamp: new Date().toISOString(),
                    agentAddress: agent.wallet.getPublicKey().toBase58(),
                    action: 'SEND_SOL',
                    description: `Sent ${amt} SOL to ${recipient.slice(0, 8)}...`,
                    signature: sig,
                });
                setResult({ type: 'success', text: `Sent ${amt} SOL! Sig: ${sig.slice(0, 16)}...` });
            } else {
                // Real USDC SPL token transfer
                const usdcMint = vaultManager?.getUSDCMint() ?? (await import('../../../core/tokenService.js')).USDC_MINT_DEVNET;
                const sig = await TokenService.transferTokens(
                    connection,
                    usdcMint,
                    agent.wallet.getKeypair(),
                    toPubkey,
                    amt
                );
                await history.recordAction({
                    timestamp: new Date().toISOString(),
                    agentAddress: agent.wallet.getPublicKey().toBase58(),
                    action: 'SEND_USDC',
                    description: `Sent ${amt} USDC to ${recipient.slice(0, 8)}...`,
                    signature: sig,
                });
                setResult({ type: 'success', text: `Sent ${amt} USDC! Sig: ${sig.slice(0, 16)}...` });
            }
        } catch (e: any) {
            setResult({ type: 'error', text: `Transfer failed: ${e.message ?? e}` });
        }
        setStep('done');
    };

    const validateAddress = (val: string) => {
        try { new PublicKey(val); return null; } catch { return 'Invalid Solana address'; }
    };

    const validateAmount = (val: string) => {
        const n = parseFloat(val);
        if (isNaN(n) || n <= 0) return 'Enter a positive number';
        if (token === 'SOL' && n > sol) return `Insufficient SOL (have ${sol.toFixed(4)})`;
        if (token === 'USDC' && n > usdc) return `Insufficient USDC (have ${usdc.toFixed(2)})`;
        return null;
    };

    return (
        <Screen solBalance={sol} usdcBalance={usdc}>
            <Text bold color={theme.colors.primary}>Send {token}</Text>

            {step === 'token' && (
                <Menu
                    title="Select token:"
                    items={[
                        { label: 'SOL', value: 'SOL' },
                        { label: 'USDC', value: 'USDC' },
                        { label: 'Back', value: 'back' },
                    ]}
                    onSelect={handleTokenSelect}
                />
            )}

            {step === 'recipient' && (
                <TextPrompt
                    label="Recipient address"
                    placeholder="Solana public key..."
                    onSubmit={handleRecipient}
                    validate={validateAddress}
                />
            )}

            {step === 'amount' && (
                <TextPrompt
                    label={`Amount (${token})`}
                    placeholder={`Max: ${token === 'SOL' ? sol.toFixed(4) : usdc.toFixed(2)}`}
                    onSubmit={handleAmount}
                    validate={validateAmount}
                />
            )}

            {step === 'confirm' && (
                <Box flexDirection="column">
                    <Text>Send <Text bold>{amount} {token}</Text> to <Text color={theme.colors.secondary}>{recipient.slice(0, 12)}...</Text>?</Text>
                    <Confirm
                        message="Confirm transaction?"
                        onConfirm={() => void handleConfirm()}
                        onCancel={() => setStep('token')}
                    />
                </Box>
            )}

            {step === 'sending' && <Spinner label="Sending transaction..." />}

            {step === 'done' && (
                <Box flexDirection="column">
                    {result?.type === 'success' && <SuccessMessage message={result.text} />}
                    {result?.type === 'error' && <ErrorMessage message={result.text} />}
                    <Menu items={[
                        { label: 'Send another', value: 'again' },
                        { label: 'Back', value: 'back' },
                    ]} onSelect={(item) => {
                        if (item.value === 'again') { setStep('token'); setResult(null); }
                        else pop();
                    }} />
                </Box>
            )}
        </Screen>
    );
}
