# 🛸 Maverick: Frontend Implementation Guide

This document provides a comprehensive technical breakdown of the Maverick ecosystem and a detailed roadmap for building a high-performance, React-based Command Center.

---

## 🏗️ 1. Technical Architecture Overview

Maverick is a **Sovereign Multi-Agent Financial Ecosystem** built on Solana. It is designed to act as a decentralized institution where AI agents perform autonomous roles that usually require human bankers or traders.

### Core Systems:
1.  **The Ajo Bank (Liquidity Protocol)**: A decentralized vault where agents pool SOL and USDC. It manages internal P2P lending, interest collection, and governance approval flows.
2.  **Maverick AMM (The DEX)**: A native Automated Market Maker using the **Constant Product Formula (`x * y = k`)**. It allows the ecosystem to have its own internal liquidity for SOL/USDC swaps, reducing reliance on external slippage.
3.  **The Reasoning Engine**: A heuristic-based AI layer that simulates market sentiment (Bullish/Bearish/Neutral) and determines trade frequency.
4.  **Kalshi Predictive Bridge**: A bridge between Solana liquidity and real-world event markets (Politics, Sports, Economics). Agents "bet" on outcomes to hedge their portfolio risk.
5.  **Smart Liquidity Router**: A middleware that compares prices between our internal AMM and external aggregators (like Jupiter) to ensure the agent always gets the best "fill."

---

## 🎨 2. Frontend Design Philosophy: "Cyber-Terminal"

The frontend should not look like a standard web app. It should feel like an **Institutional Trading Terminal** (think Bloomberg or a high-end DEX aggregator).

*   **Aesthetic**: Dark Mode (Background: `#0A0A0A`), Sharp Edges (Zero border-radius), Neon Accents (Cyan for USDC, Green for SOL, Magenta for Governance).
*   **Density**: High data density. Use small fonts (12px-14px) and tight grids. Avoid empty whitespace.
*   **Motion**: Micro-animations for "Real-time" effects. When an agent trades, the balance should pulse or flicker.

---

## 🛠️ 3. Implementation Roadmap (React + Vite)

### Step A: System Integration
Since the current backend is Node.js writing to JSON files (`amm.json`, `history.json`, `governance.json`, `signals.json`), your React frontend has two choices:
1.  **Direct File Monitoring (Rapid Prototyping)**: Run a simple Express server that watches these files and provides a WebSocket or polling API to React.
2.  **Full DB Synchronization**: Move the JSON state to a database (MongoDB/PostgreSQL) and build a GraphQL/REST API.

### Step B: Core Components

#### 1. The Global AMM HUD
This component visualizes the health of the internal DEX.
*   **Displays**: `reserveSOL`, `reserveUSDC`, `Total LPs`, and `Constant K`.
*   **Interactions**: Swap Modal where user can simulate or trigger agent swaps.

#### 2. Agent Position Grid
A "Leaderboard" style view of all active Mavericks.
*   **Columns**: Agent Name, Wallet (truncated), SOL Balance, USDC Balance, Debt Status (from Ajo Bank).
*   **Status Tags**: `TRADING`, `HEADDRESS`, `BORROWING`.

#### 3. Prediction Market Explorer
A live feed of the categorical markets indexed from Kalshi.
*   **Visuals**: Progress bars showing "YES" vs "NO" odds.
*   **Filter**: Quick category tabs (Politics/Sports/Crypto).

---

## 📜 4. Implementation Pseudo-Code (React)

### The `AgentCard` Component
```tsx
const AgentCard = ({ name, balance, usdc, sentiment }) => {
  return (
    <div className="border border-dim-gray bg-obsidian p-4 font-mono">
      <div className="flex justify-between">
        <span className="text-cyan font-bold">{name.toUpperCase()}</span>
        <span className={sentiment === 'BULLISH' ? 'text-green' : 'text-red'}>
          {sentiment}
        </span>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>BALANCE: <span className="text-white">{balance} SOL</span></div>
        <div>USDC: <span className="text-white">{usdc}</span></div>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="bg-blue-600 px-2 py-1 text-[10px]" onClick={() => sendSignal(name, 'SWAP')}>
          FORCE SWAP
        </button>
        <button className="bg-magenta px-2 py-1 text-[10px]" onClick={() => sendSignal(name, 'LP')}>
          ADD LIQUIDITY
        </button>
      </div>
    </div>
  )
}
```

### The Signal Dispatcher (`SignalProvider.ts`)
To control the backend from the React UI, you will write to the `signals.json` file.
```javascript
const sendSignal = async (agentName, action, target = null) => {
  // 1. Fetch current signals.json
  // 2. Append new signal: { agentName, action, target }
  // 3. POST to backend API to write file
  // Effectively "Commanding" the Maverick from the UI.
}
```

---

## 🚀 5. Getting Started Checklist

1.  **Initialize**: `npm create vite@latest maverick-ui -- --template react-ts`
2.  **Styling**: Use **Vanilla CSS** or **Tailwind** with a Strict Grid system.
3.  **Data Layer**: Setup an `EventSource` or `Socket.io` connection to the Maverick backend to stream `history.json` updates instantly.
4.  **SOL Integration**: Use `@solana/wallet-adapter-react` if you want to allow the USER to connect their own wallet to interact with the Ajo Bank.

---

> [!TIP]
> **Pro Feature**: Add a "Global Live Feed" component that parses `history.json`. It should scroll automatically and look like a hacker's terminal. Every trade, loan, and LP deposit should flicker onto the screen with a timestamp.
