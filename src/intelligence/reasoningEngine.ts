export enum MarketSentiment {
    BULLISH = 'BULLISH',
    BEARISH = 'BEARISH',
    NEUTRAL = 'NEUTRAL'
}

export class ReasoningEngine {
    private advicePool: Record<MarketSentiment, string[]> = {
        [MarketSentiment.BULLISH]: [
            "Market conditions indicate high confidence. It's an optimal time for capital deployment.",
            "Liquidity flows are positive. Increasing exposure to capture upside potential.",
            "Sentiment is strong. Risk-on behavior is historically profitable in this regime."
        ],
        [MarketSentiment.BEARISH]: [
            "Caution is advised. Liquidity is tightening, moving to defensive positions.",
            "High volatility detected. Reducing risk exposure to preserve capital.",
            "Market sentiment is weak. Strategic hedging or staying in liquid assets is recommended."
        ],
        [MarketSentiment.NEUTRAL]: [
            "Sideways movement expected. Maintaining current positions until a clearer trend emerges.",
            "Market is searching for direction. Strategic patience is a valid trading strategy here.",
            "Equilibrium reached. Monitoring news cycles for the next breakout signal."
        ]
    };

    public generateAdvice(action: string, sentiment: MarketSentiment, balance: number): string {
        const advices = this.advicePool[sentiment] || this.advicePool[MarketSentiment.NEUTRAL];
        const randomAdvice = advices[Math.floor(Math.random() * advices.length)];
        return `[\x1b[35mMAVERICK ADVICE\x1b[0m]: Based on current ${sentiment} sentiment and your balance of ${balance.toFixed(4)} SOL, my analysis is: ${randomAdvice}`;
    }

    public generateWelcome(name: string): string {
        const welcomes = [
            `Welcome to the space, ${name}! Ready to build some Maverick yield?`,
            `Greetings ${name}! Our Maverick economy just got stronger with you here.`,
            `Hey ${name}! Don't forget to contribute to the Maverick Bank Vault; it's our collective Maverick strength!`
        ];
        return `[\x1b[36mMAVERICK SOCIAL\x1b[0m]: ${welcomes[Math.floor(Math.random() * welcomes.length)]}`;
    }

    public getCapabilities(name: string): string {
        const cyan = "\x1b[36m";
        const yellow = "\x1b[33m";
        const reset = "\x1b[0m";
        const bold = "\x1b[1m";

        return `
${bold}${cyan}=== 🛠️ ${name.toUpperCase()}'S MAVERICK CAPABILITIES ===${reset}
${yellow}1. 📈 Autonomous Trading (Based on Sentiment)${reset}
${yellow}2. 🏦 Maverick Bank (Lending & Savings Protocol)${reset}
${yellow}3. 🤝 Peer Lending (Borrow/Lend SOL)${reset}
${yellow}4. 📝 Action History (Full Audit Trail)${reset}
${yellow}5. 🤖 Prediction Bets (Event Markets)${reset}
${bold}${cyan}=============================================${reset}
`;
    }

    public getSimulatedSentiment(): MarketSentiment {
        const sentiments = [MarketSentiment.BULLISH, MarketSentiment.BEARISH, MarketSentiment.NEUTRAL];
        return sentiments[Math.floor(Math.random() * sentiments.length)] as MarketSentiment;
    }
}
