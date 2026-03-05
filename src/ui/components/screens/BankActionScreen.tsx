import React, { useState } from 'react';
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
import { theme } from '../../theme.js';

type Step = 'amount' | 'confirm' | 'executing' | 'done';

export function BankActionScreen() {
    const { agents, bank, activeAgentIndex } = useServices();
    const { pop, current } = useNavigation();
    const action = (current.params?.action as string) ?? 'deposit';
    const agent = agents[activeAgentIndex];

    const [step, setStep] = useState<Step>(action === 'repay' ? 'confirm' : 'amount');
    const [amount, setAmount] = useState('');
    const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    if (!agent) {
        return <Screen><Text>No agent selected.</Text></Screen>;
    }

    const actionLabels: Record<string, string> = {
        deposit: 'Deposit SOL into Vault',
        withdraw: 'Withdraw from Vault',
        loan: 'Request Loan',
        repay: 'Repay Outstanding Loan',
    };

    const handleExecute = async () => {
        setStep('executing');
        try {
            if (action === 'deposit') {
                await bank.deposit(agent.wallet, parseFloat(amount));
                setResult({ type: 'success', text: `Deposited ${amount} SOL into AJO Bank vault.` });
            } else if (action === 'withdraw') {
                const ok = await bank.withdraw(agent.wallet, parseFloat(amount));
                setResult(ok
                    ? { type: 'success', text: `Withdrew ${amount} SOL from vault.` }
                    : { type: 'error', text: 'Withdrawal denied. Check debt or contribution limits.' }
                );
            } else if (action === 'loan') {
                const ok = await bank.requestLoan(agent.wallet, parseFloat(amount));
                setResult(ok
                    ? { type: 'success', text: `Loan of ${amount} SOL granted!` }
                    : { type: 'error', text: 'Loan denied. Insufficient vault liquidity or existing debt.' }
                );
            } else if (action === 'repay') {
                await bank.payback(agent.wallet);
                setResult({ type: 'success', text: 'Loan repaid successfully.' });
            }
        } catch (e: any) {
            setResult({ type: 'error', text: `Action failed: ${e.message ?? e}` });
        }
        setStep('done');
    };

    const validateAmount = (val: string) => {
        const n = parseFloat(val);
        if (isNaN(n) || n <= 0) return 'Enter a positive number';
        return null;
    };

    return (
        <Screen>
            <Text bold color={theme.colors.primary}>{actionLabels[action] ?? action}</Text>

            {step === 'amount' && (
                <TextPrompt
                    label="Amount (SOL)"
                    placeholder="e.g. 0.5"
                    onSubmit={(val) => { setAmount(val); setStep('confirm'); }}
                    validate={validateAmount}
                />
            )}

            {step === 'confirm' && (
                <Confirm
                    message={action === 'repay' ? 'Repay outstanding loan?' : `${action} ${amount} SOL?`}
                    onConfirm={() => void handleExecute()}
                    onCancel={pop}
                />
            )}

            {step === 'executing' && <Spinner label="Processing..." />}

            {step === 'done' && (
                <Box flexDirection="column">
                    {result?.type === 'success' && <SuccessMessage message={result.text} />}
                    {result?.type === 'error' && <ErrorMessage message={result.text} />}
                    <Menu items={[{ label: 'Back to Bank', value: 'back' }]} onSelect={pop} />
                </Box>
            )}
        </Screen>
    );
}
