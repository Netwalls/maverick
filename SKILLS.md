# Maverick Agent Skills

This document describes the on-chain capabilities available to Maverick AI agents. Each skill maps to real Solana devnet transactions.

## 1. Wallet Management

**Skill**: `create_and_manage_wallet`
**File**: `src/core/walletManager.ts`

- Generate Solana keypairs programmatically (`Keypair.generate()`)
- Persist keys to `.env` for identity across restarts
- Query real SOL balance from chain (`connection.getBalance()`)
- Query SPL token balances (USDC via Associated Token Accounts)
- Request devnet SOL airdrops (`connection.requestAirdrop()`)

## 2. Transaction Signing

**Skill**: `sign_and_send_transactions`
**File**: `src/core/transactionSigner.ts`

- Build and sign Solana transactions without human intervention
- Fresh blockhash fetching to prevent expiry errors
- Graceful handling of block height exceeded — verifies tx landed on-chain before reporting failure
- Supports both SOL transfers and custom instruction transactions

## 3. SPL Token Operations

**Skill**: `manage_spl_tokens`
**File**: `src/core/tokenService.ts`

- Create Associated Token Accounts (ATAs) on demand
- Transfer SPL tokens (USDC) between any wallets
- Query token balances for any mint
- Uses Circle's official devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

## 4. AMM Swaps

**Skill**: `swap_via_amm`
**File**: `src/protocols/maverickAMM.ts`

- Swap SOL to USDC and USDC to SOL via constant-product AMM (x * y = k)
- 0.3% swap fee
- Real two-step atomic flow:
  - SOL->USDC: Agent sends SOL to vault, vault sends USDC to agent
  - USDC->SOL: Agent sends USDC to vault, vault sends SOL to agent
- Provide liquidity by depositing SOL + USDC (earn LP shares)
- Quote engine for swap previews before execution

## 5. Bank Operations (Ajo Savings)

**Skill**: `participate_in_bank`
**File**: `src/protocols/maverickBank.ts`

- **Deposit**: Transfer SOL from agent wallet to vault (real tx)
- **Loan**: Vault transfers SOL to agent (vault keypair signs)
- **Payback**: Agent transfers loan + 5% interest back to vault
- **Withdraw**: Vault transfers contribution back to agent
- **Rotating Payouts**: Periodic rewards distributed from vault interest
- **Contribution Collection**: Automated collection from all participants

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

- Dynamic discovery: scan `.env` for `*_PRIVATE_KEY` patterns
- Create new agents at runtime (generate keypair, save to `.env`, register)
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

## 11. Audit Trail

**Skill**: `maintain_audit_log`
**File**: `src/utils/historyProvider.ts`

- Append-only `history.json` recording every action
- Fields: timestamp, agent address, action type, description, tx signature, reasoning
- Queryable per-agent via `npm run history -- <Name>`
- Full transparency: every on-chain action is traceable

## Agent Capabilities Summary

| Capability | Real On-Chain | Autonomous | Multi-Agent |
|-----------|:---:|:---:|:---:|
| Wallet creation | Yes | Yes | Yes |
| SOL transfers | Yes | Yes | Yes |
| USDC transfers | Yes | Yes | Yes |
| AMM swaps | Yes | Yes | Yes |
| Bank deposit/loan | Yes | Yes | Yes |
| Prediction bets | Yes | Yes | Yes |
| Fund requests | Yes | Yes | Yes |
| Peer lending | Yes | Yes | Yes |
| Audit logging | Yes | Yes | Yes |
