import { Connection } from '@solana/web3.js';
import { WalletManager } from '../core/walletManager';
import { TransactionSigner } from '../core/transactionSigner';
import { HistoryProvider } from '../utils/historyProvider';
import { TerminalUtils } from '../utils/terminalUtils';
import { MaverickAMM } from './maverickAMM';

export interface Loan {
    borrower: string;
    amount: number;
    fee: number;
    timestamp: string;
}

export class MaverickBank {
    private participants: WalletManager[] = [];
    private vaultBalance: number = 0;
    private interestFee: number = 0.05; // 5% fee on payback
    private loans: Map<string, Loan> = new Map();
    private contributions: Map<string, number> = new Map();
    private currentIndex: number = 0;
    private contributionAmount: number = 0.1;
    public amm: MaverickAMM;

    constructor(
        private connection: Connection,
        private signer: TransactionSigner,
        private history: HistoryProvider,
        private vaultWallet: WalletManager,
        amm: MaverickAMM
    ) {
        this.amm = amm;
    }

    public addParticipant(wallet: WalletManager) {
        this.participants.push(wallet);
    }

    public async deposit(wallet: WalletManager, amount: number): Promise<void> {
        const address = wallet.getPublicKey().toBase58();
        TerminalUtils.printStep('Bank', `Maverick ${address.slice(0, 8)} depositing ${amount} SOL to Vault.`);

        // Real on-chain transfer: agent wallet → vault
        const sig = await this.signer.sendTransfer(wallet, this.vaultWallet.getPublicKey(), amount);

        // Bookkeeping only after confirmed tx
        this.vaultBalance += amount;
        const current = this.contributions.get(address) || 0;
        this.contributions.set(address, current + amount);

        await this.history.recordAction({
            timestamp: new Date().toISOString(),
            agentAddress: address,
            action: 'BANK_DEPOSIT',
            description: `Deposited ${amount} SOL to Maverick Bank Vault`,
            signature: sig,
        });
    }

    public async requestLoan(wallet: WalletManager, amount: number): Promise<boolean> {
        const address = wallet.getPublicKey().toBase58();

        if (this.vaultBalance < amount) {
            TerminalUtils.printAdvice(`Bank: Vault liquidity too low for loan of ${amount} SOL.`);
            return false;
        }

        if (this.loans.has(address)) {
            TerminalUtils.printAdvice(`Bank: Maverick ${address.slice(0, 8)} already has an outstanding loan.`);
            return false;
        }

        // Real on-chain transfer: vault → agent wallet (vault signs)
        const sig = await this.signer.sendTransfer(this.vaultWallet, wallet.getPublicKey(), amount);

        TerminalUtils.printSuccess(`LOAN GRANTED: ${amount} SOL to ${address.slice(0, 8)}`);
        this.vaultBalance -= amount;

        this.loans.set(address, {
            borrower: address,
            amount: amount,
            fee: amount * this.interestFee,
            timestamp: new Date().toISOString()
        });

        await this.history.recordAction({
            timestamp: new Date().toISOString(),
            agentAddress: address,
            action: 'BANK_BORROW',
            description: `Borrowed ${amount} SOL from Bank Vault. Payback Fee: ${amount * this.interestFee} SOL`,
            signature: sig,
        });

        return true;
    }

    public async payback(wallet: WalletManager): Promise<void> {
        const address = wallet.getPublicKey().toBase58();
        const loan = this.loans.get(address);

        if (!loan) return;

        const totalPayback = loan.amount + loan.fee;
        TerminalUtils.printStep('Bank', `Maverick ${address.slice(0, 8)} paying back loan: ${totalPayback} SOL (incl. fee).`);

        // Real on-chain transfer: agent wallet → vault
        const sig = await this.signer.sendTransfer(wallet, this.vaultWallet.getPublicKey(), totalPayback);

        this.vaultBalance += totalPayback;
        this.loans.delete(address);

        await this.history.recordAction({
            timestamp: new Date().toISOString(),
            agentAddress: address,
            action: 'BANK_PAYBACK',
            description: `Paid back loan of ${loan.amount} SOL with ${loan.fee} SOL fee.`,
            signature: sig,
        });
    }

