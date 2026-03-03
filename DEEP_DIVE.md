# 🔬 Deep Dive: Maverick Multi-Agent Architecture

This project evolves the "Agentic Wallet" concept into a **Multi-Agent Economy**. Here we break down the design, security, and agent-interaction model.

## 🏗️ Architectural Layers

### 1. The Autonomous Wallet Layer
The foundation is the `WalletManager`. It provides programmatic ownership of a Solana Keypair. 
*   **Persistence**: We implement an auto-persistence pattern where new keys are automatically appended to the `.env` file, ensuring agents maintain their identity and reputation across restarts.

### 2. The Multi-Agent Orchestrator
Instead of a single bot, we use a **Global Cycle** in `index.ts`. 
*   **Dynamic Discovery**: Any environment variable following the `[NAME]_PRIVATE_KEY` pattern is automatically detected.
*   **The Tick System**: Every cycle, the orchestrator "ticks" each agent, allowing them to execute their private strategies (Trading or Prediction Betting).

### 3. The Social & Protocol Layer
This is what makes the wallet "Agentic":
*   **Ajo (Rotating Savings)**: A simulated smart contract logic (`AjoManager`) where agents save together. It solves the "cold start" problem for low-balance agents by giving them periodic lump sums.
*   **Peer Lending**: The `CommunicationModule` allows agents to evaluate each other's creditworthiness (balance) and autonomously lend SOL.

## 🤖 Interaction with AI
The `ReasoningEngine` is not just a logger; it is the **Decision Justification Layer**. 
*   Agents use **Cognitive Simulation** to translate raw on-chain data (balances, sentiments) into human-readable intent.
*   **Social State**: Agents track "Welcomed" status to simulate a social onboarding flow, listing their own capabilities to the console for the "Owner" to audit.

## 🛡️ Security Considerations

### 1. Key Management (The "Hot Wallet" Problem)
In this prototype, private keys are stored in `.env`. For a production "Agentic Fund":
*   **TEEs (Trusted Execution Environments)**: The entire agent logic should run inside a Nitro Enclave or Intel SGX. The key is generated *inside* the enclave and never revealed to the developer.
*   **MPC (Multi-Party Computation)**: Splitting the key between the AI Agent and a Human "Guardian". Both must sign for transactions above a certain threshold.

### 2. Guardrails (The "Manifesto" Pattern)
Every agent should have a **Spending Manifesto** (Hardcoded constraints):
*   **Destination Whitelisting**: The agent can ONLY send SOL to known protocols (Ajo Vault, DFlow Bridge).
*   **Velocity Checks**: No more than X SOL can be moved in a single cycle.
*   **Circuit Breakers**: If the "Market Sentiment" deviates too wildly from the agent's internal model, it must "Freeze" until human intervention.

## 🚀 The Vision: Shared Liquidity
By combining **Ajo Savings** and **Autonomous Betting**, we demonstrate a future where wallets aren't just tools—they are active participants in the economy, helping each other maintain liquidity to capture market opportunities.
