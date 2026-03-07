import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '../../../lib/services';

function parseIntent(text: string): { intent: string; params: Record<string, string> } {
  const lower = text.toLowerCase().trim();

  if (/balance|wallet|funds|how much/i.test(lower)) {
    return { intent: 'balance', params: {} };
  }
  if (/swap|trade|exchange|convert/i.test(lower)) {
    const match = lower.match(/(\d+\.?\d*)\s*(sol|usdc)/i);
    return {
      intent: 'swap',
      params: match ? { amount: match[1], token: match[2].toUpperCase() } : {},
    };
  }
  if (/send|transfer/i.test(lower)) {
    const match = lower.match(/(\d+\.?\d*)\s*(sol|usdc)/i);
    return {
      intent: 'send',
      params: match ? { amount: match[1], token: match[2].toUpperCase() } : {},
    };
  }
  if (/go to|navigate|open|show/i.test(lower)) {
    const pages = ['wallet', 'swap', 'bank', 'markets', 'history', 'agents', 'governance', 'voice'];
    const page = pages.find(p => lower.includes(p));
    return { intent: 'navigate', params: { page: page || 'home' } };
  }
  if (/help|commands|what can/i.test(lower)) {
    return { intent: 'help', params: {} };
  }
  if (/price|market|sol price/i.test(lower)) {
    return { intent: 'price', params: {} };
  }
  if (/airdrop|faucet/i.test(lower)) {
    return { intent: 'airdrop', params: {} };
  }

  return { intent: 'unknown', params: {} };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const { intent, params } = parseIntent(text);

    let response = '';

    switch (intent) {
      case 'balance': {
        const { agents } = await getServices();
        const balances = await Promise.all(
          agents.map(async a => {
            const bal = await a.wallet.getBalance();
            return `${a.name}: ${bal.toFixed(2)} SOL`;
          })
        );
        response = `Wallet balances:\n${balances.join('\n')}`;
        break;
      }
      case 'swap': {
        if (params.amount && params.token) {
          response = `To swap ${params.amount} ${params.token}, navigate to the Swap page.\nI can take you there -- say "go to swap".`;
        } else {
          response = 'To make a swap, go to the Swap page. Say "go to swap" to navigate there.';
        }
        break;
      }
      case 'send': {
        if (params.amount && params.token) {
          response = `To send ${params.amount} ${params.token}, use the Governance page to create a proposal.\nSay "go to governance" to navigate there.`;
        } else {
          response = 'To send funds between agents, create a proposal on the Governance page.';
        }
        break;
      }
      case 'navigate': {
        const page = params.page || 'home';
        response = `Navigating to ${page}. Use the sidebar to go to /${page === 'home' ? '' : page}.`;
        break;
      }
      case 'airdrop': {
        response = 'To request an airdrop, go to the Wallet page and click "Request Airdrop".\nSay "go to wallet" to navigate there.';
        break;
      }
      case 'price': {
        response = 'Check the Markets page for current prices. Say "go to markets" to navigate there.';
        break;
      }
      case 'help': {
        response = [
          'Available commands:',
          '  "check balance"     - View agent wallet balances',
          '  "swap 1 SOL"        - Get swap instructions',
          '  "send 0.5 SOL"      - Get transfer instructions',
          '  "go to wallet"      - Navigate to a page',
          '  "request airdrop"   - Get airdrop instructions',
          '  "check price"       - Get price info',
          '  "help"              - Show this help message',
        ].join('\n');
        break;
      }
      default: {
        response = `I didn't understand "${text}". Try "help" to see available commands.`;
      }
    }

    return NextResponse.json({ response, intent, params });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