    public async withdraw(wallet: WalletManager, amount?: number): Promise<boolean> {
        const address = wallet.getPublicKey().toBase58();
        const contribution = this.contributions.get(address) || 0;
        const loan = this.loans.get(address);

        if (loan) {
            TerminalUtils.printError(`Withdrawal Denied: Maverick ${address.slice(0, 8)} has an active debt.`);
            return false;
        }

        const withdrawAmount = amount || contribution;
        if (withdrawAmount > contribution) {
            TerminalUtils.printError('Withdrawal Denied: Amount exceeds your total bank contribution.');
            return false;
        }

        if (this.vaultBalance < withdrawAmount) {
            TerminalUtils.printError('Bank: Vault liquidity too low for withdrawal.');
            return false;
        }

        // Real on-chain transfer: vault → agent wallet (vault signs)
        const sig = await this.signer.sendTransfer(this.vaultWallet, wallet.getPublicKey(), withdrawAmount);

        TerminalUtils.printSuccess(`WITHDRAWAL: ${withdrawAmount} SOL returned to Maverick ${address.slice(0, 8)}`);
        this.vaultBalance -= withdrawAmount;
        this.contributions.set(address, contribution - withdrawAmount);

        await this.history.recordAction({
            timestamp: new Date().toISOString(),
            agentAddress: address,
            action: 'BANK_WITHDRAW',
            description: `Withdrew ${withdrawAmount} SOL from Maverick Bank.`,
            signature: sig,
        });

        return true;
    }

    public async collectContributions(): Promise<void> {
        TerminalUtils.printStep('Bank', `Collecting ${this.contributionAmount} SOL for Vault Liquidity...`);
        for (const p of this.participants) {
            const address = p.getPublicKey().toBase58();
            const balance = await p.getBalance();
            if (balance >= this.contributionAmount + 0.01) { // leave room for tx fee
                try {
                    // Real on-chain transfer: participant → vault
                    await this.signer.sendTransfer(p, this.vaultWallet.getPublicKey(), this.contributionAmount);
                    this.vaultBalance += this.contributionAmount;
                    const current = this.contributions.get(address) || 0;
                    this.contributions.set(address, current + this.contributionAmount);
                    TerminalUtils.printStep(address.slice(0, 8), `Contribution committed.`);
                } catch {
                    TerminalUtils.printStep(address.slice(0, 8), `Contribution skipped (tx failed).`);
                }
            }
        }
    }

    public async payout(): Promise<void> {
        const recipient = this.participants[this.currentIndex];
        if (!recipient) return;

        const reward = 0.2; // Fixed payout from vault interests
        if (this.vaultBalance >= reward) {
            try {
                // Real on-chain transfer: vault → recipient (vault signs)
                const sig = await this.signer.sendTransfer(this.vaultWallet, recipient.getPublicKey(), reward);
                TerminalUtils.printSuccess(`SAVINGS REWARD: Maverick ${recipient.getPublicKey().toBase58().slice(0, 8)} receives ${reward} SOL bounty.`);
                this.vaultBalance -= reward;

                await this.history.recordAction({
                    timestamp: new Date().toISOString(),
                    agentAddress: recipient.getPublicKey().toBase58(),
                    action: 'BANK_PAYOUT',
                    description: `Received ${reward} SOL savings reward from vault.`,
                    signature: sig,
                });
            } catch {
                TerminalUtils.printStep('Bank', 'Payout failed (tx error).');
            }
        }
        this.currentIndex = (this.currentIndex + 1) % this.participants.length;
    }

    public getContribution(address: string): number {
        return this.contributions.get(address) || 0;
    }

    public getVaultBalance(): number {
        return this.vaultBalance;
    }

    public async getVaultBalanceOnChain(): Promise<number> {
        return this.vaultWallet.getBalance();
    }

    public getOutstandingLoan(address: string): Loan | undefined {
        return this.loans.get(address);
    }
}
