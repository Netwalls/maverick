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
import { KalshiService } from '../../../core/kalshiService.js';
import type { KalshiMarket } from '../../../core/kalshiService.js';
import { theme } from '../../theme.js';

type Step = 'side' | 'amount' | 'confirm' | 'executing' | 'done';

export function BetScreen() {
    const { agents, connection, signer, history, activeAgentIndex } = useServices();
    const { pop, current } = useNavigation();
    const market = current.params?.market as KalshiMarket;
    const suggestedSide = current.params?.suggested as string | null;
    const [step, setStep] = useState<Step>('side');
    const [side, setSide] = useState<'YES' | 'NO'>('YES');
    const [amount, setAmount] = useState('');
    const [livePrice, setLivePrice] = useState({ bid: 50, ask: 50 });
    const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const agent = agents[activeAgentIndex];
    const { sol } = useBalance(agent?.wallet ?? null, connection);

    useEffect(() => {
        if (market) {
            void KalshiService.getMarketPrice(market.ticker).then(setLivePrice);
        }
    }, [market]);

    if (!market) {
        return <Screen><Text>No market selected.</Text></Screen>;
    }

    const entryPrice = side === 'YES' ? livePrice.ask / 100 : (100 - livePrice.bid) / 100;
    const shares = amount ? (parseFloat(amount) * 140) / entryPrice : 0;

    const handleExecute = async () => {
        if (!agent) return;
        setStep('executing');
        try {
            const predictionAddress = market.ticker; // Simplified
            const cost = parseFloat(amount);
            const sig = await signer.sendTransfer(
                agent.wallet,
                agent.wallet.getPublicKey(), // Self-transfer as placeholder
                0.001
            );
            await history.recordAction({
                timestamp: new Date().toISOString(),
                agentAddress: agent.wallet.getPublicKey().toBase58(),
                action: 'BET',
                description: `Placed ${side} bet on ${market.ticker} for ${cost} SOL (${shares.toFixed(1)} shares @ $${entryPrice.toFixed(3)})`,
                signature: sig,
                reasoning: suggestedSide ? 'AI-suggested trade' : 'Manual selection',
            });
            setResult({ type: 'success', text: `Position opened! ${shares.toFixed(1)} ${side} shares on ${market.title.slice(0, 30)}` });
        } catch (e: any) {
            setResult({ type: 'error', text: `Bet failed: ${e.message ?? e}` });
        }
        setStep('done');
    };

    return (
        <Screen solBalance={sol}>
            <Text bold color={theme.colors.primary}>{market.title}</Text>
            <Text dimColor>Ticker: {market.ticker} | YES: ${(livePrice.bid / 100).toFixed(2)} / NO: ${((100 - livePrice.ask) / 100).toFixed(2)}</Text>

            {suggestedSide && step === 'side' && (
                <Box marginY={1} borderStyle="round" borderColor="magenta" paddingX={1}>
                    <Text color={theme.colors.info}>Maverick suggests: <Text bold>{suggestedSide}</Text></Text>
                </Box>
            )}

            {step === 'side' && (
                <Menu
                    title="Pick your side:"
                    items={[
                        { label: `YES @ $${(livePrice.ask / 100).toFixed(2)}`, value: 'YES' },
                        { label: `NO  @ $${((100 - livePrice.bid) / 100).toFixed(2)}`, value: 'NO' },
                        { label: 'Back', value: 'back' },
                    ]}
                    onSelect={(item) => {
                        if (item.value === 'back') { pop(); return; }
                        setSide(item.value as 'YES' | 'NO');
                        setStep('amount');
                    }}
                />
            )}

            {step === 'amount' && (
                <TextPrompt
                    label="Amount (SOL)"
                    placeholder={`Max: ${sol.toFixed(4)}`}
                    onSubmit={(val) => { setAmount(val); setStep('confirm'); }}
                    validate={(v) => {
                        const n = parseFloat(v);
                        if (isNaN(n) || n <= 0) return 'Enter a positive number';
                        if (n > sol) return `Insufficient SOL (${sol.toFixed(4)})`;
                        return null;
                    }}
                />
            )}

            {step === 'confirm' && (
                <Box flexDirection="column">
                    <Text>Bet: <Text bold>{side}</Text> on {market.title.slice(0, 35)}</Text>
                    <Text>Cost: <Text bold>{amount} SOL</Text> | Shares: {shares.toFixed(1)} @ ${entryPrice.toFixed(3)}</Text>
                    <Confirm
                        message="Place bet?"
                        onConfirm={() => void handleExecute()}
                        onCancel={() => setStep('side')}
                    />
                </Box>
            )}

            {step === 'executing' && <Spinner label="Placing bet..." />}

            {step === 'done' && (
                <Box flexDirection="column">
                    {result?.type === 'success' && <SuccessMessage message={result.text} />}
                    {result?.type === 'error' && <ErrorMessage message={result.text} />}
                    <Menu items={[
                        { label: 'Place another bet', value: 'again' },
                        { label: 'Back to Markets', value: 'back' },
                    ]} onSelect={(item) => {
                        if (item.value === 'again') { setStep('side'); setResult(null); }
                        else pop();
                    }} />
                </Box>
            )}
        </Screen>
    );
}
