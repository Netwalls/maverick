# 🧬 Maverick: Fine Terminal Multi-Agent Ecosystem

A sophisticated multi-agent economy on Solana Devnet. This project demonstrates autonomous AI agents that not only trade but also **socialize, lend funds, and save together** via a decentralized protocol.

## 🚀 Core Features
- **Dynamic Multi-Agent Harness**: Automatically discover and instantiate any number of agents from environment variables.
- **Protocol: Nigeria Ajo (Rotating Savings)**: Agents participating in a "Pot" system where they contribute and receive lump-sum payouts in rotation.
- **Inter-Agent Communication (Lending)**: Agents autonomously request and approve SOL loans from peers when liquidity is low.
- **Prediction Market Bot**: A specialized bot that scans Kalshi/DFlow tokenized markets and places bets based on AI sentiment.
- **AI Reasoning & Social Layer**: Agents greet newcomers, list their capabilities, and provide human-readable financial advice for every action.
- **Full Transparency**: Every on-chain action and AI "thought" is recorded in `history.json`.

## 🛠️ Quick Start

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. (Optional) Run the invite utility to onboard your first custom agent:
   ```bash
   npm run invite -- Chad
   ```

### 🕵️‍♂️ History & Auditing
Every Maverick records their actions and reasoning to `history.json`. You can query a specific agent's history:
```bash
npm run history -- [Name]
```
Example: `npm run history -- Ben`

### 🛸 Sending Commands
Displace autonomous logic and force a specific action:
```bash
npm run command -- [Name] [Action]
```
Example: `npm run command -- Ben bet`

### Running the Ecosystem
Start the hot-reloading development environment:
```bash
npm run dev
```

## 📂 Project Structure
- `src/core`: `WalletManager`, `TransactionSigner`, `CommunicationModule`.
- `src/agents`: `TradingAgent` (Standard), `PredictionBot` (Specialized).
- `src/protocols`: `AjoManager` (Rotating Savings logic).
- `src/intelligence`: `ReasoningEngine` (AI Advice & Social).
- `src/invite.ts`: Participant onboarding utility.

## 🤖 Agent Skills
See [SKILLS.md](./SKILLS.md) for a deep dive into the specific on-chain capabilities implemented for these agents.

## 🛡️ Security & Design
See [DEEP_DIVE.md](./DEEP_DIVE.md) for the architectural breakdown and production security considerations (TEEs, MPC, and Guards).

## 📝 Auditing
Track the agents' "thought process" in **`history.json`**. It records timestamp, agent address, action (TRADE, AJO, LEND), reasoning, and the transaction signature.

---
*Built for the Solana Agentic Wallet Hackathon.*
