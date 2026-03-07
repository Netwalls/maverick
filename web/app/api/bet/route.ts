import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '../../../lib/services';
import { KalshiService } from '../../../../src/core/kalshiService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker, side, amount, agentIndex = 0 } = body;
    const { history, agents, signer } = await getServices();
    const agent = agents[agentIndex];
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const price = await KalshiService.getMarketPrice(ticker);
    const address = agent.wallet.getPublicKey().toBase58();

    // On-chain transfer (self-transfer placeholder, same as TUI BetScreen)
    const sig = await signer.sendTransfer(
      agent.wallet,
      agent.wallet.getPublicKey(),
      0.001
    );

    await history.recordAction({
      timestamp: new Date().toISOString(),
      agentAddress: address,
      action: 'BET',
      description: `Placed ${side.toUpperCase()} bet on ${ticker} for ${amount} SOL at ${side === 'yes' ? price.ask : (100 - price.bid)}c`,
      signature: sig,
      reasoning: 'Web UI trade',
    });

    return NextResponse.json({
      success: true,
      ticker,
      side,
      amount,
      price: side === 'yes' ? price.ask : (100 - price.bid),
      signature: sig,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
