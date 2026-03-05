# Deep Dive: Maverick Architecture & Security

## Architecture Overview

Maverick is a four-layer system where each layer has a clear responsibility:

```
┌─────────────────────────────────────────────┐
│  UI Layer (React + Ink Terminal UI)          │
│  18 screens, navigation, real-time balance   │
├─────────────────────────────────────────────┤
│  Agent Layer (Autonomous Decision Making)    │
│  Trading, prediction bots, reasoning engine  │
├─────────────────────────────────────────────┤
│  Protocol Layer (DeFi Primitives)            │
│  AMM (x*y=k swaps), Bank (Ajo savings)      │
├─────────────────────────────────────────────┤
│  Core Layer (Wallet & Transaction Infra)     │
│  WalletManager, TransactionSigner, TokenSvc  │
└─────────────────────────────────────────────┘
         │
         ▼
   Solana Devnet (real on-chain transactions)
```

## Layer 1: Core — Wallet & Transaction Infrastructure

### WalletManager (`src/core/walletManager.ts`)

Each agent owns a `WalletManager` instance that wraps a Solana `Keypair`.

**Wallet Creation Flow:**
1. Check `.env` for existing `*_PRIVATE_KEY`
2. If missing, generate via `Keypair.generate()`
3. Encode secret key as Base58
4. Append to `.env` for persistence across restarts
5. Set in `process.env` for immediate availability

This gives every agent a stable identity (same public key across restarts) without a database.

### TransactionSigner (`src/core/transactionSigner.ts`)

Handles all transaction construction and signing:

- Fetches a **fresh blockhash** immediately before sending (prevents "block height exceeded" errors common on devnet)
- Sends the raw transaction first, then confirms separately
- If confirmation times out but the tx landed on-chain, returns success instead of throwing
- This resilience is critical for autonomous agents that can't ask a human to retry

### TokenService (`src/core/tokenService.ts`)

SPL token operations using `@solana/spl-token`:

- **ensureATA**: Creates Associated Token Accounts on demand (payer covers rent)
- **transferTokens**: SPL transfers between any two wallets
- Uses Circle's official devnet USDC (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`) — same address for everyone, no custom mint needed

### VaultManager (`src/core/vaultManager.ts`)

A shared keypair that acts as the bank vault and AMM pool:

- Auto-generated on first run, persisted as `VAULT_PRIVATE_KEY`
- Holds deposited SOL (bank) and SOL+USDC reserves (AMM)
- Signs outbound transfers when the vault needs to send funds (loans, swap outputs)
- Separate from all agent keypairs — clear separation of concerns

## Layer 2: Protocols — DeFi Primitives

### Maverick AMM (`src/protocols/maverickAMM.ts`)

Constant-product AMM implementing `x * y = k`:

**Swap Flow (SOL -> USDC):**
```
1. Agent sends SOL to vault        → real SystemProgram.transfer()
2. Vault sends USDC to agent       → real SPL token transfer (vault signs)
3. Update reserves + persist state  → amm.json
```

**Swap Flow (USDC -> SOL):**
```
1. Agent sends USDC to vault       → real SPL token transfer
2. Vault sends SOL to agent        → real SystemProgram.transfer (vault signs)
3. Update reserves + persist state  → amm.json
```

The vault keypair signs step 2 in both flows — this is how the pool "pays out" without a smart contract.

**Liquidity Provision:**
- Deposit SOL + USDC proportionally
- Receive LP shares based on contribution ratio
- Shares track your ownership of the pool

### Maverick Bank (`src/protocols/maverickBank.ts`)

Inspired by the Nigerian "Ajo" rotating savings system:

**Operations (all real on-chain):**
| Operation | Direction | Who Signs |
|-----------|-----------|-----------|
| Deposit | Agent -> Vault | Agent |
| Loan | Vault -> Agent | Vault |
| Payback | Agent -> Vault | Agent |
| Withdraw | Vault -> Agent | Vault |
| Collect | Each Agent -> Vault | Each Agent |
| Payout | Vault -> Recipient | Vault |

Interest rate: 5% on loans. Bookkeeping only updates after confirmed transactions.

## Layer 3: Agents — Autonomous Decision Making

