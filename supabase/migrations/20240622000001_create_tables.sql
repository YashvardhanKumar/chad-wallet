-- Create users table
CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  privy_did TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT,
  token_logo_uri TEXT,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  amount NUMERIC NOT NULL,
  sol_amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  price_usd NUMERIC NOT NULL DEFAULT 0,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_wallet ON trades(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at DESC);

-- Create holdings table
CREATE TABLE IF NOT EXISTS holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT,
  token_logo_uri TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  avg_entry NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_address, token_address)
);

CREATE INDEX IF NOT EXISTS idx_holdings_wallet ON holdings(wallet_address);

-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT,
  token_logo_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_address, token_address)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_wallet ON watchlist(wallet_address);

-- Disable RLS for now (MVP)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE holdings DISABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist DISABLE ROW LEVEL SECURITY;

-- Create theses table
CREATE TABLE IF NOT EXISTS theses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  token_address TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  hearts INT DEFAULT 0
);
ALTER TABLE theses DISABLE ROW LEVEL SECURITY;

-- Add profile fields to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_username TEXT;

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  following_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_address, following_address)
);
ALTER TABLE follows DISABLE ROW LEVEL SECURITY;


