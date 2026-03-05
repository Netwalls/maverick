import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
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
import { theme } from '../../theme.js';

type Step = 'direction' | 'amount' | 'quote' | 'executing' | 'done';

export function SwapScreen() {
    const { agents, connection, amm, activeAgentIndex, vaultManager } = useServices();
    const { pop } = useNavigation();

    const [step, setStep] = useState<Step>('direction');
    const [direction, setDirection] = useState<'SOL' | 'USDC'>('SOL');
    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState(0);
    const [jupiterQuote, setJupiterQuote] = useState(0);
    const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const agent = agents[activeAgentIndex];
    const { sol, usdc } = useBalance(agent?.wallet ?? null, connection);

    // Vault (AJO Bank) balance to check liquidity
    const vaultBal = useBalance(vaultManager.getWallet(), connection, 15000);

    useEffect(() => {
        if (amount && parseFloat(amount) > 0) {
            const q = amm.getSwapQuote(direction, parseFloat(amount));
            setQuote(q);
            // Simulated Jupiter quote
            const jupPrice = 145.5;
            if (direction === 'SOL') {
                setJupiterQuote(parseFloat(amount) * jupPrice * 0.99);
            } else {
                setJupiterQuote((parseFloat(amount) / jupPrice) * 0.99);
            }
        }
    }, [amount, direction, amm]);

    if (!agent) {
        return <Screen><Text>No agents found.</Text></Screen>;
    }

    const outputToken = direction === 'SOL' ? 'USDC' : 'SOL';

    const handleExecute = async () => {
        setStep('executing');
        try {
            const output = await amm.swap(agent.wallet, direction, parseFloat(amount));
            if (output > 0) {
                setResult({ type: 'success', text: `Swapped ${amount} ${direction} for ${output.toFixed(4)} ${outputToken}` });
            } else {
                setResult({ type: 'error', text: 'Swap failed: insufficient liquidity in pool.' });
            }
        } catch (e: any) {
            setResult({ type: 'error', text: `Swap failed: ${e.message ?? e}` });
        }
        setStep('done');
    };

    const validateAmount = (val: string) => {
        const n = parseFloat(val);
        if (isNaN(n) || n <= 0) return 'Enter a positive number';
        if (direction === 'SOL' && n > sol) return `Insufficient SOL (${sol.toFixed(4)})`;
        if (direction === 'USDC' && n > usdc) return `Insufficient USDC (${usdc.toFixed(2)})`;
        return null;
    };

    const poolStats = amm.getPoolStats();
    const vaultLowSol = vaultBal.sol < 0.01;
    const vaultLowUsdc = vaultBal.usdc < 0.01;
    const vaultEmpty = vaultLowSol && vaultLowUsdc;

    return (
        <Screen solBalance={sol} usdcBalance={usdc}>
            <Text bold color={theme.colors.primary}>Swap via AJO Bank AMM</Text>

            {/* Vault liquidity status */}
            <Box flexDirection="column" marginBottom={1}>
                <Text>Pool: <Text color={theme.colors.success}>{vaultBal.sol.toFixed(4)} SOL</Text> / <Text color={theme.colors.primary}>{vaultBal.usdc.toFixed(2)} USDC</Text></Text>
                {vaultEmpty && (
                    <Box flexDirection="column" borderStyle="single" borderColor={theme.colors.error} paddingX={1} marginTop={1}>
                        <Text bold color={theme.colors.error}>Swap unavailable — AJO Bank has no liquidity</Text>
                        <Text dimColor>Fund the vault or add liquidity to enable swaps.</Text>
                    </Box>
                )}
                {!vaultEmpty && vaultLowSol && (
                    <Text color={theme.colors.warning}>Low SOL in pool — USDC to SOL swaps may fail</Text>
                )}
                {!vaultEmpty && vaultLowUsdc && (
                    <Text color={theme.colors.warning}>Low USDC in pool — SOL to USDC swaps may fail</Text>
                )}
            </Box>

            {step === 'direction' && (
                <Menu
                    title="Swap direction:"
                    items={[
                        { label: 'SOL -> USDC', value: 'SOL' },
                        { label: 'USDC -> SOL', value: 'USDC' },
                        { label: 'Back', value: 'back' },
                    ]}
                    onSelect={(item) => {
                        if (item.value === 'back') { pop(); return; }
                        setDirection(item.value as 'SOL' | 'USDC');
                        setStep('amount');
                    }}
                />
            )}

            {step === 'amount' && (
                <TextPrompt
                    label={`Amount (${direction})`}
                    placeholder={`Max: ${direction === 'SOL' ? sol.toFixed(4) : usdc.toFixed(2)}`}
                    onSubmit={(val) => { setAmount(val); setStep('quote'); }}
                    validate={validateAmount}
                />
            )}

            {step === 'quote' && (
                <Box flexDirection="column">
                    <Text bold>Quote Preview:</Text>
                    <Text> {amount} {direction} -&gt; {quote.toFixed(4)} {outputToken}</Text>
                    <Box marginTop={1} flexDirection="column">
                        <Text>
                            <Text> AJO Bank: </Text>
                            <Text color={quote >= jupiterQuote ? 'green' : 'gray'}>{quote.toFixed(4)} {outputToken}</Text>
                            {quote >= jupiterQuote && <Text color="green"> Best</Text>}
                        </Text>
                        <Text>
                            <Text> Jupiter:  </Text>
                            <Text color={jupiterQuote > quote ? 'green' : 'gray'}>{jupiterQuote.toFixed(4)} {outputToken}</Text>
                            {jupiterQuote > quote && <Text color="green"> Best</Text>}
                        </Text>
                    </Box>
                    <Box marginTop={1}>
                        <Confirm
                            message="Execute swap?"
                            onConfirm={() => void handleExecute()}
                            onCancel={() => setStep('direction')}
                        />
                    </Box>
                </Box>
            )}

            {step === 'executing' && <Spinner label="Executing swap..." />}

            {step === 'done' && (
                <Box flexDirection="column">
                    {result?.type === 'success' && <SuccessMessage message={result.text} />}
                    {result?.type === 'error' && <ErrorMessage message={result.text} />}
                    <Menu items={[
                        { label: 'Swap again', value: 'again' },
                        { label: 'Back', value: 'back' },
                    ]} onSelect={(item) => {
                        if (item.value === 'again') { setStep('direction'); setResult(null); }
                        else pop();
                    }} />
                </Box>
            )}
        </Screen>
    );
}
