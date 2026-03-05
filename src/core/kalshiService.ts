import * as fs from 'fs';
import * as path from 'path';

export interface KalshiMarket {
    ticker: string;
    event_ticker: string;
    title: string;
    subtitle: string;
    category: string;
    subcategory: string;
    yes_bid: number;
    yes_ask: number;
    status: string;
}

export interface KalshiEvent {
    event_ticker: string;
    title: string;
    category: string;
    subcategory: string;
    markets: KalshiMarket[];
}

export class KalshiService {
    private static BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2';

    private static marketsCache: { data: KalshiMarket[], timestamp: number } | null = null;
    private static eventsCache: { data: Map<string, KalshiEvent>, timestamp: number } | null = null;
    private static CACHE_TTL = 300000; // 5 minutes
    private static DISK_CACHE_PATH = path.join(process.cwd(), '.kalshi-cache.json');

    private static fetchInProgress: Promise<KalshiMarket[]> | null = null;
    private static diskLoaded = false;

    public static isLoading(): boolean {
        return this.fetchInProgress !== null && this.marketsCache === null;
    }

    /** Load disk cache into memory — call once at boot for instant market data */
    public static loadDiskCache(): void {
        if (this.diskLoaded) return;
        this.diskLoaded = true;
        try {
            if (fs.existsSync(this.DISK_CACHE_PATH)) {
                const raw = JSON.parse(fs.readFileSync(this.DISK_CACHE_PATH, 'utf8'));
                if (raw.data?.length > 0 && raw.timestamp) {
                    this.marketsCache = { data: raw.data, timestamp: raw.timestamp };
                }
            }
        } catch { /* ignore corrupt cache */ }
    }

    private static saveDiskCache(data: KalshiMarket[], timestamp: number): void {
        try {
            fs.writeFileSync(this.DISK_CACHE_PATH, JSON.stringify({ data, timestamp }));
        } catch { /* best-effort */ }
    }

    /** Prefetch markets in the background. Call at app boot. */
    public static prefetch(): void {
        this.loadDiskCache();
        // Fire-and-forget background refresh
        void this.getMarkets();
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    public static async getMarkets(): Promise<KalshiMarket[]> {
        const now = Date.now();
        if (this.marketsCache && (now - this.marketsCache.timestamp) < this.CACHE_TTL) {
            return this.marketsCache.data;
        }
        // Return stale cache immediately and refresh in background
        if (this.marketsCache && !this.fetchInProgress) {
            this.fetchInProgress = this.fetchAll(now);
            return this.marketsCache.data;
        }
        if (this.fetchInProgress) {
            // If we have stale cache, return it; otherwise wait for fetch
            return this.marketsCache?.data ?? this.fetchInProgress;
        }
        this.fetchInProgress = this.fetchAll(now);
        return this.fetchInProgress;
    }

    /** Returns all unique categories with their subcategories */
    public static async getCategories(): Promise<Map<string, Set<string>>> {
        const markets = await this.getMarkets();
        const categories = new Map<string, Set<string>>();
        for (const m of markets) {
            if (!categories.has(m.category)) categories.set(m.category, new Set());
            if (m.subcategory) categories.get(m.category)!.add(m.subcategory);
        }
        return categories;
    }

    /** Returns markets filtered by category and optional subcategory */
    public static async getMarketsByCategory(category: string, subcategory?: string): Promise<KalshiMarket[]> {
        const markets = await this.getMarkets();
        return markets.filter(m =>
            m.category === category &&
            (!subcategory || m.subcategory === subcategory)
        );
    }

    public static async getMarketPrice(ticker: string): Promise<{ bid: number, ask: number }> {
        try {
            const response = await fetch(`${this.BASE_URL}/markets/${ticker}`);
            if (!response.ok) throw new Error(`Kalshi API error: ${response.statusText}`);
            const data = await response.json();
            return { bid: data.market.yes_bid || 50, ask: data.market.yes_ask || 50 };
        } catch {
            return { bid: 50, ask: 50 };
        }
    }

    // ─── Fetching ─────────────────────────────────────────────────────────────

    private static async fetchAll(timestamp: number): Promise<KalshiMarket[]> {
        try {
            // Fetch events and markets in parallel for speed
            const [eventMap, markets] = await Promise.all([
                this.fetchAllEvents(timestamp),
                this.fetchAllMarkets(),
            ]);

            // Enrich markets with real category/subcategory from their event
            const enriched = markets.map(m => {
                const event = eventMap.get(m.event_ticker);
                return {
                    ...m,
                    category: event?.category || m.category || 'General',
                    subcategory: event?.subcategory || m.subcategory || '',
                };
            });

            this.marketsCache = { data: enriched, timestamp };
            this.saveDiskCache(enriched, timestamp);
            this.fetchInProgress = null;
            return enriched;
        } catch (error) {
            this.fetchInProgress = null;
            // On failure, return stale cache if available
            return this.marketsCache?.data ?? [];
        }
    }

    private static MAX_PAGES = 2; // 2 pages = ~2000 markets, plenty
    private static FETCH_TIMEOUT = 6000; // 6s per request

    private static async fetchWithTimeout(url: string): Promise<Response> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT);
        try {
            return await fetch(url, { signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
    }

    private static async fetchAllMarkets(): Promise<KalshiMarket[]> {
        const all: KalshiMarket[] = [];
        let cursor = '';
        let pages = 0;
        while (pages < this.MAX_PAGES) {
            const url = `${this.BASE_URL}/markets?limit=1000&status=open${cursor ? `&cursor=${cursor}` : ''}`;
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) break;
            const data = await response.json() as any;
            const batch = (data.markets || []).map((m: any) => ({
                ticker: m.ticker,
                event_ticker: m.event_ticker || '',
                title: m.title,
                subtitle: m.subtitle || '',
                category: m.category || '',
                subcategory: m.sub_title || '',
                yes_bid: m.yes_bid || 0,
                yes_ask: m.yes_ask || 0,
                status: m.status,
            }));
            all.push(...batch);
            cursor = data.cursor;
            pages++;
            if (!cursor) break;
        }
        return all;
    }

    private static async fetchAllEvents(timestamp: number): Promise<Map<string, KalshiEvent>> {
        const now = Date.now();
        if (this.eventsCache && (now - this.eventsCache.timestamp) < this.CACHE_TTL) {
            return this.eventsCache.data;
        }

        const map = new Map<string, KalshiEvent>();
        let cursor = '';
        let pages = 0;
        while (pages < this.MAX_PAGES) {
            const url = `${this.BASE_URL}/events?limit=200&status=open${cursor ? `&cursor=${cursor}` : ''}`;
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) break;
            const data = await response.json() as any;
            for (const e of (data.events || [])) {
                map.set(e.event_ticker, {
                    event_ticker: e.event_ticker,
                    title: e.title,
                    category: e.category || 'General',
                    subcategory: e.sub_title || e.mutually_exclusive_sub_title || '',
                    markets: [],
                });
            }
            cursor = data.cursor;
            pages++;
            if (!cursor) break;
        }

        this.eventsCache = { data: map, timestamp };
        return map;
    }

    public static getIndexingProgress(): number {
        return this.marketsCache?.data.length ?? 0;
    }
}