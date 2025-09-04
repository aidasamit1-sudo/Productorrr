
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  wallet_balance REAL DEFAULT 0,
  auto_recharge_enabled BOOLEAN DEFAULT 0,
  auto_recharge_threshold REAL DEFAULT 200,
  auto_recharge_amount REAL DEFAULT 1000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('topup', 'deduct', 'bonus', 'refund')),
  amount REAL NOT NULL,
  credits_added INTEGER DEFAULT 0,
  balance_after REAL NOT NULL,
  payment_method TEXT,
  payment_gateway_id TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  credits_consumed REAL NOT NULL,
  generation_type TEXT NOT NULL,
  resolution TEXT NOT NULL,
  prompt TEXT,
  image_url TEXT,
  cost_in_rupees REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE generated_images (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  original_prompt TEXT NOT NULL,
  enhanced_prompt TEXT,
  image_url TEXT NOT NULL,
  resolution TEXT NOT NULL,
  generation_type TEXT NOT NULL DEFAULT 'standard',
  credits_used REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX idx_generated_images_user_id ON generated_images(user_id);
