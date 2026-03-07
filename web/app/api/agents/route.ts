import { NextResponse } from 'next/server';
import { getServices } from '../../../lib/services';

export async function GET() {
  try {
    const { agents } = await getServices();
    const result = agents.map((a, i) => ({
      index: i,
      name: a.name,
      address: a.wallet.getPublicKey().toBase58(),
    }));
    return NextResponse.json({ agents: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
