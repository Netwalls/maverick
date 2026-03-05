import { useState, useCallback, useEffect, useRef } from 'react';
import type { Services } from '../context/ServicesContext.js';
import type { ScreenName } from '../context/NavigationContext.js';
import {
    isAvailable,
    initVoiceService,
    record,
    transcribe,
    parseIntent,
    speak,
} from '../../voice/index.js';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceHook {
    state: VoiceState;
    lastResponse: string;
    available: boolean;
    activate: () => void;
}

interface NavigationActions {
    push: (name: ScreenName, label: string, params?: Record<string, unknown>) => void;
    reset: () => void;
}

const SCREEN_LABELS: Record<string, string> = {
    home: 'Home', wallet: 'Wallet', send: 'Send', swap: 'Swap',
    bank: 'AJO Bank', markets: 'Markets', portfolio: 'Portfolio',
    agents: 'Agents', history: 'History', settings: 'Settings',
    governance: 'Governance', invite: 'Invite',
};

export function useVoice(services: Services, nav: NavigationActions): VoiceHook {
    const [state, setState] = useState<VoiceState>('idle');
    const [lastResponse, setLastResponse] = useState('');
    const [available, setAvailable] = useState(false);
    const busyRef = useRef(false);

    useEffect(() => {
        const hasSox = isAvailable();
        const apiKey = process.env['GEMINI_API_KEY'] ?? '';
        if (hasSox && apiKey) {
            setAvailable(initVoiceService(apiKey));
        }
    }, []);

    const activate = useCallback(() => {
        if (!available || busyRef.current) return;
        busyRef.current = true;
        setState('listening');
        setLastResponse('');

        const agentName = services.agents[services.activeAgentIndex]?.name ?? 'friend';
        const agent = services.agents[services.activeAgentIndex];

        record((wavPath) => {
            setState('processing');

            void (async () => {
                try {
                    if (!wavPath) throw new Error('No audio');

                    // 1. Transcribe speech
                    const transcript = await transcribe(wavPath);

                    // 2. Parse intent with Gemini
                    const intent = await parseIntent(transcript);
                    let response = '';

                    switch (intent.action) {
                        case 'greeting':
                            response = `Hey ${agentName}, what can I do for you?`;
                            break;

                        case 'navigate': {
                            const screen = intent.screen as ScreenName | undefined;
                            if (screen === 'home') {
                                nav.reset();
                                response = `Hey ${agentName}, going home`;
                            } else if (screen && SCREEN_LABELS[screen]) {
                                nav.push(screen, SCREEN_LABELS[screen]!);
                                response = `Hey ${agentName}, opening ${SCREEN_LABELS[screen]}`;
                            } else {
                                response = `Hey ${agentName}, I'm not sure which screen you mean`;
                            }
                            break;
                        }

                        case 'balance': {
                            if (agent) {
                                try {
                                    const solBal = await agent.wallet.getBalance();
                                    response = `Hey ${agentName}, you have ${solBal.toFixed(4)} SOL`;
                                } catch {
                                    response = `Hey ${agentName}, couldn't fetch balance right now`;
                                }
                            }
                            break;
                        }

                        case 'airdrop': {
                            if (agent) {
                                try {
                                    await agent.wallet.airdrop(1);
                                    response = `Hey ${agentName}, airdrop of 1 SOL confirmed!`;
                                } catch {
                                    response = `Hey ${agentName}, airdrop failed, try again later`;
                                }
                            }
                            break;
                        }

                        case 'trade_count': {
                            const history = services.history.getHistory();
                            const addr = agent?.wallet.getPublicKey().toBase58() ?? '';
                            const bets = history.filter(h => h.agentAddress === addr && h.action === 'BET');
                            const trades = history.filter(h => h.agentAddress === addr && (h.action === 'TRADE' || h.action === 'SWAP'));
                            const total = bets.length + trades.length;
                            response = `Hey ${agentName}, you have ${bets.length} open bets and ${trades.length} trades, ${total} total`;
                            break;
                        }

                        case 'recent_activity': {
                            const history = services.history.getHistory();
                            const addr = agent?.wallet.getPublicKey().toBase58() ?? '';
                            const recent = history.filter(h => h.agentAddress === addr).slice(-3);
                            if (recent.length === 0) {
                                response = `Hey ${agentName}, you have no recent activity`;
                            } else {
                                const items = recent.map(h => h.description).join('. ');
                                response = `Hey ${agentName}, your recent activity: ${items}`;
                            }
                            break;
                        }

                        case 'place_bet':
                            nav.push('markets', 'Markets');
                            response = `Hey ${agentName}, opening Markets so you can place a bet`;
                            break;

                        case 'send_funds':
                            nav.push('send', 'Send');
                            response = `Hey ${agentName}, opening Send screen`;
                            break;

                        case 'swap_tokens':
                            nav.push('swap', 'Swap');
                            response = `Hey ${agentName}, opening Swap screen`;
                            break;

                        case 'deposit':
                            nav.push('bank', 'AJO Bank');
                            response = `Hey ${agentName}, opening AJO Bank for deposit`;
                            break;

                        case 'loan':
                            nav.push('bank', 'AJO Bank');
                            response = `Hey ${agentName}, opening AJO Bank for loans`;
                            break;

                        case 'agent_info': {
                            const count = services.agents.length;
                            const names = services.agents.map(a => a.name).join(', ');
                            response = `Hey ${agentName}, you have ${count} agents: ${names}`;
                            break;
                        }

                        default:
                            response = `Hey ${agentName}, I didn't get that. Try asking about your balance, trades, or say place a bet`;
                            break;
                    }

                    setLastResponse(response);
                    setState('speaking');
                    await speak(response);
                } catch {
                    const msg = `Hey ${agentName}, sorry I didn't catch that`;
                    setLastResponse(msg);
                    setState('speaking');
                    await speak(msg);
                } finally {
                    busyRef.current = false;
                    setTimeout(() => setState('idle'), 3000);
                }
            })();
        });
    }, [available, services, nav]);

    return { state, lastResponse, available, activate };
}
