import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '../../../lib/services';

export async function GET(req: NextRequest) {
  try {
    const { history } = await getServices();
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    let actions = history.getHistory();
    if (address) {
      actions = actions.filter(a => a.agentAddress === address);
    }

    // Return newest first
    actions.reverse();

    return NextResponse.json({ history: actions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
