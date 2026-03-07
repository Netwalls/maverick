import { useState, useEffect, useCallback } from 'react';
import type { WalletManager } from '../../core/walletManager';
import type { Connection } from '@solana/web3.js';
import { TokenService } from '../../core/tokenService';
import { useInterval } from './useInterval';

export function useBalance(wallet: WalletManager | null, connection: Connection, refreshMs = 10000) {
    const [sol, setSol] = useState(0);
    const [usdc, setUsdc] = useState(0);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!wallet) return;
        try {
            const solBal = await wallet.getBalance();
            setSol(solBal);
            const usdcMint = await TokenService.getUSDCAddress(connection);
            const usdcBal = await TokenService.getTokenBalance(connection, wallet.getPublicKey(), usdcMint);
            setUsdc(usdcBal);
        } catch {
            // ignore fetch errors
        } finally {
            setLoading(false);
        }
    }, [wallet, connection]);

    useEffect(() => { void refresh(); }, [refresh]);
    useInterval(() => { void refresh(); }, refreshMs);

    return { sol, usdc, loading, refresh };
}
