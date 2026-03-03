import { WalletManager } from '../core/walletManager.js';
import { TransactionSigner } from '../core/transactionSigner.js';
import { HistoryProvider } from '../utils/historyProvider.js';
import { TerminalUtils } from '../utils/terminalUtils.js';
import { MaverickAMM } from './maverickAMM.js';

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

    constructor(private signer: TransactionSigner, private history: HistoryProvider) {
        this.amm = new MaverickAMM(history);
    }

    public addParticipant(wallet: WalletManager) {
        this.participants.push(wallet);
    }

    public async deposit(wallet: WalletManager, amount: number): Promise<void> {
        TerminalUtils.printStep('Bank', `Maverick ${wallet.getPublicKey().toBase58().slice(0, 8)} depositing ${amount} SOL to Vault.`);
        this.vaultBalance += amount;
        const current = this.contributions.get(wallet.getPublicKey().toBase58()) || 0;
        this.contributions.set(wallet.getPublicKey().toBase58(), current + amount);

        await this.history.recordAction({
            timestamp: new Date().toISOString(),
            agentAddress: wallet.getPublicKey().toBase58(),
            action: 'BANK_DEPOSIT',
            description: `Deposited ${amount} SOL to Maverick Bank Vault`,
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
        });

        return true;
    }

    public async payback(wallet: WalletManager): Promise<void> {
        const address = wallet.getPublicKey().toBase58();
        const loan = this.loans.get(address);

        if (!loan) return;

        const totalPayback = loan.amount + loan.fee;
        TerminalUtils.printStep('Bank', `Maverick ${address.slice(0, 8)} paying back loan: ${totalPayback} SOL (incl. fee).`);

        this.vaultBalance += totalPayback;
        this.loans.delete(address);

        await this.history.recordAction({
            timestamp: new Date().toISOString(),
            agentAddress: address,
            action: 'BANK_PAYBACK',
            description: `Paid back loan of ${loan.amount} SOL with ${loan.fee} SOL fee.`,
        });
    }

    public async collectContributions(): Promise<void> {
        TerminalUtils.printStep('Bank', `Collecting ${this.contributionAmount} SOL for Vault Liquidity...`);
        for (const p of this.participants) {
            const address = p.getPublicKey().toBase58();
            const balance = await p.getBalance();
            if (balance >= this.contributionAmount) {
                this.vaultBalance += this.contributionAmount;
                const current = this.contributions.get(address) || 0;
                this.contributions.set(address, current + this.contributionAmount);
                TerminalUtils.printStep(address.slice(0, 8), `Contribution committed.`);
            }
        }
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

        TerminalUtils.printSuccess(`WITHDRAWAL: ${withdrawAmount} SOL returned to Maverick ${address.slice(0, 8)}`);
        this.vaultBalance -= withdrawAmount;
        this.contributions.set(address, contribution - withdrawAmount);

        await this.history.recordAction({
            timestamp: new Date().toISOString(),
            agentAddress: address,
            action: 'BANK_WITHDRAW',
            description: `Withdrew ${withdrawAmount} SOL from Maverick Bank.`,
        });

        return true;
    }

    public getContribution(address: string): number {
        return this.contributions.get(address) || 0;
    }

    public async payout(): Promise<void> {
        const recipient = this.participants[this.currentIndex];
        if (!recipient) return;

        const reward = 0.2; // Fixed payout from vault interests
        if (this.vaultBalance >= reward) {
            TerminalUtils.printSuccess(`SAVINGS REWARD: Maverick ${recipient.getPublicKey().toBase58().slice(0, 8)} receives ${reward} SOL bounty.`);
            this.vaultBalance -= reward;
            // Record payout...
        }
        this.currentIndex = (this.currentIndex + 1) % this.participants.length;
    }

    public getVaultBalance(): number {
        return this.vaultBalance;
    }

    public getOutstandingLoan(address: string): Loan | undefined {
        return this.loans.get(address);
    }
}
