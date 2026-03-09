import { sql } from '@vercel/postgres';

// Initialize schema — call once on first deploy or via a setup endpoint
export async function initSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS contributions (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      amount_sol DOUBLE PRECISION NOT NULL,
      tx_signature TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS loans (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      amount_sol DOUBLE PRECISION NOT NULL,
      interest_rate DOUBLE PRECISION NOT NULL DEFAULT 0.05,
      tx_signature TEXT NOT NULL,
      repaid BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS amm_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      sol_reserve DOUBLE PRECISION NOT NULL DEFAULT 0,
      usdc_reserve DOUBLE PRECISION NOT NULL DEFAULT 0,
      k_value DOUBLE PRECISION NOT NULL DEFAULT 0,
      fee_rate DOUBLE PRECISION NOT NULL DEFAULT 0.003,
      total_shares DOUBLE PRECISION NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS lp_shares (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL UNIQUE,
      shares DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS history (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      tx_signature TEXT,
      reasoning TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS funding_requests (
      id SERIAL PRIMARY KEY,
      requester_address TEXT NOT NULL,
      provider_address TEXT,
      amount DOUBLE PRECISION NOT NULL,
      token TEXT NOT NULL DEFAULT 'SOL',
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      tx_signature TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS wallets (
      id SERIAL PRIMARY KEY,
      username_hash TEXT NOT NULL UNIQUE,
      encrypted_private_key TEXT NOT NULL,
      public_address TEXT NOT NULL,
      salt TEXT NOT NULL,
      iv TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Ensure AMM state row exists
  await sql`
    INSERT INTO amm_state (id, sol_reserve, usdc_reserve, k_value, fee_rate, total_shares)
    VALUES (1, 0, 0, 0, 0.003, 0)
    ON CONFLICT (id) DO NOTHING
  `;
}

// Contribution queries
export async function addContribution(wallet: string, amount: number, txSig: string) {
  return sql`
    INSERT INTO contributions (wallet_address, amount_sol, tx_signature)
    VALUES (${wallet}, ${amount}, ${txSig})
  `;
}

export async function getContributions(wallet: string) {
  const result = await sql`
    SELECT COALESCE(SUM(amount_sol), 0) as total
    FROM contributions
    WHERE wallet_address = ${wallet}
  `;
  return Number(result.rows[0]?.total ?? 0);
}

export async function reduceContribution(wallet: string, amount: number) {
  // Record a negative contribution for withdrawal tracking
  return sql`
    INSERT INTO contributions (wallet_address, amount_sol, tx_signature)
    VALUES (${wallet}, ${-amount}, 'withdrawal')
  `;
}

// Loan queries
export async function addLoan(wallet: string, amount: number, interestRate: number, txSig: string) {
  return sql`
    INSERT INTO loans (wallet_address, amount_sol, interest_rate, tx_signature)
    VALUES (${wallet}, ${amount}, ${interestRate}, ${txSig})
  `;
}

export async function getActiveLoan(wallet: string) {
  const result = await sql`
    SELECT * FROM loans
    WHERE wallet_address = ${wallet} AND repaid = FALSE
    ORDER BY created_at DESC LIMIT 1
  `;
  return result.rows[0] ?? null;
}

export async function repayLoan(loanId: number) {
  return sql`UPDATE loans SET repaid = TRUE WHERE id = ${loanId}`;
}

// AMM state queries
export async function getAmmState() {
  const result = await sql`SELECT * FROM amm_state WHERE id = 1`;
  return result.rows[0] ?? null;
}

export async function updateAmmState(solReserve: number, usdcReserve: number, kValue: number, totalShares: number) {
  return sql`
    UPDATE amm_state
    SET sol_reserve = ${solReserve}, usdc_reserve = ${usdcReserve},
        k_value = ${kValue}, total_shares = ${totalShares}, updated_at = NOW()
    WHERE id = 1
  `;
}

// LP share queries
export async function getLpShares(wallet: string): Promise<number> {
  const result = await sql`SELECT shares FROM lp_shares WHERE wallet_address = ${wallet}`;
  return Number(result.rows[0]?.shares ?? 0);
}

export async function upsertLpShares(wallet: string, shares: number) {
  return sql`
    INSERT INTO lp_shares (wallet_address, shares)
    VALUES (${wallet}, ${shares})
    ON CONFLICT (wallet_address)
    DO UPDATE SET shares = lp_shares.shares + ${shares}
  `;
}

// History queries
export async function addHistory(wallet: string, action: string, description: string, txSig?: string, reasoning?: string) {
  return sql`
    INSERT INTO history (wallet_address, action, description, tx_signature, reasoning)
    VALUES (${wallet}, ${action}, ${description}, ${txSig ?? null}, ${reasoning ?? null})
  `;
}

export async function getHistory(wallet?: string, limit = 50) {
  if (wallet) {
    return sql`
      SELECT * FROM history
      WHERE wallet_address = ${wallet}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
  }
  return sql`SELECT * FROM history ORDER BY created_at DESC LIMIT ${limit}`;
}

// Wallet queries (encrypted key storage)
export async function registerWallet(
  usernameHash: string,
  encryptedKey: string,
  publicAddress: string,
  salt: string,
  iv: string
) {
  return sql`
    INSERT INTO wallets (username_hash, encrypted_private_key, public_address, salt, iv)
    VALUES (${usernameHash}, ${encryptedKey}, ${publicAddress}, ${salt}, ${iv})
  `;
}

export async function getWalletByUsername(usernameHash: string) {
  const result = await sql`
    SELECT encrypted_private_key, public_address, salt, iv
    FROM wallets WHERE username_hash = ${usernameHash}
  `;
  return result.rows[0] ?? null;
}

// Vault balance computed from contributions + loan repayments - loans issued - withdrawals
export async function getVaultBalance(): Promise<number> {
  const result = await sql`
    SELECT COALESCE(SUM(amount_sol), 0) as total FROM contributions
  `;
  const contributions = Number(result.rows[0]?.total ?? 0);

  const loanResult = await sql`
    SELECT COALESCE(SUM(amount_sol), 0) as total FROM loans WHERE repaid = FALSE
  `;
  const outstandingLoans = Number(loanResult.rows[0]?.total ?? 0);

  return contributions - outstandingLoans;
}
