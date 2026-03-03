# 🤖 Maverick Skills: Fine Terminal Agentic Wallet

This project empowers AI agents with the following specialized skills for autonomous on-chain operation.

## 1. 👝 Wallet Mastery
- **Skill**: `manage_solana_keys`
- **Description**: Ability to programmatically generate keypairs, securely reconstruct wallets from Base58 secret keys, and track balances (SOL/USDC).
- **Execution**: `src/core/walletManager.ts`

## 2. ✍️ Transaction Sovereignty
- **Skill**: `sign_and_send_transactions`
- **Description**: Autonomous signing and broadcast of transactions to Solana Devnet without human intervention. Includes retry logic for RPC errors.
- **Execution**: `src/core/transactionSigner.ts`

## 3. 🏦 Protocol: Ajo Savings
- **Skill**: `participate_in_ajo`
- **Description**: Automated participation in the "Ajo" (Nigerian Rotating Savings) protocol. Agents track contribution cycles and know when to collect the global payout.
- **Execution**: `src/protocols/ajoManager.ts`

## 4. 🤝 Peer-to-Peer Social Funding
- **Skill**: `request_and_grant_loans`
- **Description**: Inter-agent communication where high-balance agents autonomously lend SOL to low-balance agents to keep the ecosystem liquid.
- **Execution**: `src/core/communicationModule.ts`

## 5. 🎯 Prediction Market Trading
- **Skill**: `trade_kalshi_markets`
- **Description**: Deep-scanning of Kalshi/DFlow tokenized prediction markets. Ability to buy YES/NO shares based on AI-derived market sentiment.
- **Execution**: `src/agents/predictionBot.ts`

## 6. 🧠 Cognitive Reasoning & Audit
- **Skill**: `market_intelligence_audit`
- **Description**: Generation of human-readable financial advice for every on-chain action. Maintains a strictly append-only `history.json` for full transparency.
- **Execution**: `src/intelligence/reasoningEngine.ts`
