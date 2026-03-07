import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '../../../lib/services';

export async function GET(req: NextRequest) {
  try {
    const { amm } = await getServices();
    const { searchParams } = new URL(req.url);
    const input = (searchParams.get('input') || 'SOL') as 'SOL' | 'USDC';
    const amount = parseFloat(searchParams.get('amount') || '0');

    const pool = amm.getPoolStats();
    const quote = amount > 0 ? amm.getSwapQuote(input, amount) : 0;

    return NextResponse.json({ pool, quote, input, amount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, amount, agentIndex = 0 } = body;
    const { amm, agents } = await getServices();
    const agent = agents[agentIndex];
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const output = await amm.swap(agent.wallet, input, amount);
    if (output <= 0) {
      return NextResponse.json({ error: 'Pool has no liquidity. Deposit liquidity before swapping.' });
    }
    const pool = amm.getPoolStats();
    return NextResponse.json({ output, pool });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
