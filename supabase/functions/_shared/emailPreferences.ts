import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Gets (or lazily creates, with defaults) a user's email_preferences row. Used by anything that needs their unsubscribe_token or marketing_opt_in — avoids every caller re-implementing the "create row if missing" dance. */
export async function ensureEmailPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<{ marketing_opt_in: boolean; unsubscribe_token: string }> {
  const { data: existing } = await supabase
    .from('email_preferences')
    .select('marketing_opt_in, unsubscribe_token')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('email_preferences')
    .insert({ user_id: userId })
    .select('marketing_opt_in, unsubscribe_token')
    .single();
  if (created) return created;

  // Lost a race with another insert for the same user — re-read.
  if (error?.code === '23505') {
    const { data: raceWinner } = await supabase
      .from('email_preferences')
      .select('marketing_opt_in, unsubscribe_token')
      .eq('user_id', userId)
      .single();
    if (raceWinner) return raceWinner;
  }
  throw new Error(`ensureEmailPreferences: could not get or create row for ${userId}: ${error?.message}`);
}
