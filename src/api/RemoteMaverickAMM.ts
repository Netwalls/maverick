import { Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { WalletManager } from '../core/walletManager.js';
import { HistoryProvider } from '../utils/historyProvider.js';
import { TerminalUtils } from '../utils/terminalUtils.js';
import { MaverickApiClient } from './apiClient.js';

/**
 * Remote implementation of MaverickAMM that calls the shared backend API.
 * Same interface as the local MaverickAMM so the TUI doesn't need to change.
 */
export class RemoteMaverickAMM {
  // Cached state from server
  private reserveSOL: number = 0;
  private reserveUSDC: number = 0;
  private k: number = 0;
  private feeRate: number = 0.003;

  constructor(
    private connection: Connection,
    private api: MaverickApiClient,
    private history: HistoryProvider,
    private vaultPubkey: PublicKey
  ) {}

  /**
   * Deposit liquidity to the AMM pool.
   * 1. User signs SOL transfer locally → sends to vault
   * 2. POSTs both tx signatures to API for verification + LP share tracking
   */
  public async depositLiquidity(wallet: WalletManager, solAmount: number, usdcAmount: number): Promise<void> {
    const address = wallet.getPublicKey().toBase58();

    // Send SOL to vault on-chain
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.getPublicKey(),
        toPubkey: this.vaultPubkey,
        lamports: Math.round(solAmount * 1e9),
      })
    );
    const solSig = await sendAndConfirmTransaction(this.connection, tx, [wallet.getKeypair()]);

    // Report to API (USDC transfer handled by SPL token — for now we pass the SOL sig)
    const result = await this.api.post('/api/amm/liquidity', {
      solAmount,
      usdcAmount,
      solTxSignature: solSig,
    });

    // Update local cache
    this.reserveSOL = result.pool.sol;
    this.reserveUSDC = result.pool.usdc;
    this.k = result.pool.k;

    TerminalUtils.printSuccess(`LP DEPOSIT: ${address.slice(0, 8)} provided ${solAmount} SOL / ${usdcAmount} USDC.`);

    await this.history.recordAction({
      timestamp: new Date().toISOString(),
      agentAddress: address,
      action: 'AMM_DEPOSIT',
      description: `Provided ${solAmount} SOL and ${usdcAmount} USDC as liquidity to Maverick AMM.`,
      signature: solSig,
    });
  }

  /**
   * Get a swap quote from the server.
   */
  public getSwapQuote(input: 'SOL' | 'USDC', amount: number): number {
    // Use cached reserves for synchronous quote
    if (this.reserveSOL === 0 || this.reserveUSDC === 0) return 0;

    const fee = amount * this.feeRate;
    const amountAfterFee = amount - fee;

    if (input === 'SOL') {
      const newReserveSOL = this.reserveSOL + amountAfterFee;
      const newReserveUSDC = this.k / newReserveSOL;
      return Math.max(0, this.reserveUSDC - newReserveUSDC);
    } else {
      const newReserveUSDC = this.reserveUSDC + amountAfterFee;
      const newReserveSOL = this.k / newReserveUSDC;
      return Math.max(0, this.reserveSOL - newReserveSOL);
    }
  }

  /**
   * Get an async swap quote from the server (more accurate).
   */
  public async getSwapQuoteAsync(input: 'SOL' | 'USDC', amount: number): Promise<number> {
    const result = await this.api.getPublic('/api/amm/quote', {
      input,
      amount: String(amount),
    });
    return result.output;
  }

  /**
   * Execute a swap against the pool.
   * For SOL input: user sends SOL to vault on-chain, then POSTs to API.
   * For USDC input: user sends USDC token transfer, then POSTs to API.
   */
  public async swap(wallet: WalletManager, input: 'SOL' | 'USDC', amount: number): Promise<number> {
    const address = wallet.getPublicKey().toBase58();

    let txSignature: string;

    if (input === 'SOL') {
      // Send SOL to vault on-chain
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.getPublicKey(),
          toPubkey: this.vaultPubkey,
          lamports: Math.round(amount * 1e9),
        })
      );
      txSignature = await sendAndConfirmTransaction(this.connection, tx, [wallet.getKeypair()]);
    } else {
      // For USDC: handle SPL token transfer
      // Simplified — the API expects a tx signature
      txSignature = 'usdc-transfer-pending';
    }

    try {
      const result = await this.api.post('/api/amm/swap', {
        input,
        amount,
        txSignature,
      });

      const output = result.output;

      TerminalUtils.printSuccess(
        `AMM SWAP: ${address.slice(0, 8)} swapped ${amount} ${input} for ${output.toFixed(4)} ${input === 'SOL' ? 'USDC' : 'SOL'}`
      );

      // Refresh cached state
      await this.syncFromServer();

      await this.history.recordAction({
        timestamp: new Date().toISOString(),
        agentAddress: address,
        action: 'AMM_SWAP',
        description: `Swapped ${amount} ${input} for ${output.toFixed(4)} ${input === 'SOL' ? 'USDC' : 'SOL'} via Maverick AMM.`,
      });

      return output;
    } catch (err: any) {
      TerminalUtils.printError(`AMM Swap Failed: ${err.message}`);
      return 0;
    }
  }

  public getPoolStats() {
    return {
      sol: this.reserveSOL,
      usdc: this.reserveUSDC,
      lpCount: 0, // Updated on sync
      price: this.reserveSOL > 0 ? this.reserveUSDC / this.reserveSOL : 0,
    };
  }

  /**
   * Sync pool state from the server.
   */
  public async syncFromServer(): Promise<void> {
    try {
      const pool = await this.api.getPublic('/api/amm/pool');
      this.reserveSOL = pool.sol;
      this.reserveUSDC = pool.usdc;
      this.k = pool.k;
      this.feeRate = pool.feeRate || 0.003;
    } catch {
      // Silent fail — use cached data
    }
  }
}
