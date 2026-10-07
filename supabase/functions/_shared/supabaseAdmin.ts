import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Service-role client — bypasses RLS. Only ever used server-side (webhook, cron, unsubscribe), never exposed to the app. */
export function createAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}
