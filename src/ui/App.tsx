import React, { useState } from 'react';
import { Box, useApp, useInput } from 'ink';
import { ServicesProvider, useServices } from './context/ServicesContext.js';
import type { Services } from './context/ServicesContext.js';
import { NavigationProvider, useNavigation } from './context/NavigationContext.js';
import { HomeScreen } from './components/screens/HomeScreen.js';
import { WalletScreen } from './components/screens/WalletScreen.js';
import { SendScreen } from './components/screens/SendScreen.js';
import { SwapScreen } from './components/screens/SwapScreen.js';
import { BankScreen } from './components/screens/BankScreen.js';
import { BankActionScreen } from './components/screens/BankActionScreen.js';
import { MarketsScreen } from './components/screens/MarketsScreen.js';
import { MarketListScreen } from './components/screens/MarketListScreen.js';
import { BetScreen } from './components/screens/BetScreen.js';
import { PortfolioScreen } from './components/screens/PortfolioScreen.js';
import { AgentsScreen } from './components/screens/AgentsScreen.js';
import { AgentDetailScreen } from './components/screens/AgentDetailScreen.js';
import { InviteScreen } from './components/screens/InviteScreen.js';
import { GovernanceScreen } from './components/screens/GovernanceScreen.js';
import { GovernanceDetailScreen } from './components/screens/GovernanceDetailScreen.js';
import { HistoryScreen } from './components/screens/HistoryScreen.js';
import { SettingsScreen } from './components/screens/SettingsScreen.js';
import { RequestFundsScreen } from './components/screens/RequestFundsScreen.js';
import { VoiceIndicator } from './components/shared/VoiceIndicator.js';
import { useVoice } from './hooks/useVoice.js';

function Router() {
    const { current, push, pop, reset } = useNavigation();
    const services = useServices();
    const { exit } = useApp();
    const voice = useVoice(services, { push, reset });

    useInput((input, key) => {
        if (input === 'q' && current.name === 'home') {
            exit();
            process.exit(0);
        }
        if (input === 'b' && key.ctrl && current.name !== 'home') {
            pop();
        }
        if (input === 'v' && !key.ctrl && !key.meta) {
            voice.activate();
        }
    });

    const screen = (() => {
        switch (current.name) {
            case 'home': return <HomeScreen />;
            case 'wallet': return <WalletScreen />;
            case 'send': return <SendScreen />;
            case 'swap': return <SwapScreen />;
            case 'bank': return <BankScreen />;
            case 'bankAction': return <BankActionScreen />;
            case 'markets': return <MarketsScreen />;
            case 'marketList': return <MarketListScreen />;
            case 'bet': return <BetScreen />;
            case 'portfolio': return <PortfolioScreen />;
            case 'agents': return <AgentsScreen />;
            case 'agentDetail': return <AgentDetailScreen />;
            case 'invite': return <InviteScreen />;
            case 'governance': return <GovernanceScreen />;
            case 'governanceDetail': return <GovernanceDetailScreen />;
            case 'history': return <HistoryScreen />;
            case 'settings': return <SettingsScreen />;
            case 'requestFunds': return <RequestFundsScreen />;
            default: return <HomeScreen />;
        }
    })();

    return (
        <Box flexDirection="column">
            {voice.available && <VoiceIndicator state={voice.state} response={voice.lastResponse} />}
            {screen}
        </Box>
    );
}

export function App({ services }: { services: Omit<Services, 'activeAgentIndex' | 'setActiveAgentIndex'> }) {
    const [activeAgentIndex, setActiveAgentIndex] = useState(0);

    const fullServices: Services = {
        ...services,
        activeAgentIndex,
        setActiveAgentIndex,
    };

    return (
        <ServicesProvider value={fullServices}>
            <NavigationProvider>
                <Router />
            </NavigationProvider>
        </ServicesProvider>
    );
}
