# Maverick Agent Skills

This document describes the on-chain capabilities available to Maverick AI agents. Each skill maps to real Solana devnet transactions.

---

## Architecture: Shared Vault

All users (CLI + Web) share ONE vault, ONE bank pool, ONE AMM, and ONE history database.

```
┌──────────────────┐     ┌──────────────────┐
│  CLI (npx mav)   │     │  Website (Next.js)│
│  React + Ink TUI │     │  React frontend   │
│                  │     │                   │
│  Key: ~/.maverick│     │  Key: localStorage│
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
        │  Vercel Postgres │     ┌──────────┐
        │  (shared state)  │     │  Solana   │
        └─────────────────┘     │  Devnet   │
                                └──────────┘
```

### Key Storage Per Platform

| Platform | Where keys live | Created when |
|----------|----------------|-------------|
| **CLI** (`npx maverick`) | `~/.maverick/.env` | First launch — auto-generated |
| **Web** (browser) | `localStorage("maverick_wallet_key")` | First page visit — auto-generated |
| **Vault** (server) | Vercel env `VAULT_PRIVATE_KEY` | Deploy-time — set once |

Users can **import/export** keys between platforms:
- Web: Wallet page has Export/Import buttons
- CLI: Copy the `AGENT_PRIVATE_KEY` from `~/.maverick/.env`
- Same private key = same wallet = same balances on both platforms

### Two-Phase Transaction Pattern

**User sends SOL to vault** (deposits, paybacks, swap inputs):
1. Client builds + signs tx locally (browser or CLI)
2. Client sends tx to Solana on-chain
3. Client POSTs tx signature to API
4. API verifies tx landed on-chain via `connection.getTransaction(sig)`
5. API records in Postgres

**Vault sends SOL to user** (loans, withdrawals, swap outputs):
1. Client POSTs request (wallet-signed for auth)
2. API builds tx, vault keypair signs server-side
3. API submits to Solana, returns signature
4. API records in Postgres

### API Authentication

Every POST includes a wallet signature:
```json
{
  "wallet": "base58-pubkey",
  "timestamp": 1234567890,
  "signature": "base64(nacl.sign.detached('maverick:<timestamp>', secretKey))"
}
```
Backend verifies with `nacl.sign.detached.verify()`. Timestamp must be within 60 seconds.

---

## 1. Wallet Management

**Skill**: `create_and_manage_wallet`
**Files**: `src/core/walletManager.ts`, `web/lib/browserWallet.ts`

- Generate Solana keypairs programmatically (`Keypair.generate()`)
- CLI: Persist keys to `~/.maverick/.env` for identity across restarts
- Web: Persist keys to `localStorage` for identity across sessions
- Query real SOL balance from chain (`connection.getBalance()`)
- Query SPL token balances (USDC via Associated Token Accounts)
- Request devnet SOL airdrops (`connection.requestAirdrop()`)
- Import/export private keys between CLI and Web

## 2. Transaction Signing

**Skill**: `sign_and_send_transactions`
**Files**: `src/core/transactionSigner.ts`, `src/api/apiClient.ts`

- Build and sign Solana transactions without human intervention
- Fresh blockhash fetching to prevent expiry errors
- Graceful handling of block height exceeded — verifies tx landed on-chain before reporting failure
- Supports both SOL transfers and custom instruction transactions
- Remote mode: client signs → API verifies on-chain

## 3. SPL Token Operations

**Skill**: `manage_spl_tokens`
**File**: `src/core/tokenService.ts`

- Create Associated Token Accounts (ATAs) on demand
- Transfer SPL tokens (USDC) between any wallets
- Query token balances for any mint
- Uses Circle's official devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

## 4. AMM Swaps

**Skill**: `swap_via_amm`
**Files**: `src/protocols/maverickAMM.ts` (local), `src/api/RemoteMaverickAMM.ts` (remote)

- Swap SOL to USDC and USDC to SOL via constant-product AMM (x * y = k)
- 0.3% swap fee
- Pool state stored in Postgres (shared across all users)
- Real two-step atomic flow:
  - SOL→USDC: User sends SOL to vault on-chain, API credits USDC
  - USDC→SOL: User sends USDC to vault, API sends SOL from vault
- Provide liquidity by depositing SOL + USDC (earn LP shares)
- Quote engine for swap previews before execution

## 5. Bank Operations (Ajo Savings)

**Skill**: `participate_in_bank`
**Files**: `src/protocols/maverickBank.ts` (local), `src/api/RemoteMaverickBank.ts` (remote)

- **Deposit**: User signs SOL transfer to vault on-chain → API verifies + records
- **Loan**: API builds tx, vault signs server-side → SOL sent to user
- **Payback**: User signs SOL transfer (principal + 5% fee) → API verifies + marks repaid
- **Withdraw**: API builds tx, vault signs → contributions returned to user
- All state in Postgres: contributions, loans, balances — shared across all users

## 6. Prediction Market Trading

**Skill**: `trade_prediction_markets`
**Files**: `src/core/kalshiService.ts`, `src/agents/predictionBot.ts`

- Browse Kalshi prediction markets by category and subcategory
- Fetch live YES/NO prices for any market
- AI-suggested trades based on spread analysis (highest spread = most opportunity)
- Place bets with SOL (recorded on-chain as proof)
- Portfolio tracking of all open positions with live price updates

## 7. Inter-Agent Communication

**Skill**: `request_and_send_funds`
**Files**: `src/core/communicationModule.ts`, `src/ui/hooks/useGovernance.ts`

