#!/bin/bash
# MomManager — Stripe + Supabase Setup Script
# Run this once to deploy edge functions and configure secrets.
# Requires: Supabase CLI logged in (npx supabase login)

set -e

PROJECT_REF="giprbmoteojghxzodpcw"

echo ""
echo "=========================================="
echo "  MomManager Stripe Setup"
echo "=========================================="
echo ""

# ── 1. Check Supabase login ───────────────────────────────────────────────────
echo "▶ Step 1: Checking Supabase login..."
npx supabase projects list --project-ref $PROJECT_REF 2>/dev/null || {
  echo ""
  echo "  ❌ Not logged in. Run: npx supabase login"
  echo "     Then re-run this script."
  exit 1
}
echo "  ✓ Logged in"

# ── 2. Set Stripe secrets ─────────────────────────────────────────────────────
echo ""
echo "▶ Step 2: Setting Stripe secrets..."
echo ""
echo "  You need your Stripe SECRET key (starts with sk_live_ or sk_test_)"
echo "  Find it at: https://dashboard.stripe.com/apikeys"
echo ""
read -p "  Enter STRIPE_SECRET_KEY: " STRIPE_SECRET_KEY

if [[ -z "$STRIPE_SECRET_KEY" ]]; then
  echo "  ❌ No key entered. Skipping secrets."
else
  npx supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" --project-ref $PROJECT_REF
  echo "  ✓ STRIPE_SECRET_KEY set"
fi

# ── 3. Deploy edge functions ──────────────────────────────────────────────────
echo ""
echo "▶ Step 3: Deploying edge functions..."

echo "  Deploying stripe-checkout..."
npx supabase functions deploy stripe-checkout --project-ref $PROJECT_REF --no-verify-jwt
echo "  ✓ stripe-checkout deployed"

echo "  Deploying stripe-verify..."
npx supabase functions deploy stripe-verify --project-ref $PROJECT_REF --no-verify-jwt
echo "  ✓ stripe-verify deployed"

echo "  Deploying stripe-webhook..."
npx supabase functions deploy stripe-webhook --project-ref $PROJECT_REF --no-verify-jwt
echo "  ✓ stripe-webhook deployed"

# ── 4. Webhook instructions ───────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  ✅ Edge functions deployed!"
echo "=========================================="
echo ""
echo "▶ Step 4: Configure Stripe Webhook (manual)"
echo ""
echo "  Go to: https://dashboard.stripe.com/webhooks"
echo "  Click: 'Add endpoint'"
echo "  URL:   https://${PROJECT_REF}.supabase.co/functions/v1/stripe-webhook"
echo ""
echo "  Select these events:"
echo "    • checkout.session.completed"
echo "    • customer.subscription.deleted"
echo "    • customer.subscription.updated"
echo "    • invoice.payment_failed"
echo ""
echo "  After creating the webhook, copy the 'Signing secret' (whsec_...)"
echo "  Then run:"
echo ""
echo "    npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref $PROJECT_REF"
echo ""
echo "▶ Step 5: Test in Stripe test mode"
echo ""
echo "  Use test card: 4242 4242 4242 4242 | Any future date | Any CVC"
echo "  After 7-day trial, subscription auto-renews"
echo ""
echo "Done! 🎉"
