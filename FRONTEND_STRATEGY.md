# 🌐 Maverick Web UI: The "Cyber-Terminal" Strategy

To transition Maverick from a terminal tool to a world-class hackathon project, we need a frontend that screams "Institutional-Grade AI."

## 🎨 The Aesthetic: "High-Fidelity Terminal"
- **Background**: Deep Ink Black (`#080808`) with a faint hexagonal grid overlay.
- **Accents**: 
  - **Maverick Cyan** (`#00F5FF`) for borders and buttons.
  - **Bet Yellow** (`#FFE600`) for prediction market alerts.
  - **Lend Purple** (`#BF00FF`) for banking/vault operations.
- **Micro-Animations**: Kinetic log streaming (the live actions should slide in from the bottom with a terminal-like typing effect).

## 🧩 Key Dashboard Components
### 1. The Global Command Grid
A real-time spreadsheet-style view showing every agent's vital signs:
- **Balance**: With a sparkline chart showing their SOL growth over time.
- **Debt**: Visualized as a red "Risk Meter."
- **Status**: Pulse animation (Green = Trading, Blue = Betting, Grey = Sleeping).

### 2. The Maverick Bank Vault
A focused card showing the community's liquidity. 
- A "Vault Capacity" gauge.
- A list of active "Rescue Loans" currently out in the ecosystem.

### 3. The "Manual Override" Deck
Interactive controls for the user to step in:
- A dropdown to select which Agent to command.
- Large, glassmorphic buttons for `TRADE`, `BET`, and `WITHDRAW`.

### 4. The Reasoning Stream
A side-panel that displays the **AI Reasoning** from `reasoningEngine.ts`. Instead of just seeing "Alpha traded," the user sees:
> *"Alpha detected a simulated dip in SOL sentiment. Initiating a trade to capture 0.05 yield. Current confidence: 88%."*

## 🛠️ Recommended Tech Stack (V0 to Pro)
- **Frontend**: Next.js 14 (App Router) for speed.
- **Styling**: Tailwind CSS + Framer Motion (for the animations).
- **Icons**: Lucide React.
- **Data**: A local Express/API route that watches `history.json` and `signals.json`.

---
> [!TIP]
> **Hackathon Strategy**: If you present this, highlight the "Dual-Control" aspect—how the agents are autonomous but the user can always "Signal" their own moves.
