import { useState, useEffect, useCallback } from 'react';
import { KalshiService } from '../../core/kalshiService';
import type { KalshiMarket } from '../../core/kalshiService';

interface CategoryInfo {
    name: string;
    count: number;
    subcategories: { name: string; count: number }[];
}

export function useMarkets() {
    const [markets, setMarkets] = useState<KalshiMarket[]>([]);
    const [categories, setCategories] = useState<CategoryInfo[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const all = await KalshiService.getMarkets();
            setMarkets(all);

            // Build category tree with counts
            const catMap = new Map<string, Map<string, number>>();
            for (const m of all) {
                const cat = m.category || 'General';
                if (!catMap.has(cat)) catMap.set(cat, new Map());
                const subMap = catMap.get(cat)!;
                const sub = m.subcategory || 'Other';
                subMap.set(sub, (subMap.get(sub) ?? 0) + 1);
            }

            const catList: CategoryInfo[] = [];
            for (const [name, subMap] of catMap) {
                const totalCount = Array.from(subMap.values()).reduce((a, b) => a + b, 0);
                const subcategories = Array.from(subMap.entries())
                    .map(([sName, count]) => ({ name: sName, count }))
                    .sort((a, b) => b.count - a.count);
                catList.push({ name, count: totalCount, subcategories });
            }
            catList.sort((a, b) => b.count - a.count);
            setCategories(catList);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void refresh(); }, [refresh]);

    const getMarketsByCategory = useCallback((category: string, subcategory?: string) => {
        return markets.filter(m =>
            m.category === category &&
            (!subcategory || m.subcategory === subcategory)
        );
    }, [markets]);

    return { markets, categories, loading, refresh, getMarketsByCategory };
}
