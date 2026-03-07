import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '../../../lib/services';

interface Proposal {
  id: string;
  fromAgentIndex: number;
  fromAgent: string;
  toAgentIndex: number;
  toAgent: string;
  amount: number;
  token: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  txSignature?: string;
  createdAt: string;
}

const proposals: Proposal[] = [];

export async function GET() {
  return NextResponse.json({ proposals });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const { agents, signer } = await getServices();

    if (action === 'create') {
      const { fromAgentIndex, toAgentIndex, amount, token, reason } = body;
      const fromAgent = agents[fromAgentIndex];
      const toAgent = agents[toAgentIndex];
      if (!fromAgent || !toAgent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      if (fromAgentIndex === toAgentIndex) {
        return NextResponse.json({ error: 'From and To agents must be different' }, { status: 400 });
      }

      const proposal: Proposal = {
        id: `prop-${Date.now()}`,
        fromAgentIndex,
        fromAgent: fromAgent.name,
        toAgentIndex,
        toAgent: toAgent.name,
        amount,
        token,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      proposals.push(proposal);
      return NextResponse.json({ proposal });
    }

    if (action === 'approve') {
      const { proposalId } = body;
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) {
        return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
      }
      if (proposal.status !== 'pending') {
        return NextResponse.json({ error: 'Proposal already resolved' }, { status: 400 });
      }

      const toAgent = agents[proposal.toAgentIndex];
      const fromAgent = agents[proposal.fromAgentIndex];
      if (!toAgent || !fromAgent) {
        return NextResponse.json({ error: 'Agent no longer available' }, { status: 404 });
      }

      // Execute the transfer: from provider (toAgent) to requester (fromAgent)
      const sig = await signer.sendTransfer(
        toAgent.wallet,
        fromAgent.wallet.getPublicKey(),
        proposal.amount,
      );

      proposal.status = 'approved';
      proposal.txSignature = sig;
      return NextResponse.json({ proposal, txSignature: sig });
    }

    if (action === 'reject') {
      const { proposalId } = body;
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) {
        return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
      }
      if (proposal.status !== 'pending') {
        return NextResponse.json({ error: 'Proposal already resolved' }, { status: 400 });
      }

      proposal.status = 'rejected';
      return NextResponse.json({ proposal });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
