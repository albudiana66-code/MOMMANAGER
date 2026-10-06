// Supabase Edge Function — daily cron to send trial-ending reminder emails
//
// ── Deploy ────────────────────────────────────────────────────────────────────
// npx supabase functions deploy trial-reminder --no-verify-jwt --project-ref giprbmoteojghxzodpcw
//
// ── Schedule (Supabase Cron — run daily at 9am UTC) ──────────────────────────
// In Supabase Dashboard → Database → Extensions → enable pg_cron
// Then: SELECT cron.schedule('trial-reminder', '0 9 * * *',
//   $$SELECT net.http_post(
//     url := 'https://giprbmoteojghxzodpcw.supabase.co/functions/v1/trial-reminder',
//     headers := '{"Authorization": "Bearer <SUPABASE_ANON_KEY>"}'::jsonb
//   )$$);
//
// ── Secrets needed ────────────────────────────────────────────────────────────
// SUPABASE_SERVICE_ROLE_KEY — from Supabase Dashboard → Settings → API

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // ── Trial ending in 2 days ─────────────────────────────────────────────────
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
  const targetDate = twoDaysFromNow.toISOString().split('T')[0];

  const { data: endingSoon } = await supabase
    .from('profiles')
    .select('id, name, email, subscription_expires_at')
    .eq('subscription_status', 'free_trial')
    .gte('subscription_expires_at', `${targetDate}T00:00:00`)
    .lte('subscription_expires_at', `${targetDate}T23:59:59`);

  let sentCount = 0;

  for (const profile of endingSoon || []) {
    if (!profile.email) continue;
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        type: 'trial_ending',
        email: profile.email,
        name: profile.name || '',
      }),
    });
    sentCount++;
  }

  // ── Expired trials ──────────────────────────────────────────────────────────
  // Catches anything overdue, not just trials that expired exactly today —
  // self-heals if a run was ever missed, instead of leaving free_trial
  // profiles permanently active.
  const { data: expired } = await supabase
    .from('profiles')
    .select('id, name, email, subscription_expires_at')
    .eq('subscription_status', 'free_trial')
    .lte('subscription_expires_at', new Date().toISOString());

  for (const profile of expired || []) {
    if (!profile.email) continue;

    // Update status to expired in DB
    await supabase
      .from('profiles')
      .update({ subscription_status: null })
      .eq('id', profile.id);

    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        type: 'trial_expired',
        email: profile.email,
        name: profile.name || '',
      }),
    });
    sentCount++;
  }

  return new Response(
    JSON.stringify({ success: true, emailsSent: sentCount }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
