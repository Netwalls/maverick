import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Keypair, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Screen } from '../layout/Screen.js';
import { Menu } from '../shared/Menu.js';
import type { MenuItem } from '../shared/Menu.js';
import { TextPrompt } from '../shared/TextPrompt.js';
import { SuccessMessage } from '../shared/SuccessMessage.js';
import { ErrorMessage } from '../shared/ErrorMessage.js';
import { useServices } from '../../context/ServicesContext.js';
import { useNavigation } from '../../context/NavigationContext.js';
import { MaverickAgent } from '../../../agents/maverickAgent.js';
import { WalletManager } from '../../../core/walletManager.js';
import { theme } from '../../theme.js';

type Step = 'name' | 'type' | 'done';

export function InviteScreen() {
    const { agents, connection, bank, addAgent } = useServices();
    const { pop } = useNavigation();
    const [step, setStep] = useState<Step>('name');
    const [name, setName] = useState('');
    const [agentType, setAgentType] = useState('trader');
    const [result, setResult] = useState<{ publicKey: string; secretKey: string } | null>(null);
    const [error, setError] = useState('');

    const handleCreate = (type: string) => {
        setAgentType(type);
        try {
            const envKey = `${name.toUpperCase()}_PRIVATE_KEY`;
            const typeKey = `${name.toUpperCase()}_TYPE`;

            // Check if already exists
            dotenv.config();
            if (process.env[envKey]) {
                setError(`Maverick '${name}' already exists.`);
                setStep('done');
                return;
            }

            // Generate keypair
            const keypair = Keypair.generate();
            const secretKey = bs58.encode(keypair.secretKey);
            const publicKey = keypair.publicKey.toBase58();

            // Write to .env
            const envPath = path.join(process.cwd(), '.env');
            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
            const newEntries = `\n${envKey}=${secretKey}\n${typeKey}=${type}\n`;
            const newContent = envContent.endsWith('\n') || envContent === '' ? `${envContent}${newEntries}` : `${envContent}\n${newEntries}`;
            fs.writeFileSync(envPath, newContent);

            // Also set in process.env so it's immediately available
            process.env[envKey] = secretKey;
            process.env[typeKey] = type;

            // Create wallet and agent, add to live services
            const wallet = new WalletManager(connection, secretKey, envKey);
            const target = new PublicKey('GfvXqVpM6X9mYh9f8B7xYv7zJkL5n7m5kGv5G5G5G5G5');
            const agent = new MaverickAgent(connection, wallet, target, bank, name);
            bank.addParticipant(wallet);
            addAgent({ name, agent, wallet });

            setResult({ publicKey, secretKey });
            setStep('done');
        } catch (e: any) {
            setError(`Failed to create agent: ${e.message ?? e}`);
            setStep('done');
        }
    };

    return (
        <Screen>
            <Text bold color={theme.colors.primary}>Invite a Friend to Maverick</Text>

            {step === 'name' && (
                <TextPrompt
                    label="Agent name"
                    placeholder="e.g. Delta"
                    onSubmit={(val) => { setName(val); setStep('type'); }}
                    validate={(v) => {
                        if (!v.trim()) return 'Name cannot be empty';
                        if (v.includes(' ')) return 'No spaces allowed';
                        return null;
                    }}
                />
            )}

            {step === 'type' && (
                <Menu
                    title={`Type for ${name}:`}
                    items={[
                        { label: 'Trader', value: 'trader' },
                        { label: 'Prediction Bot', value: 'predbot' },
                        { label: 'Cancel', value: 'cancel' },
                    ]}
                    onSelect={(item) => {
                        if (item.value === 'cancel') { pop(); return; }
                        handleCreate(item.value);
                    }}
                />
            )}

            {step === 'done' && (
                <Box flexDirection="column">
                    {error ? (
                        <ErrorMessage message={error} />
                    ) : result ? (
                        <Box flexDirection="column">
                            <SuccessMessage message={`Maverick '${name}' created and added to ecosystem!`} />
                            <Box marginY={1} flexDirection="column">
                                <Text>Name:       <Text color={theme.colors.secondary}>{name}</Text></Text>
                                <Text>Type:       <Text>{agentType.toUpperCase()}</Text></Text>
                                <Text>Public Key: <Text color={theme.colors.primary}>{result.publicKey}</Text></Text>
                                <Text dimColor>{'─'.repeat(50)}</Text>
                                <Text>Share this secret key with your friend:</Text>
                                <Text bold>{result.secretKey}</Text>
                            </Box>
                        </Box>
                    ) : null}
                    <Menu items={[
                        { label: 'Invite another', value: 'again' },
                        { label: 'Back', value: 'back' },
                    ]} onSelect={(item) => {
                        if (item.value === 'again') { setStep('name'); setResult(null); setError(''); }
                        else pop();
                    }} />
                </Box>
            )}
        </Screen>
    );
}
