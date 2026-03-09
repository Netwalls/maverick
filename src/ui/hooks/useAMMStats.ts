import { useState, useEffect, useCallback } from 'react';
import type { MaverickAMM } from '../../protocols/maverickAMM';
import type { RemoteMaverickAMM } from '../../api/RemoteMaverickAMM';
import { useInterval } from './useInterval';

interface AMMStats {
    sol: number;
    usdc: number;
    lpCount: number;
    price: number;
}

export function useAMMStats(amm: MaverickAMM | RemoteMaverickAMM, refreshMs = 5000) {
    const [stats, setStats] = useState<AMMStats>({ sol: 0, usdc: 0, lpCount: 0, price: 0 });

    const refresh = useCallback(() => {
        const s = amm.getPoolStats();
        setStats(s);
    }, [amm]);

    useEffect(() => { refresh(); }, [refresh]);
    useInterval(refresh, refreshMs);

    return stats;
}
