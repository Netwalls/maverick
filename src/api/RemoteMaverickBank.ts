import { Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { WalletManager } from '../core/walletManager.js';
import { HistoryProvider } from '../utils/historyProvider.js';
import { TerminalUtils } from '../utils/terminalUtils.js';
import { MaverickApiClient } from './apiClient.js';
import type { RemoteMaverickAMM } from './RemoteMaverickAMM.js';

export interface Loan {
  borrower: string;
  amount: number;
  fee: number;
  timestamp: string;
}

/**
 * Remote implementation of MaverickBank that calls the shared backend API.
 * Same interface as the local MaverickBank so the TUI doesn't need to change.
 */
export class RemoteMaverickBank {
  private participants: WalletManager[] = [];
  private interestFee: number = 0.05;
  private contributionAmount: number = 0.1;
  public amm: RemoteMaverickAMM;

  // Cached state from server
  private _cachedVaultBalance: number = 0;
  private _cachedContributions: Map<string, number> = new Map();
  private _cachedLoans: Map<string, Loan> = new Map();

  constructor(
    private connection: Connection,
    private api: MaverickApiClient,
    private history: HistoryProvider,
    private vaultPubkey: PublicKey,
    amm: RemoteMaverickAMM
  ) {
    this.amm = amm;
  }

  public addParticipant(wallet: WalletManager) {
    this.participants.push(wallet);
  }

  /**
   * Deposit SOL to the shared vault.
   * 1. User signs tx locally → sends SOL to vault on-chain
   * 2. POSTs tx signature to API for verification + recording
   */
  public async deposit(wallet: WalletManager, amount: number): Promise<void> {
    const address = wallet.getPublicKey().toBase58();
    TerminalUtils.printStep('Bank', `Maverick ${address.slice(0, 8)} depositing ${amount} SOL to Vault.`);

    // Build and send the SOL transfer on-chain
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.getPublicKey(),
        toPubkey: this.vaultPubkey,
        lamports: Math.round(amount * 1e9),
      })
    );
    const sig = await sendAndConfirmTransaction(this.connection, tx, [wallet.getKeypair()]);

    // Report to API
    await this.api.post('/api/bank/deposit', { txSignature: sig, amount });

    // Update local cache
    this._cachedVaultBalance += amount;
    const current = this._cachedContributions.get(address) || 0;
    this._cachedContributions.set(address, current + amount);

    await this.history.recordAction({
      timestamp: new Date().toISOString(),
      agentAddress: address,
      action: 'BANK_DEPOSIT',
      description: `Deposited ${amount} SOL to Maverick Bank Vault`,
      signature: sig,
    });
  }

  /**
   * Request a loan from the vault.
   * The vault signs the transfer server-side.
   */
  public async requestLoan(wallet: WalletManager, amount: number): Promise<boolean> {
    const address = wallet.getPublicKey().toBase58();

    try {
      const result = await this.api.post('/api/bank/loan', { amount });

      TerminalUtils.printSuccess(`LOAN GRANTED: ${amount} SOL to ${address.slice(0, 8)}`);
      this._cachedVaultBalance -= amount;
      this._cachedLoans.set(address, {
        borrower: address,
        amount,
        fee: amount * this.interestFee,
        timestamp: new Date().toISOString(),
      });

      await this.history.recordAction({
        timestamp: new Date().toISOString(),
        agentAddress: address,
        action: 'BANK_BORROW',
        description: `Borrowed ${amount} SOL from Bank Vault. Payback Fee: ${amount * this.interestFee} SOL`,
        signature: result.txSignature,
      });

      return true;
    } catch (err: any) {
      TerminalUtils.printAdvice(`Bank: ${err.message}`);
      return false;
    }
  }

  /**
   * Payback a loan.
   * 1. User signs tx locally → sends total payback to vault
   * 2. POSTs tx signature to API
   */
  public async payback(wallet: WalletManager): Promise<void> {
    const address = wallet.getPublicKey().toBase58();

    // Get loan info from server
    let status;
    try {
      status = await this.api.get('/api/bank/status');
    } catch {
      TerminalUtils.printError('Could not fetch loan status');
      return;
    }

    if (!status.loan) {
      TerminalUtils.printAdvice('No active loan to repay.');
      return;
    }

    const totalPayback = status.loan.totalPayback;
    TerminalUtils.printStep('Bank', `Maverick ${address.slice(0, 8)} paying back loan: ${totalPayback} SOL (incl. fee).`);

    // Build and send payback tx on-chain
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.getPublicKey(),
        toPubkey: this.vaultPubkey,
        lamports: Math.round(totalPayback * 1e9),
      })
    );
    const sig = await sendAndConfirmTransaction(this.connection, tx, [wallet.getKeypair()]);

    // Report to API
    await this.api.post('/api/bank/payback', { txSignature: sig });

    this._cachedVaultBalance += totalPayback;
    this._cachedLoans.delete(address);

    await this.history.recordAction({
      timestamp: new Date().toISOString(),
      agentAddress: address,
      action: 'BANK_PAYBACK',
      description: `Paid back loan of ${status.loan.amount} SOL with ${(status.loan.fee).toFixed(4)} SOL fee.`,
      signature: sig,
    });
  }

  /**
   * Withdraw contributions from the vault.
   * The vault signs the transfer server-side.
   */
  public async withdraw(wallet: WalletManager, amount?: number): Promise<boolean> {
    const address = wallet.getPublicKey().toBase58();

    try {
      const result = await this.api.post('/api/bank/withdraw', { amount: amount || undefined });

      TerminalUtils.printSuccess(`WITHDRAWAL: ${result.amount} SOL returned to Maverick ${address.slice(0, 8)}`);
      this._cachedVaultBalance -= result.amount;
      const contribution = this._cachedContributions.get(address) || 0;
      this._cachedContributions.set(address, contribution - result.amount);

      await this.history.recordAction({
        timestamp: new Date().toISOString(),
        agentAddress: address,
        action: 'BANK_WITHDRAW',
        description: `Withdrew ${result.amount} SOL from Maverick Bank.`,
        signature: result.txSignature,
      });

      return true;
    } catch (err: any) {
      TerminalUtils.printError(`Withdrawal failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Collect contributions from all participants (deposits each agent's share).
   */
  public async collectContributions(): Promise<void> {
    TerminalUtils.printStep('Bank', `Collecting ${this.contributionAmount} SOL for Vault Liquidity...`);
    for (const p of this.participants) {
      const address = p.getPublicKey().toBase58();
      const balance = await p.getBalance();
      if (balance >= this.contributionAmount + 0.01) {
        try {
          await this.deposit(p, this.contributionAmount);
          TerminalUtils.printStep(address.slice(0, 8), `Contribution committed.`);
        } catch {
          TerminalUtils.printStep(address.slice(0, 8), `Contribution skipped (tx failed).`);
        }
      }
    }
  }

  /**
   * Payout is handled differently with shared vault — skip for now.
   * The server could implement a payout cron, but for MVP we skip rotation payouts.
   */
  public async payout(): Promise<void> {
    // Payouts from shared vault require governance — not implemented in MVP
  }

  public getContribution(address: string): number {
    return this._cachedContributions.get(address) || 0;
  }

  public getVaultBalance(): number {
    return this._cachedVaultBalance;
  }

  public async getVaultBalanceOnChain(): Promise<number> {
    const info = await this.api.getPublic('/api/vault/info');
    this._cachedVaultBalance = info.balanceOnChain;
    return info.balanceOnChain;
  }

  public getOutstandingLoan(address: string): Loan | undefined {
    return this._cachedLoans.get(address);
  }

  /**
   * Sync cached state from the server.
   */
  public async syncFromServer(wallet?: string): Promise<void> {
    try {
      const info = await this.api.getPublic('/api/vault/info');
      this._cachedVaultBalance = info.balanceOnChain;

      if (wallet) {
        const status = await this.api.get('/api/bank/status');
        this._cachedContributions.set(wallet, status.contribution);
        if (status.loan) {
          this._cachedLoans.set(wallet, {
            borrower: wallet,
            amount: status.loan.amount,
            fee: status.loan.fee,
            timestamp: status.loan.createdAt,
          });
        } else {
          this._cachedLoans.delete(wallet);
        }
      }
    } catch {
      // Silent fail on sync — use cached data
    }
  }
}
