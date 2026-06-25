# MomManager — Authentication Setup

## Supabase Project
- Project ref: `giprbmoteojghxzodpcw`
- Dashboard: https://supabase.com/dashboard/project/giprbmoteojghxzodpcw

---

## 1. Enable Google OAuth

1. Go to **Supabase Dashboard → Authentication → Providers → Google**
2. Toggle **Enable** on
3. Go to [Google Cloud Console](https://console.cloud.google.com) → Create/select project
4. Enable **Google+ API** (or Google Identity)
5. Create **OAuth 2.0 credentials** (Web Application type)
6. Add **Authorized redirect URI**:
   ```
   https://giprbmoteojghxzodpcw.supabase.co/auth/v1/callback
   ```
7. Copy **Client ID** and **Client Secret** back into Supabase → Google provider settings
8. Save

---

## 2. Enable Apple OAuth

1. Go to **Supabase Dashboard → Authentication → Providers → Apple**
2. Toggle **Enable** on
3. You need an [Apple Developer account](https://developer.apple.com) ($99/year)
4. Create an **App ID** with Sign In with Apple capability
5. Create a **Services ID** (this is the OAuth client ID)
6. Configure the Services ID with domain + redirect URL:
   ```
   Domain: mommanager.app
   Return URL: https://giprbmoteojghxzodpcw.supabase.co/auth/v1/callback
   ```
7. Create a **Key** with Sign In with Apple capability, download the `.p8` file
8. In Supabase Apple provider settings fill in:
   - **Services ID** (e.g. `app.mommanager.web`)
   - **Team ID** (10-character string from Apple Developer)
   - **Key ID**
   - **Private Key** (contents of the `.p8` file)
9. Save

---

## 3. Email Auth Settings

1. Go to **Supabase Dashboard → Authentication → Settings**
2. For development/testing: **disable "Enable email confirmations"** so users can sign in immediately without email verification
3. For production: enable email confirmations (users get a confirmation email)
4. Set **Site URL** to your production domain: `https://mommanager.app`
5. Add **Redirect URLs** (for OAuth returns):
   ```
   https://mommanager.app
   http://localhost:5173
   ```

---

## 4. Row Level Security

The `profiles` table migration (already applied) enables RLS so each user can only read/update their own profile row. The Stripe webhook uses the **service role key** (bypasses RLS) to write subscription data.

---

## 5. Environment Variables

Make sure `.env` contains:
```
VITE_SUPABASE_URL=https://giprbmoteojghxzodpcw.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase Dashboard → Settings → API>
```

---

## 6. Supabase Secrets (for Edge Functions)

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  RESEND_API_KEY=re_... \
  --project-ref giprbmoteojghxzodpcw
```

---

## How Auth Flow Works

| Action | Method | Flow |
|--------|--------|------|
| Google sign-in | `signInWithGoogle()` | Browser redirect → Google → Supabase callback → app |
| Apple sign-in | `signInWithApple()` | Browser redirect → Apple → Supabase callback → app |
| Email sign-in | `signInWithEmail()` | Direct Supabase API call, no redirect |
| Email sign-up | `signUpWithEmail()` | Creates account + (optionally) sends confirmation email |
| Sign out | `signOut()` | Clears Supabase session |

After any sign-in, `onAuthStateChange` fires with `SIGNED_IN` event, which fetches or creates the user's profile from the `profiles` table.
