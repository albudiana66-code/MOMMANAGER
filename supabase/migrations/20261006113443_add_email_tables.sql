-- ─────────────────────────────────────────────────────────────────────────────
-- email_log — the single source of truth for "has this email already gone
-- out". email_key is:
--   - a bare key ("trial_day0".."trial_day6") for the trial sequence, which
--     only ever runs once per account (RevenueCat/Apple/Google only allow
--     one free trial per account), so user_id+key is naturally unique forever.
--   - "<kind>:<revenuecat_event_id>" for event-driven emails (subscribed,
--     cancellation, billing_issue, we_miss_you) — these CAN legitimately
--     recur over an account's lifetime (subscribe → cancel → resubscribe →
--     cancel again), so the key is scoped to the specific RevenueCat event
--     that triggered it rather than the kind alone. That keeps the same
--     UNIQUE constraint working as the idempotency guard for both cases
--     without ever blocking a genuinely new occurrence.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_key  TEXT NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, email_key)
);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email log" ON public.email_log;
CREATE POLICY "Users can view own email log"
  ON public.email_log FOR SELECT
  USING (auth.uid() = user_id);

-- No write policy — only the webhook / scheduled sender (service_role) insert here.

-- ─────────────────────────────────────────────────────────────────────────────
-- email_preferences — the "Emails from MomManager" toggle. Service emails
-- (welcome, subscribed, cancellation, billing issue, trial-ending) always
-- send regardless of this flag — only marketing-ish emails (the day
-- 1/3/5 tips and the one-off "we miss you") check it. Default true: these
-- are existing users of the product, not a cold list (PECR soft opt-in),
-- and every one of those emails carries its own one-click unsubscribe link
-- that flips this off without requiring login — see unsubscribe_token.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  marketing_opt_in   BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribe_token  UUID NOT NULL DEFAULT gen_random_uuid(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_preferences_unsubscribe_token_idx ON public.email_preferences (unsubscribe_token);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email preferences" ON public.email_preferences;
CREATE POLICY "Users can view own email preferences"
  ON public.email_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own email preferences" ON public.email_preferences;
CREATE POLICY "Users can insert own email preferences"
  ON public.email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own email preferences" ON public.email_preferences;
CREATE POLICY "Users can update own email preferences"
  ON public.email_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can flip marketing_opt_in via the Settings toggle (RLS above allows
-- it), but shouldn't be able to reassign their row to someone else's
-- unsubscribe link by rewriting unsubscribe_token on their own row.
CREATE OR REPLACE FUNCTION public.protect_unsubscribe_token()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    NEW.unsubscribe_token := OLD.unsubscribe_token;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_unsubscribe_token() FROM PUBLIC;

DROP TRIGGER IF EXISTS protect_unsubscribe_token_trigger ON public.email_preferences;
CREATE TRIGGER protect_unsubscribe_token_trigger
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.protect_unsubscribe_token();

GRANT SELECT, INSERT, UPDATE ON public.email_preferences TO authenticated;
