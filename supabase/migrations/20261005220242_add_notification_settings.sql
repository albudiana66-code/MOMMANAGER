-- ─────────────────────────────────────────────────────────────────────────────
-- Per-user reminder-notification preferences (master switch, per-category
-- toggles, default reminder offset, meal/self-care reminder times, quiet
-- hours) — stored as a single jsonb column on profiles so they survive
-- reinstalls / new devices, since everything else in the app (events,
-- tasks, kids items, meals, budget) lives in localStorage only.
--
-- No new RLS policy is needed: profiles already has "Users can view own
-- profile" / "Users can update own profile" policies restricted to
-- auth.uid() = id (see 20260101000000_create_profiles.sql), and this column
-- isn't touched by the billing-fields guard trigger
-- (20260722120000_protect_billing_fields.sql), so it's freely readable and
-- writable by the owning user only, same as e.g. `theme` or `language`.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_settings JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "categories": {
      "calendar": true,
      "kids": true,
      "kitchen": true,
      "shopping": false,
      "selfcare": true
    },
    "defaultReminderMinutes": 30,
    "kitchenReminderTime": "16:00",
    "selfcareReminderTime": "20:30",
    "quietHours": {
      "enabled": true,
      "start": "21:30",
      "end": "07:00"
    }
  }'::jsonb;
