-- ─────────────────────────────────────────────────────────────────────────────
-- RevenueCat event log + current subscription status per user.
--
-- This is deliberately separate from profiles.subscription_status (which is
-- guarded by protect_billing_fields_trigger and drives Stripe/native-RPC app
-- access today) — RevenueCat webhook writes land here instead, so the two
-- systems can't collide, and we get a real distinction between "trialing"
-- and "active" that profiles.subscription_status doesn't have today
-- (confirm_native_purchase sets the same column for both).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RevenueCat's own event id — the idempotency key. A unique violation on
  -- insert is how the webhook detects (and silently no-ops) a redelivery.
  revenuecat_event_id TEXT NOT NULL UNIQUE,
  -- RevenueCat's app_user_id verbatim, even when it doesn't resolve to a
  -- real user below (e.g. events from before identifyRevenueCatUser() was
  -- wired up, or an anonymous install) — kept for debugging/reconciliation.
  app_user_id         TEXT NOT NULL,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  period_type         TEXT,
  product_id          TEXT,
  store               TEXT,
  environment         TEXT NOT NULL DEFAULT 'PRODUCTION' CHECK (environment IN ('PRODUCTION', 'SANDBOX')),
  event_at            TIMESTAMPTZ NOT NULL,
  raw                 JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscription_events_user_id_idx ON public.subscription_events (user_id, event_at DESC);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription events" ON public.subscription_events;
CREATE POLICY "Users can view own subscription events"
  ON public.subscription_events FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy for authenticated/anon — only the
-- revenuecat-webhook function (service_role, bypasses RLS) ever writes here.

-- ─────────────────────────────────────────────────────────────────────────────
-- Current status per user, kept up to date by the webhook on every event.
-- trial_started_at is what the trial email sequence (day 0/1/3/5/6) is
-- scheduled against.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscription_status (
  user_id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status                  TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'cancelled_pending', 'expired', 'billing_issue')),
  product_id              TEXT,
  store                   TEXT,
  period_type             TEXT,
  price_string            TEXT,
  currency                TEXT,
  trial_started_at        TIMESTAMPTZ,
  current_period_ends_at  TIMESTAMPTZ,
  will_renew              BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscription_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription status" ON public.subscription_status;
CREATE POLICY "Users can view own subscription status"
  ON public.subscription_status FOR SELECT
  USING (auth.uid() = user_id);

-- No write policy — only revenuecat-webhook (service_role) writes here.
