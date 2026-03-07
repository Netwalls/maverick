import * as fs from 'fs';
import * as path from 'path';
import { WalletManager } from './walletManager';
import { TransactionSigner } from './transactionSigner';
import { HistoryProvider } from '../utils/historyProvider';
import { TerminalUtils } from '../utils/terminalUtils';

export interface FundingRequest {
    id: string;
    requester: string;
    provider: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    timestamp: string;
}

export class CommunicationModule {
    private governancePath: string;

    constructor(
        private signer: TransactionSigner,
        private history: HistoryProvider
    ) {
        this.governancePath = path.join(process.cwd(), 'governance.json');
    }

    public async requestFunding(requester: WalletManager, provider: WalletManager, amount: number): Promise<boolean> {
        const reqId = Math.random().toString(36).substring(7);
        const request: FundingRequest = {
            id: reqId,
            requester: requester.getPublicKey().toBase58(),
            provider: provider.getPublicKey().toBase58(),
            amount,
            status: 'PENDING',
            timestamp: new Date().toISOString()
        };

        TerminalUtils.printStep('Social', `[GOVERNANCE] Maverick ${requester.getPublicKey().toBase58().slice(0, 8)} requested ${amount} SOL from ${provider.getPublicKey().toBase58().slice(0, 8)}.`);
        TerminalUtils.printAdvice(`Waiting for manual approval (ID: ${reqId})...`);

        this.addRequestToQueue(request);
        return false; // Not immediate
    }

    private addRequestToQueue(request: FundingRequest) {
        let queue: FundingRequest[] = [];
        if (fs.existsSync(this.governancePath)) {
            queue = JSON.parse(fs.readFileSync(this.governancePath, 'utf8'));
        }
        queue.push(request);
        fs.writeFileSync(this.governancePath, JSON.stringify(queue, null, 2));
    }

    public async resolveRequest(requestId: string, approved: boolean, providerWallet?: WalletManager, requesterPubKey?: string): Promise<boolean> {
        if (!fs.existsSync(this.governancePath)) return false;

        let queue: FundingRequest[] = JSON.parse(fs.readFileSync(this.governancePath, 'utf8'));
        const index = queue.findIndex(r => r.id === requestId);

        if (index === -1) return false;

        const request = queue[index];
        if (!request) return false;

        request.status = approved ? 'APPROVED' : 'REJECTED';

        if (approved && providerWallet && requesterPubKey) {
            try {
                const signature = await this.signer.sendTransfer(providerWallet, new (await import('@solana/web3.js')).PublicKey(requesterPubKey), request.amount);

                await this.history.recordAction({
                    timestamp: new Date().toISOString(),
                    agentAddress: providerWallet.getPublicKey().toBase58(),
                    action: 'LEND_SOL',
                    description: `Lent ${request.amount} SOL (Approved by User)`,
                    signature
                });

                TerminalUtils.printSuccess(`Transfer complete for request ${requestId}.`);
            } catch (e) {
                TerminalUtils.printError(`Governance transfer failed: ${e}`);
            }
        } else {
            TerminalUtils.printStep('Social', `Request ${requestId} REJECTED by user.`);
        }

        queue.splice(index, 1); // Remove from pending
        fs.writeFileSync(this.governancePath, JSON.stringify(queue, null, 2));
        return approved;
    }
}
