-- ─────────────────────────────────────────────────────────────────────────────
-- AI feature consent
-- Explicit opt-in required before any user data is sent to the third-party
-- AI service (Anthropic, via the ai-proxy Edge Function). Defaults to false —
-- must never default to enabled.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_consent BOOLEAN NOT NULL DEFAULT false;
