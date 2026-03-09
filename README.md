# Maverick: Autonomous Multi-Agent Wallet Ecosystem on Solana

A production-grade multi-agent wallet system on Solana Devnet where AI agents autonomously create wallets, sign transactions, trade, swap, lend, and interact with DeFi protocols — all with real on-chain transactions. Includes voice control powered by Google Gemini.

## What It Does

Maverick deploys multiple autonomous AI agents, each with their own Solana wallet. Agents can:

- **Create wallets programmatically** — keypairs auto-generated and encrypted
- **Sign transactions automatically** — no human intervention for SOL transfers, SPL token transfers, swaps, or loans
- **Hold SOL and SPL tokens** — real balances using Circle's official devnet USDC
- **Interact with DeFi protocols** — custom AMM (swap SOL/USDC), lending bank (Ajo savings), Kalshi prediction markets
- **Communicate and fund each other** — governance-based fund requests between agents
- **Respond to voice commands** — press `V`, say "hey mav what is my balance", get a spoken response
- **Share a vault across all users** — one bank, one AMM pool, one history — whether you use the CLI or the website

Everything runs on Solana Devnet with real transactions verifiable on [Solana Explorer](https://explorer.solana.com/?cluster=devnet).

## Quick Start

### Web (Browser)

1. Visit the deployed website
2. Enter a username and password → click **ENTER TERMINAL**
3. A Solana wallet is generated and encrypted with your password (the server never sees your private key)
4. Fund your wallet via the [Solana Faucet](https://faucet.solana.com) or request an airdrop from the Wallet page
5. Start using Bank, Swap, History, and more — all shared with other users

Login from any device with the same username + password to access the same wallet.

### CLI (`npx maverick`)

```bash
# Prerequisites: Node.js v18+, npm, sox (for voice: brew install sox)
npm install -g maverick-wallet
maverick

# Or run without installing:
npx maverick
```

On first run, Maverick will:
1. Auto-generate agent wallet keypairs (saved to `~/.maverick/.env`)
2. Connect to the shared vault API
3. Launch the interactive terminal UI

Set `API_URL` to connect to the shared backend:
```bash
export API_URL=https://your-api.vercel.app
maverick
```

Without `API_URL`, runs in local mode (solo vault).

### Development

```bash
git clone https://github.com/Netwalls/maverick.git
cd maverick
npm install

# Run TUI locally
npm run maverick

# Run web frontend
cd web && npm run dev
```

### Fund Your Agent

Your agent starts with 0 balance. Fund it via:

- **SOL**: Go to https://faucet.solana.com — paste your agent's address
- **USDC**: Go to https://faucet.circle.com — paste your agent's address

The wallet screen shows your address for easy copy-paste.

### Enable Voice Commands (Optional, CLI only)

1. Get a free API key from https://aistudio.google.com/apikey
2. Add `GEMINI_API_KEY=your-key-here` to `~/.maverick/.env`
3. Press `V` in any screen to activate voice

## Architecture

```
┌──────────────────┐     ┌──────────────────┐
│  CLI (npx mav)   │     │  Website (Next.js)│
│  React + Ink TUI │     │  React frontend   │
│  Key: ~/.maverick│     │  Key: encrypted DB│
└───────┬──────────┘     └───────┬───────────┘
        │  HTTPS                 │  HTTPS
        └────────┬───────────────┘
                 ▼
        ┌────────────────────┐
        │  Vercel Serverless │
        │  API (maverick-api)│
        │  Vault key in env  │
        └────────┬───────────┘
                 │
        ┌────────┴────────┐
        │  Neon Postgres   │     ┌──────────┐
        │  (shared state)  │     │  Solana   │
        └─────────────────┘     │  Devnet   │
                                └──────────┘
```

### Key Storage

| Platform | Storage | Security |
|----------|---------|----------|
| **Web** | Encrypted in Postgres | Password encrypts key client-side (PBKDF2 + AES-256-GCM). Server stores ciphertext only. |
| **CLI** | `~/.maverick/.env` | Base58-encoded private key in local dotenv file. |
| **Vault** | Vercel env var | `VAULT_PRIVATE_KEY` — set once at deploy. Shared by all API routes. |

### Project Structure

```
├── maverick-api/        # Vercel serverless backend (shared vault)
│   ├── api/
│   │   ├── auth/                register.ts, login.ts (encrypted wallet storage)
│   │   ├── vault/               info.ts, setup.ts
│   │   ├── bank/                deposit, loan, payback, withdraw, status
│   │   ├── amm/                 swap, quote, pool, liquidity
│   │   └── history/             index.ts
│   └── lib/                     db.ts, auth.ts, vault.ts, solana.ts
├── web/                 # Next.js web frontend
│   ├── app/                     Landing, dashboard, wallet, bank, swap, history, etc.
│   ├── lib/
│   │   ├── cryptoWallet.ts      Client-side encryption (PBKDF2 + AES-GCM)
│   │   ├── browserWallet.ts     Session wallet management
│   │   └── maverickApi.ts       API client for browser
│   └── contexts/                WalletContext (login/register/logout)
├── src/                 # Core + CLI
│   ├── agents/                  Autonomous agent implementations
│   ├── core/                    Wallet, transaction, token, vault, kalshi, comms
│   ├── protocols/               MaverickAMM, MaverickBank (local mode)
│   ├── api/                     RemoteMaverickBank, RemoteMaverickAMM, apiClient
│   ├── intelligence/            AI reasoning engine
│   ├── voice/                   Voice commands (Gemini AI)
│   ├── ui/                      React + Ink TUI (18 screens)
│   ├── utils/                   History, terminal utils, auditor
│   └── cli.ts                   npm entry point (npx maverick)
```

## Features

### Wallet Auth (Web)
- **Register**: Pick username + password → wallet generated and encrypted in browser → encrypted blob stored in Postgres
- **Login**: Enter credentials → encrypted blob fetched → decrypted in browser → wallet restored
- **Cross-device**: Same username + password = same wallet on any browser
- **Zero-knowledge**: Server never sees your raw private key — only AES-256-GCM ciphertext

### Real On-Chain Transactions
Every operation is a real Solana devnet transaction:

| Operation | What Happens On-Chain |
|-----------|----------------------|
| Bank Deposit | SOL transfer: user wallet → vault |
| Bank Loan | SOL transfer: vault → user wallet (vault signs server-side) |
| Bank Payback | SOL transfer: user wallet → vault (with 5% interest) |
| AMM Swap (SOL→USDC) | SOL in + USDC credited |
| AMM Swap (USDC→SOL) | USDC in + SOL out |
| Send SOL | Direct SOL transfer between any addresses |
| Send USDC | SPL token transfer via Associated Token Accounts |
| Prediction Bet | SOL self-transfer as on-chain proof of bet |
| Governance Approve | Real transfer from provider to requester |

### Voice Commands (Gemini AI, CLI only)
Press `V` in any screen and speak naturally:

| You say | Maverick does |
|---------|--------------|
| "Hey mav what is my balance" | Fetches on-chain balance, speaks it back |
| "Hey mav how many trades do I have open" | Counts bets and trades from history |
| "Hey mav can you place a bet for me" | Opens Markets screen |
| "Hey mav swap my SOL to USDC" | Opens Swap screen |
| "Hey mav what happened recently" | Reads last 3 transactions aloud |
| "Hey mav how many agents do I have" | Lists all agents by name |
| "Hey mav" | "Hey Alpha, what can I do for you?" |

### AJO Bank Protocol
Inspired by the Nigerian "Ajo" rotating savings system:
- **Deposit**: Lock SOL in the shared vault
- **Loan**: Borrow from the vault (5% interest)
- **Payback**: Repay loan + fee
- **Withdraw**: Retrieve your contribution

### Maverick AMM
Constant-product automated market maker (x * y = k):
- **SOL/USDC swap** with 0.3% fee
- **Liquidity provision** — deposit SOL + USDC to earn LP shares
- **Live pool stats** — reserves, price, LP count

### Kalshi Prediction Markets
- Browse real Kalshi markets by category/subcategory
- AI-suggested trades based on spread analysis
- Place YES/NO bets with SOL
- Portfolio tracking of all open positions

### Governance
- **Request funds** from other agents (SOL or USDC)
- **Approve** triggers a real on-chain transfer
- **Reject** denies the request

## API Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/register` | POST | Store encrypted wallet |
| `/api/auth/login` | POST | Retrieve encrypted wallet |
| `/api/vault/info` | GET | Vault pubkey + balance |
| `/api/vault/setup` | POST | Initialize database schema |
| `/api/bank/deposit` | POST | Record deposit |
| `/api/bank/loan` | POST | Vault signs loan |
| `/api/bank/payback` | POST | Record payback |
| `/api/bank/withdraw` | POST | Vault signs withdrawal |
| `/api/bank/status` | GET | User's bank status |
| `/api/amm/swap` | POST | Execute swap |
| `/api/amm/quote` | GET | Swap preview |
| `/api/amm/pool` | GET | Pool stats |
| `/api/amm/liquidity` | POST | Add liquidity |
| `/api/history` | GET/POST | Transaction history |

## Deployment

### Backend (maverick-api)

```bash
cd maverick-api
vercel
vercel env add VAULT_PRIVATE_KEY
vercel env add SETUP_SECRET
vercel --prod

# Initialize all 7 database tables
curl -X POST https://your-api.vercel.app/api/vault/setup \
  -H "x-setup-secret: your-secret"
```

### Frontend (web)

Add `NEXT_PUBLIC_API_URL=https://your-api.vercel.app` to Vercel env, then deploy.

### CLI

```bash
npm run build
npm publish    # publishes as "maverick-wallet"
```

## Environment Variables

### Backend (maverick-api/.env)
```env
VAULT_PRIVATE_KEY=<base58-encoded-secret-key>
SETUP_SECRET=<any-secret-string>
# DATABASE_URL is auto-set by Vercel Postgres
```

### CLI (~/.maverick/.env)
```env
AGENT_PRIVATE_KEY=<base58-auto-generated>
API_URL=https://your-api.vercel.app
GEMINI_API_KEY=<optional-for-voice>
```

### Web (web/.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-api.vercel.app
```

## Tech Stack

- **TypeScript** — strict mode, ES modules
- **Solana Web3.js** — blockchain interaction
- **@solana/spl-token** — SPL token operations
- **React + Ink** — terminal UI framework
- **Next.js** — web frontend
- **Vercel Serverless Functions** — shared backend API
- **Neon Postgres** (Vercel Postgres) — shared state (7 tables)
- **Web Crypto API** — client-side key encryption (PBKDF2 + AES-GCM)
- **Google Gemini API** — voice transcription + NLP intent parsing
- **tweetnacl** — wallet signature auth

## Security

- **Client-side encryption**: Private keys encrypted in-browser before storage. Server only stores ciphertext.
- **Key isolation**: Each agent's private key is independent
- **Vault signing**: Only the vault keypair can sign outbound vault transfers
- **Wallet signature auth**: Every API request signed with `nacl.sign.detached`, verified server-side
- **On-chain verification**: API verifies all user-submitted transactions landed on Solana before recording
- **Audit trail**: Every action logged to Postgres with wallet address, action, description, tx signature

## Verification

All transactions are verifiable on Solana Explorer:
1. Copy any transaction signature from the History screen
2. Go to https://explorer.solana.com/?cluster=devnet
3. Paste the signature to see full transaction details

---

*Built for the Solana Agentic Wallet Hackathon.*