### MaverickAgent (`src/agents/maverickAgent.ts`)

Each agent runs a `tick()` loop:
1. Check balance — request airdrop if critically low
2. Evaluate market conditions
3. Execute trade strategy (buy/sell positions)
4. Track P&L on active positions
5. Record all decisions to history

**Agent Discovery:**
- Scan `process.env` for keys matching `*_PRIVATE_KEY`
- Exclude `VAULT_PRIVATE_KEY`
- Auto-name: `AGENT` -> "Alpha", `BETA` -> "Beta", etc.
- Register in `AgentRegistry` for lookup

### ReasoningEngine (`src/intelligence/reasoningEngine.ts`)

Provides human-readable justification for every action:
- Trade reasoning: why this position, at this price, at this time
- Social onboarding: welcome messages listing capabilities
- Market analysis: sentiment scoring for prediction markets

## Layer 4: UI — Terminal Interface

Built with React + Ink for a full interactive experience in the terminal.

**18 Screens:**
Home, Wallet, Send, Swap, Bank, BankAction, Markets, MarketList, Bet, Portfolio, Agents, AgentDetail, Invite, Governance, GovernanceDetail, RequestFunds, History, Settings

**Key UX patterns:**
- **Active agent**: Select once from Home screen, used everywhere
- **Real-time balance**: Polls chain every 10s
- **Vault liquidity check**: Swap screen warns when pool is low
- **Faucet links**: Always visible in Wallet screen
- **Disk-cached markets**: Kalshi data loads instantly after first fetch

## Security Model

### Current (Prototype)

| Aspect | Implementation |
|--------|---------------|
| Key storage | `.env` file (gitignored) |
| Key isolation | Each agent has independent keypair |
| Vault access | Only vault keypair can sign vault outbound txs |
| Funding | No auto-funding — user controls when to add funds |
| Audit | Append-only `history.json` with tx signatures |
| Validation | Balance checks before every operation |

### Production Recommendations

**1. Trusted Execution Environments (TEEs)**
- Run agent logic inside AWS Nitro Enclaves or Intel SGX
- Key generated inside enclave, never exposed to host
- Even the developer cannot extract the private key

**2. Multi-Party Computation (MPC)**
- Split the key between AI agent and human guardian
- Both must sign for transactions above a threshold
- Prevents runaway spending by autonomous agents

**3. Spending Guardrails**
- **Destination whitelist**: Agent can only send to known addresses (vault, verified protocols)
- **Velocity limits**: Max SOL per cycle/hour/day
- **Circuit breakers**: Freeze agent if behavior deviates from expected patterns
- **Balance floors**: Never drain below a minimum reserve

**4. Key Rotation**
- Periodic key rotation with secure handoff
- Old key deauthorized after migration window
- Audit log of all rotations

## Transaction Flow Diagram

```
User Action: "Swap 0.1 SOL -> USDC"
    │
    ▼
SwapScreen.tsx
    │ calls amm.swap(agentWallet, 'SOL', 0.1)
    ▼
MaverickAMM.swap()
    │
    ├─ 1. signer.sendTransfer(agentWallet, vaultPubkey, 0.1)
    │     └─ TransactionSigner builds tx, signs with agent keypair
    │        └─ sendRawTransaction() -> confirmTransaction()
    │           └─ Real SOL moves on Solana devnet
    │
    ├─ 2. TokenService.transferTokens(vaultKeypair, agentPubkey, usdcOutput)
    │     └─ ensureATA() for both wallets
    │        └─ splTransfer() signed by vault keypair
    │           └─ Real USDC moves on Solana devnet
    │
    ├─ 3. Update reserves (reserveSOL += 0.1, reserveUSDC -= output)
    │
    └─ 4. Persist to amm.json
```

## Data Persistence

| File | Purpose | Format |
|------|---------|--------|
| `.env` | Private keys, agent types | KEY=VALUE |
| `history.json` | Full audit trail | JSON array |
| `amm.json` | AMM reserves and LP shares | JSON object |
| `governance.json` | Funding requests | JSON array |
| `signals.json` | Agent signals (cleared on boot) | JSON array |
| `.kalshi-cache.json` | Cached market data for fast loading | JSON object |
