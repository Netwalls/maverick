export interface Market {
    id: string;
    name: string;
    description: string;
    category: string;
}

export const MarketRegistry: Market[] = [
    // --- SPORTS ---
    { id: 'NBA-6MAN-2026', name: 'Will Reed Sheppard win the 2025–2026 NBA Sixth Man', description: 'Settles YES if Reed Sheppard wins.', category: 'Sports' },
    { id: 'CHAMPIONS-LEAGUE-BARCA', name: 'Will Barcelona win the 2025–26 Champions League?', description: 'Settles YES if Barca wins.', category: 'Sports' },
    { id: 'NFL-MVP-2026', name: 'Will CJ Stroud win NFL MVP 2025-26?', description: 'Settles YES if Stroud is MVP.', category: 'Sports' },
    { id: 'PREMIER-LEAGUE-ARSNL', name: 'Will Arsenal win the Premier League 2025-26?', description: 'Settles YES if Arsenal finishes 1st.', category: 'Sports' },
    { id: 'WIMBLEDON-MEN-2026', name: 'Will Carlos Alcaraz win Wimbledon 2026 Men\'s?', description: 'Settles YES if Alcaraz wins.', category: 'Sports' },
    { id: 'F1-CHAMP-2026', name: 'Will Max Verstappen win the 2026 F1 Championship?', description: 'Settles YES if Max is champ.', category: 'Sports' },
    { id: 'UCL-WINNER-RMD', name: 'Real Madrid to win the Champions League?', description: 'Settles YES if Real Madrid wins.', category: 'Sports' },
    { id: 'NBA-CHAMP-CELTS', name: 'Boston Celtics win back-to-back NBA titles?', description: 'Settles YES if Celtics win.', category: 'Sports' },

    // --- CRYPTO ---
    { id: 'BTC-100K-JUNE', name: 'Will BTC hit $100k by June 30?', description: 'Settles YES if BTC touches $100,000.', category: 'Crypto' },
    { id: 'ETH-ETF-STAKING', name: 'Will ETH Staking be approved for ETFs by July?', description: 'Settles YES if approved.', category: 'Crypto' },
    { id: 'SOL-ATH-2026', name: 'Will Solana hit an All-Time High in 2026?', description: 'Settles YES if SOL > $260.', category: 'Crypto' },
    { id: 'METAMASK-TOKEN-2026', name: 'Will MetaMask launch a token by June 30?', description: 'Settles YES if token launches.', category: 'Crypto' },
    { id: 'MEGAETH-FDV-6B', name: 'MegaETH market cap (FDV) >$6B at launch?', description: 'Settles YES if FDV exceeds $6B.', category: 'Crypto' },
    { id: 'SUI-TOP-10', name: 'Will SUI enter the top 10 crypto by market cap?', description: 'Settles YES if SUI in top 10.', category: 'Crypto' },
    { id: 'USDC-DOMINANCE-30', name: 'USDC dominance > 30% of stablecoin market?', description: 'Settles YES if dominance > 30%.', category: 'Crypto' },
    { id: 'BASE-L2-TOKEN', name: 'Will Base L2 announce a network token in 2026?', description: 'Settles YES if token is announced.', category: 'Crypto' },

    // --- POLITICS ---
    { id: 'ISRAEL-ANNEX-2026', name: 'Will Israel annex any territory by June 30?', description: 'Settles YES if annexation occurs.', category: 'Politics' },
    { id: 'RUSSIA-UKRAINE-CEASEFIRE', name: 'Russia x Ukraine ceasefire by March 31, 2026?', description: 'Settles YES if officially announced.', category: 'Politics' },
    { id: 'US-RATE-CUT-JULY', name: 'Will the Fed cut interest rates in July 2026?', description: 'Settles YES if cut happens.', category: 'Politics' },
    { id: 'CHINA-GDP-GROWTH-2026', name: 'Will China official GDP growth exceed 5% in 2026?', description: 'Settles YES if > 5%.', category: 'Politics' },
    { id: 'UK-ELECTION-2026', name: 'Will Labour maintain majority in 2026 UK local elections?', description: 'Settles YES if Labour wins.', category: 'Politics' },
    { id: 'EU-AI-ACT-SANCTIONS', name: 'Will a Big Tech firm be fined $1B+ under EU AI Act?', description: 'Settles YES if fine > $1B.', category: 'Politics' },

    // --- TECH & AI ---
    { id: 'GPT-5-LAUNCH-Q2', name: 'Will GPT-5 be officially released by OpenAI in Q2?', description: 'Settles YES if GPT-5 launches.', category: 'Tech' },
    { id: 'OPENAI-FEDERAL-BACKSTOP', name: 'OpenAI receives federal backstop for infrastructure?', description: 'Settles YES if confirmed.', category: 'Tech' },
    { id: 'APPLE-VISION-PRO-3K', name: 'Apple Vision Pro (Budget) released under $1500?', description: 'Settles YES if released < $1500.', category: 'Tech' },
    { id: 'TSLA-FSD-L5', name: 'Will Tesla announce Level 5 autonomy by end of 2026?', description: 'Settles YES if L5 announced.', category: 'Tech' },
    { id: 'STARSHIP-MARS-LAND', name: 'Will Starship successfully land on Mars (uncrewed)?', description: 'Settles YES if uncrewed landing.', category: 'Tech' },
    { id: 'GOOGLE-GEMINI-AIARENT', name: 'Gemini agents to handle 10%+ of customer support?', description: 'Settles YES if milestone hit.', category: 'Tech' },

    // --- ENTERTAINMENT ---
    { id: 'SINNERS-BEST-PICTURE', name: 'Will Sinners win Best Picture at the 98th Academy?', description: 'Settles YES if it wins Oscar.', category: 'Entertainment' },
    { id: 'GTA6-DELAY-2027', name: 'Will GTA VI be delayed to 2027?', description: 'Settles YES if 2027 delay confirmed.', category: 'Entertainment' },
    { id: 'MARVEL-AVENGERS-CAST', name: 'Will RDJ return as Doom in Avengers 2026?', description: 'Settles YES if confirmed.', category: 'Entertainment' },
    { id: 'NETFLIX-ADS-REV-2X', name: 'Will Netflix ad revenue double in 2026?', description: 'Settles YES if revenue doubles.', category: 'Entertainment' }
];
