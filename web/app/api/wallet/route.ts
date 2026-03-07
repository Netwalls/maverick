import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '../../../lib/services';
import { TokenService } from '../../../../src/core/tokenService';

export async function GET() {
  try {
    const { agents, connection } = await getServices();
    const usdcMint = await TokenService.getUSDCAddress(connection);
    const results = await Promise.all(
      agents.map(async (a) => ({
        name: a.name,
        address: a.wallet.getPublicKey().toBase58(),
        balance: await a.wallet.getBalance(),
        usdc: await TokenService.getTokenBalance(connection, a.wallet.getPublicKey(), usdcMint),
      }))
    );
    return NextResponse.json({ agents: results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, agentIndex = 0, amount = 1 } = body;
    const { agents } = await getServices();
    const agent = agents[agentIndex];
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (action === 'airdrop') {
      const sig = await agent.wallet.airdrop(amount);
      const balance = await agent.wallet.getBalance();
      return NextResponse.json({ signature: sig, balance });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
