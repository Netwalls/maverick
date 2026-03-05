import React, { createContext, useContext, useState, useCallback } from 'react';

export type ScreenName =
    | 'home'
    | 'wallet'
    | 'send'
    | 'swap'
    | 'bank'
    | 'bankAction'
    | 'markets'
    | 'marketList'
    | 'bet'
    | 'portfolio'
    | 'agents'
    | 'agentDetail'
    | 'invite'
    | 'governance'
    | 'governanceDetail'
    | 'history'
    | 'settings'
    | 'requestFunds';

export interface ScreenEntry {
    name: ScreenName;
    label: string;
    params?: Record<string, unknown>;
}

interface NavigationState {
    stack: ScreenEntry[];
    current: ScreenEntry;
    breadcrumbs: string[];
    push: (name: ScreenName, label: string, params?: Record<string, unknown>) => void;
    pop: () => void;
    reset: () => void;
}

const HOME_ENTRY: ScreenEntry = { name: 'home', label: 'Home' };

const NavigationContext = createContext<NavigationState | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
    const [stack, setStack] = useState<ScreenEntry[]>([HOME_ENTRY]);

    const current = stack[stack.length - 1] ?? HOME_ENTRY;
    const breadcrumbs = stack.map(s => s.label);

    const push = useCallback((name: ScreenName, label: string, params?: Record<string, unknown>) => {
        const entry: ScreenEntry = params ? { name, label, params } : { name, label };
        setStack(prev => [...prev, entry]);
    }, []);

    const pop = useCallback(() => {
        setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
    }, []);

    const reset = useCallback(() => {
        setStack([HOME_ENTRY]);
    }, []);

    return (
        <NavigationContext.Provider value={{ stack, current, breadcrumbs, push, pop, reset }}>
            {children}
        </NavigationContext.Provider>
    );
}

export function useNavigation() {
    const ctx = useContext(NavigationContext);
    if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
    return ctx;
}
