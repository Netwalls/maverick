import { NextRequest, NextResponse } from 'next/server';
import { KalshiService } from '../../../../src/core/kalshiService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    let markets;
    if (category) {
      markets = await KalshiService.getMarketsByCategory(category);
    } else {
      markets = await KalshiService.getMarkets();
    }

    const categoriesMap = await KalshiService.getCategories();
    const categories: Record<string, string[]> = {};
    for (const [cat, subs] of categoriesMap) {
      categories[cat] = Array.from(subs);
    }

    return NextResponse.json({ markets: markets.slice(0, 100), categories, total: markets.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
