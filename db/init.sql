CREATE TABLE IF NOT EXISTS api_keys (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  key_enc TEXT NOT NULL,
  label TEXT,
  model_hint TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_log (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  model_id TEXT,
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_msg TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orchestrator_runs (
  id UUID PRIMARY KEY,
  task TEXT NOT NULL,
  steps JSONB,
  final_out TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_log_provider ON usage_log(provider);
CREATE INDEX IF NOT EXISTS idx_usage_log_created_at ON usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_created_at ON orchestrator_runs(created_at DESC);
