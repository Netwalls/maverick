import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '../../../lib/services';

export async function GET(req: NextRequest) {
  try {
    const { bank, agents } = await getServices();
    const { searchParams } = new URL(req.url);
    const agentIndex = parseInt(searchParams.get('agentIndex') || '0');
    const agent = agents[agentIndex];

    const vaultBalance = await bank.getVaultBalanceOnChain();
    const address = agent ? agent.wallet.getPublicKey().toBase58() : '';
    const contribution = address ? bank.getContribution(address) : 0;
    const loan = address ? bank.getOutstandingLoan(address) : undefined;

    return NextResponse.json({ vaultBalance, contribution, loan, address });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, amount, agentIndex = 0 } = body;
    const { bank, agents } = await getServices();
    const agent = agents[agentIndex];
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    switch (action) {
      case 'deposit':
        await bank.deposit(agent.wallet, amount);
        return NextResponse.json({ success: true, action: 'deposit', amount });
      case 'withdraw':
        const ok = await bank.withdraw(agent.wallet, amount);
        return NextResponse.json({ success: ok, action: 'withdraw', amount });
      case 'loan':
        const granted = await bank.requestLoan(agent.wallet, amount);
        return NextResponse.json({ success: granted, action: 'loan', amount });
      case 'payback':
        await bank.payback(agent.wallet);
        return NextResponse.json({ success: true, action: 'payback' });
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
