-- ─────────────────────────────────────────────────────────────────────────────
-- Prevent authenticated clients from writing subscription/billing fields
-- directly on their own profile row. Until now, `profiles.subscription_status`
-- (and the expiry/trial/stripe columns next to it) were only protected by the
-- generic "users can update own profile" policy, which allows updating ANY
-- column on your own row — including granting yourself a paid plan for free
-- via a direct Supabase client call, bypassing Stripe/Apple/Google entirely.
--
-- These columns must now only change via:
--   - the service_role key (Stripe / RevenueCat webhooks), or
--   - the `start_free_trial()` RPC below (one-time, server-enforced trial).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.protect_billing_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role'
     AND current_setting('app.bypass_billing_guard', true) IS DISTINCT FROM 'true' THEN
    NEW.subscription_status     := OLD.subscription_status;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.trial_start             := OLD.trial_start;
    NEW.trial_end               := OLD.trial_end;
    NEW.stripe_customer_id      := OLD.stripe_customer_id;
    NEW.stripe_subscription_id  := OLD.stripe_subscription_id;
    NEW.subscription_end_date   := OLD.subscription_end_date;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_billing_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS protect_billing_fields_trigger ON public.profiles;
CREATE TRIGGER protect_billing_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_billing_fields();

-- ─────────────────────────────────────────────────────────────────────────────
-- start_free_trial() — the only client-callable way to activate the 7-day
-- free trial. Enforced server-side, once per account ever: `trial_start` is
-- never cleared by any other code path, so its presence means the trial was
-- already used (even if subscription_status was since reset to NULL by the
-- trial-expiry job).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.start_free_trial()
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result public.profiles;
BEGIN
  IF (SELECT trial_start FROM public.profiles WHERE id = auth.uid()) IS NOT NULL THEN
    RAISE EXCEPTION 'Free trial already used' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.bypass_billing_guard', 'true', true);

  UPDATE public.profiles
  SET subscription_status     = 'free_trial',
      subscription_expires_at = NOW() + INTERVAL '7 days',
      trial_start              = NOW(),
      trial_end                = NOW() + INTERVAL '7 days'
  WHERE id = auth.uid()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_free_trial() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- confirm_native_purchase() — called client-side right after a verified
-- Apple StoreKit purchase (via RevenueCat) succeeds, since there is no
-- RevenueCat webhook wired up yet to set this server-side independently.
-- Expiry is computed here (not trusted from the client), and only the
-- caller's own row can ever be touched (auth.uid()).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.confirm_native_purchase(p_plan text)
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result public.profiles;
  v_expires timestamptz;
BEGIN
  IF p_plan NOT IN ('standard_monthly', 'standard_yearly', 'pro_monthly', 'pro_yearly') THEN
    RAISE EXCEPTION 'Invalid plan' USING ERRCODE = 'P0001';
  END IF;

  v_expires := CASE
    WHEN p_plan LIKE '%_yearly' THEN NOW() + INTERVAL '365 days'
    ELSE NOW() + INTERVAL '30 days'
  END;

  PERFORM set_config('app.bypass_billing_guard', 'true', true);

  UPDATE public.profiles
  SET subscription_status     = p_plan,
      subscription_expires_at = v_expires
  WHERE id = auth.uid()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_native_purchase(text) TO authenticated;