- Request SOL or USDC from other agents via governance proposals
- Approve/reject funding requests
- On approval: real on-chain transfer executes automatically
- Autonomous peer lending: high-balance agents lend to low-balance agents

## 8. Agent Discovery and Onboarding

**Skill**: `discover_and_create_agents`
**Files**: `src/core/agentRegistry.ts`, `src/ui/components/screens/InviteScreen.tsx`

- Dynamic discovery: scan env for `*_PRIVATE_KEY` patterns
- CLI: Create new agents at runtime (generate keypair, save to `~/.maverick/.env`)
- Web: Single wallet per browser (import/export to share across devices)
- Agent types: Trader, Prediction Bot
- Each agent operates independently with its own wallet and strategy

## 9. Autonomous Trading

**Skill**: `execute_autonomous_trades`
**File**: `src/agents/maverickAgent.ts`

- Tick-based execution: each cycle the agent evaluates market conditions
- Standard SOL trades with position tracking
- Adaptive strategy: adjusts behavior based on balance and market state
- Profit/loss tracking per position
- Automatic airdrop request when balance is critically low

## 10. AI Reasoning

**Skill**: `generate_reasoning_and_advice`
**File**: `src/intelligence/reasoningEngine.ts`

- Generate human-readable justification for every trade decision
- Social onboarding: welcome messages and capability listing for new agents
- Market sentiment analysis for prediction markets
- Financial advice generation based on portfolio state

## 11. Voice Commands

**Skill**: `voice_control`
**Files**: `src/voice/voiceRecorder.ts`, `src/voice/voiceService.ts`, `src/ui/hooks/useVoice.ts`

- Press `V` to activate — records for 4 seconds, auto-processes
- Speech-to-text via Google Gemini Flash (free tier)
- Natural language intent parsing via Gemini — understands any phrasing
- Supported voice commands:
  - **Query balance**: "Hey mav what is my balance"
  - **Count trades**: "Hey mav how many trades do I have open"
  - **Recent activity**: "Hey mav what happened recently"
  - **Place bet**: "Hey mav can you place a bet for me"
  - **Navigate**: "Hey mav take me to swap" / "open the bank" / "show my portfolio"
  - **Airdrop**: "Hey mav give me some SOL"
  - **Agent info**: "Hey mav how many agents do I have"
  - **Greeting**: "Hey mav" → "Hey Alpha, what can I do for you?"
- Spoken response via macOS text-to-speech
- Graceful degradation: voice disabled if sox or API key is missing

## 12. Audit Trail

**Skill**: `maintain_audit_log`
**Files**: `src/utils/historyProvider.ts`, `maverick-api/lib/db.ts`

- Remote mode: history stored in Postgres (shared, queryable by all users)
- Local mode: append-only `history.json` recording every action
- Fields: timestamp, wallet address, action type, description, tx signature, reasoning
- Web: "Show all users" toggle to see global history
- Full transparency: every on-chain action is traceable

---

## API Endpoints

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/vault/info` | GET | No | Vault pubkey + SOL balance |
| `/api/vault/setup` | POST | Secret | Initialize database schema |
| `/api/bank/deposit` | POST | Wallet sig | Record deposit (verify tx on-chain) |
| `/api/bank/loan` | POST | Wallet sig | Vault signs loan tx server-side |
| `/api/bank/payback` | POST | Wallet sig | Record payback (verify tx on-chain) |
| `/api/bank/withdraw` | POST | Wallet sig | Vault signs withdraw tx server-side |
| `/api/bank/status` | GET | Wallet sig | User's contributions + loans |
| `/api/amm/swap` | POST | Wallet sig | Execute swap (vault signs output) |
| `/api/amm/quote` | GET | No | Swap preview |
| `/api/amm/pool` | GET | No | Pool reserves + stats |
| `/api/amm/liquidity` | POST | Wallet sig | Add liquidity |
| `/api/history` | GET/POST | No/Optional | Query/record history |

---

## Deployment Workflow

### 1. Deploy Backend

```bash
cd maverick-api
vercel                              # First deploy
vercel env add VAULT_PRIVATE_KEY    # Set vault key
vercel env add SETUP_SECRET         # Set setup secret
vercel --prod                       # Production deploy

# Initialize database
curl -X POST https://your-api.vercel.app/api/vault/setup \
  -H "x-setup-secret: your-secret"
```

### 2. Configure CLI

```bash
# Set API_URL to use shared vault (add to ~/.maverick/.env or shell)
export API_URL=https://your-api.vercel.app
npx maverick
```

Without `API_URL`, the CLI runs in **local mode** (original solo vault behavior).

### 3. Configure Web

Add to `web/.env.local`:
```
NEXT_PUBLIC_API_URL=https://your-api.vercel.app
```

### 4. Publish CLI

```bash
npm run build
npm publish    # publishes as "maverick-wallet"
# Users run: npx maverick
```

---

## Agent Capabilities Summary

| Capability | Real On-Chain | Autonomous | Multi-Agent | Shared Vault |
|-----------|:---:|:---:|:---:|:---:|
| Wallet creation | Yes | Yes | Yes | - |
| SOL transfers | Yes | Yes | Yes | Yes |
| USDC transfers | Yes | Yes | Yes | Yes |
| AMM swaps | Yes | Yes | Yes | Yes |
| Bank deposit/loan | Yes | Yes | Yes | Yes |
| Prediction bets | Yes | Yes | Yes | - |
| Fund requests | Yes | Yes | Yes | - |
| Peer lending | Yes | Yes | Yes | - |
| Voice commands | - | Yes | Yes | - |
| Audit logging | Yes | Yes | Yes | Yes |
