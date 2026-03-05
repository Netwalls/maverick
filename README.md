# Maverick: Autonomous Multi-Agent Wallet Ecosystem on Solana

A production-grade multi-agent wallet system on Solana Devnet where AI agents autonomously create wallets, sign transactions, trade, swap, lend, and interact with DeFi protocols — all with real on-chain transactions.

## What It Does

Maverick deploys multiple autonomous AI agents, each with their own Solana wallet. Agents can:

- **Create wallets programmatically** — keypairs auto-generated and persisted to `.env`
- **Sign transactions automatically** — no human intervention for SOL transfers, SPL token transfers, swaps, or loans
- **Hold SOL and SPL tokens** — real balances using Circle's official devnet USDC
- **Interact with DeFi protocols** — custom AMM (swap SOL/USDC), lending bank (Ajo savings), Kalshi prediction markets
- **Communicate and fund each other** — governance-based fund requests between agents

Everything runs on Solana Devnet with real transactions verifiable on [Solana Explorer](https://explorer.solana.com/?cluster=devnet).

## Quick Start

### Prerequisites
- Node.js v18+
- npm

### Installation

```bash
git clone <repo-url>
cd maverick
npm install
```

### Launch the TUI

```bash
npm run maverick
```

On first run, Maverick will:
1. Auto-generate a wallet keypair (saved to `.env`)
2. Create a vault keypair for the AJO Bank
3. Launch the interactive terminal UI

### Fund Your Agent

Your agent starts with 0 balance. Fund it via:

- **SOL**: Go to https://faucet.solana.com — paste your agent's address
- **USDC**: Go to https://faucet.circle.com — paste your agent's address

The wallet screen shows both faucet links and your address for easy copy-paste.

### Fund the AJO Bank Vault

For swaps and loans to work, the vault needs liquidity. Fund the vault address (shown at startup) via the same faucets.

## Architecture

```
src/
├── agents/           # Autonomous agent implementations
│   ├── baseAgent.ts          Base agent class
│   ├── maverickAgent.ts      Main agent (trading + betting)
│   ├── tradingAgent.ts       SOL trading specialist
│   └── predictionBot.ts      Kalshi market prediction bot
├── core/             # Wallet & transaction infrastructure
│   ├── walletManager.ts      Programmatic wallet creation & management
│   ├── transactionSigner.ts  Autonomous transaction signing with retry
│   ├── tokenService.ts       SPL token operations (USDC transfers)
│   ├── vaultManager.ts       Shared vault for bank & AMM
│   ├── kalshiService.ts      Kalshi prediction market integration
│   ├── communicationModule.ts Inter-agent communication
│   └── agentRegistry.ts      Agent discovery & registration
├── protocols/        # DeFi protocol implementations
│   ├── maverickAMM.ts        Constant-product AMM (SOL/USDC swaps)
│   └── maverickBank.ts       Ajo savings bank (deposit/loan/payback)
├── intelligence/     # AI reasoning layer
│   └── reasoningEngine.ts    Decision justification & social logic
├── ui/               # Terminal UI (React + Ink)
│   ├── main.tsx              App entry point & bootstrap
│   ├── App.tsx               Router & screen management
│   ├── context/              React contexts (services, navigation)
│   ├── hooks/                Custom hooks (balance, markets, governance)
│   └── components/
│       ├── screens/          18 interactive screens
│       ├── shared/           Reusable UI components
│       └── layout/           Screen layout & navigation
└── utils/            # CLI tools & history
    ├── historyProvider.ts    Append-only transaction audit log
    ├── terminalUtils.ts      Terminal formatting
    └── auditor.ts            History query tool
```

## Features

### Agentic Wallet Management
- **Programmatic wallet creation**: `Keypair.generate()` with auto-persist to `.env`
- **Dynamic agent discovery**: Any `*_PRIVATE_KEY` in `.env` becomes an agent
- **Active agent switching**: Select which agent operates from the home screen
- **Invite system**: Create new agents on-the-fly from the TUI

### Real On-Chain Transactions
Every operation is a real Solana devnet transaction:

| Operation | What Happens On-Chain |
|-----------|----------------------|
| Bank Deposit | SOL transfer: agent wallet -> vault |
| Bank Loan | SOL transfer: vault -> agent wallet (vault signs) |
| Bank Payback | SOL transfer: agent wallet -> vault (with interest) |
| AMM Swap (SOL->USDC) | SOL in + SPL USDC out |
| AMM Swap (USDC->SOL) | SPL USDC in + SOL out |
| Send SOL | Direct SOL transfer between any addresses |
| Send USDC | SPL token transfer via Associated Token Accounts |
| Prediction Bet | SOL self-transfer as on-chain proof of bet |

### AJO Bank Protocol
Inspired by the Nigerian "Ajo" rotating savings system:
- **Deposit**: Lock SOL in the shared vault
- **Loan**: Borrow from the vault (5% interest)
- **Payback**: Repay loan + fee
- **Withdraw**: Retrieve your contribution
- **Rotating Payouts**: Periodic rewards from vault interest

### Maverick AMM
Constant-product automated market maker (x * y = k):
- **SOL/USDC swap** with 0.3% fee
- **Liquidity provision** — deposit SOL + USDC to earn LP shares
- **Live pool stats** — reserves, price, LP count
- **Vault balance check** — warns when liquidity is low

### Kalshi Prediction Markets
- Browse real Kalshi markets by category/subcategory
- AI-suggested trades based on spread analysis
- Place YES/NO bets with SOL
- Portfolio tracking of all open positions
- Disk cache for instant market loading on subsequent launches

### Governance
- **Request funds** from other agents (SOL or USDC)
- Requests appear in the Governance screen for approval
- **Approve** triggers a real on-chain transfer from provider to requester
- **Reject** denies the request

### Terminal UI
Full interactive TUI built with React + Ink:
- 18 screens: Home, Wallet, Send, Swap, Bank, Markets, Portfolio, Agents, Invite, Governance, History, Settings
- Real-time balance display
- Transaction status with signatures
- Breadcrumb navigation

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run maverick` | Launch the interactive TUI |
| `npm run start:headless` | Run agents in autonomous headless mode |
| `npm run invite -- <Name>` | Onboard a new agent via CLI |
| `npm run command -- <Name> <Action>` | Send a command to an agent |
| `npm run history -- <Name>` | Query an agent's transaction history |

## Key Management

- Private keys stored in `.env` (gitignored)
- Each agent has its own keypair — no shared keys
- Vault keypair is separate from agent keypairs
- On first run, keys are auto-generated and persisted
- For production: keys should move to TEEs (Trusted Execution Environments) or use MPC (Multi-Party Computation)

## Security Considerations

See [DEEP_DIVE.md](./DEEP_DIVE.md) for full architecture and security analysis.

- **Key isolation**: Each agent's private key is independent
- **Vault signing**: Only the vault keypair can sign outbound vault transfers
- **Transaction confirmation**: Handles block height expiry gracefully — verifies tx landed on-chain before reporting failure
- **No auto-funding**: Agents start with 0 balance, funded via external faucet or peer transfer
- **Audit trail**: Every action logged to `history.json` with timestamp, address, action, description, and tx signature

## Environment Variables

```env
# Agent wallets (auto-generated on first run)
AGENT_PRIVATE_KEY=<base58-encoded-secret-key>
BETA_PRIVATE_KEY=<base58-encoded-secret-key>

# Agent types (optional)
AGENT_TYPE=trader
BETA_TYPE=trader

# Vault (auto-generated, shared bank/AMM pool)
VAULT_PRIVATE_KEY=<base58-encoded-secret-key>
```

## Token Support

- **SOL**: Native Solana token
- **USDC**: Circle's official devnet USDC (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)

## Verification

All transactions are verifiable on Solana Explorer:
1. Copy any transaction signature from the History screen
2. Go to https://explorer.solana.com/?cluster=devnet
3. Paste the signature to see full transaction details

## Tech Stack

- **TypeScript** — strict mode, ES modules
- **Solana Web3.js** — blockchain interaction
- **@solana/spl-token** — SPL token operations
- **React + Ink** — terminal UI framework
- **Node.js** — runtime

---

*Built for the Solana Agentic Wallet Hackathon.*
