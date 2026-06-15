# TalLipid — Lipid Medication Monitor

TalLipid is a clinical research companion app for patients enrolled in a lipid-lowering medication study. It helps participants track their daily health data, complete standardized questionnaires, receive medication reminders, and chat with an AI health assistant — while feeding clean, structured data back into the research team's REDCap database.

- **Preview**: https://tallipidproject.lovable.app
- **Platforms**: Installable PWA + native iOS / Android builds via Capacitor
- **Languages**: English, Estonian (ET), Russian (RU) — fully database-driven
- **Stack**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui, Lovable Cloud (Supabase) for auth/DB/functions, Lovable AI Gateway (Gemini Flash) for the assistant

---

## Why this app exists

Lipid-lowering therapy (statins and adjuncts) only works when patients take it consistently, and the research team needs longitudinal, patient-reported outcomes to evaluate adherence, side effects, and quality of life. Existing solutions either lock data inside a vendor cloud or require clinic visits to capture each data point.

TalLipid solves three problems at once:

1. **For patients** — a single calm, mobile-first surface to log how they feel, confirm they took their pill, and get reminded if they forget.
2. **For clinicians / researchers** — a live admin dashboard plus automatic weekly sync to REDCap so the study CRF stays current without manual entry.
3. **For the device strategy** — one codebase that ships as an installable PWA *and* as native iOS/Android apps, so participants on any phone (including Estonian Android users with Xiaomi Redmi Watch 5 Active) can join.

---

## Feature overview

### 1. Account & onboarding (`src/pages/Auth.tsx`)

- Email + password sign-in via Lovable Cloud Auth; Google sign-in available.
- Registration captures the participant's **REDCap study ID**, preferred language, and basic demographics so that every later data point is study-traceable from day one.
- Anonymous sign-ups are disabled — every record must belong to a consented study participant.
- **Why**: a research app cannot reconcile records after the fact; tying auth → REDCap ID at first launch removes an entire class of data-quality issues.

### 2. Daily home dashboard (`src/pages/Index.tsx`)

The home screen is intentionally dense and single-screen: medication confirmation, today's vitals, latest notifications, and quick access to the assistant. Navigation lives in a compact header so the primary fold is always actionable.

- **Medication check** (`MedicationCheck.tsx`) — one-tap "Taken / Skipped" confirmation for the day's dose, with a timestamp written to the backend immediately.
- **Health data entry** (`HealthDataEntry.tsx`) — manual entry for blood pressure, heart rate, weight, steps, sleep, and free-text symptoms. Validates ranges before submit.
- **Daily log history** (`DailyLogHistory.tsx`) — chronological view of the past entries so patients can see trends and clinicians can spot gaps.
- **Notification banner** (`NotificationBanner.tsx`) — surfaces scheduled reminders that haven't been acknowledged yet.

**Why this layout**: study adherence drops the moment the app asks more than ~10 seconds of attention per day. The dashboard is built so a participant can open it, confirm medication, and close it in two taps.

### 3. Conversational AI agent (`src/components/ConversationalAgent.tsx`)

- Backed by Lovable AI Gateway running **Gemini Flash** via the `health-chat` edge function (`supabase/functions/health-chat`).
- Has read-only context over the participant's recent logs, so it can answer "did I take my pill yesterday?" or "how has my blood pressure trended this week?" without the patient having to dig.
- Designed to integrate with a LiveAvatar surface for a more approachable face on the assistant.
- **Why**: older participants are far more likely to *ask* about their data than to read a chart. The assistant turns the database into a conversation while keeping all medical interpretation appropriately conservative.

### 4. Health questionnaires (`src/pages/Questionnaires.tsx`)

Standardized patient-reported outcome measures (PROMs) used in lipid-therapy research — quality of life, symptom burden, side-effect screening. Stored versioned per-submission so the research team can analyze change over time.

**Why**: PROMs are the most valuable longitudinal output of the study. Putting them in the app (instead of paper or clinic visits) raises completion rates dramatically.

### 5. Smartwatch & passive data sync

- **Watch setup** (`src/pages/WatchSetup.tsx`) — guides Xiaomi Redmi Watch 5 Active users through pairing with the Mi Fitness app.
- **Shortcuts setup** (`src/pages/ShortcutsSetup.tsx`) — iOS Shortcuts flow that pushes Apple Health data into the app.
- `@capgo/capacitor-health` is used on native builds to read step / HR / sleep summaries directly.

**Why**: self-reported vitals are noisy. Passive data from a wearable gives the study a continuous baseline and lets the app pre-fill the daily form, which in turn lifts daily-entry completion.

### 6. Install / PWA experience (`src/pages/InstallPage.tsx`)

A platform-aware install guide:

- **iOS Safari**: step-by-step "tap the Share icon → Add to Home Screen" with a prominent inline Share badge so the icon is impossible to miss.
- **Android Chrome**: one-tap install via the native PWA prompt.
- **Desktop**: install instructions plus a fallback iPhone/iPad card.

**Why**: PWA install discoverability is the single biggest drop-off in cross-platform health apps; the page exists so support tickets don't.

### 7. Notification system

- **Local notifications** (`@capacitor/local-notifications`) — daily medication reminders scheduled on-device so they fire even without network.
- **Push notifications** (`@capacitor/push-notifications`) — researcher-triggered messages (e.g. "please complete this week's questionnaire").
- **In-app banners** — for soft reminders while the user is already in the app.

**Why**: belt-and-braces. Local notifications guarantee a daily nudge; push lets the research team intervene without waiting for the next app open.

### 8. Admin dashboard (`src/pages/AdminDashboard.tsx`)

Researcher-only surface at `/admin`:

- Cohort overview — adherence %, last-seen, questionnaire completion per participant.
- Drill-down into an individual participant's logs.
- Manual sync trigger and import tools (`health-data-import` edge function).
- Protected by a role check using the standard `user_roles` + `has_role()` security-definer pattern — roles are stored in a dedicated table, never on the profile, to prevent privilege escalation.

**Why**: researchers need a live view that doesn't require waiting for the next REDCap sync, and a place to remediate bad data without giving them SQL access.

### 9. REDCap integration (`supabase/functions/redcap-weekly-sync`)

- Scheduled weekly export of new health logs and questionnaire responses into the study's REDCap instance using the participant's REDCap ID as the record key.
- Field-mapping lives in the edge function so REDCap form changes can be shipped without redeploying the app.
- **Why**: REDCap is the regulatory system of record. The app is the friendly capture layer; REDCap is where statisticians and the IRB look.

### 10. Multilingual support (EN / ET / RU)

- Translations live in the database, not in static JSON, so non-developers (study coordinators) can fix wording without a release.
- User's preferred language is set at registration and respected across UI, notifications, and the AI assistant's responses.
- **Why**: the study runs in Estonia where ET and RU are both required for inclusion; database-driven copy avoids a release cycle every time the team tweaks a phrasing.

---

## Architecture

### Frontend

- **React 18 + Vite 5 + TypeScript 5**, Tailwind v3, shadcn/ui components.
- Routing via React Router; data fetching via TanStack Query against Supabase.
- All visual tokens (teal / mint medical palette) defined as semantic CSS variables in `src/index.css` and consumed through Tailwind / shadcn variants — no hard-coded colors in components.

### Backend (Lovable Cloud)

- **Auth** — email/password + Google.
- **Database** — Postgres. Every public table has RLS enabled and explicit `GRANT` statements. User roles use a separate `user_roles` table queried through a `SECURITY DEFINER` `has_role()` function to keep RLS non-recursive.
- **Edge functions**:
  - `health-chat` — proxies chat to Lovable AI Gateway (Gemini Flash) with the participant's recent context.
  - `health-data-import` — bulk import endpoint used by the admin tools.
  - `redcap-weekly-sync` — scheduled REDCap export.

### Native packaging

- **Capacitor 8** for iOS and Android builds.
- `capacitor.config.json` ships **without** a `server.url` for production so the bundled web assets are used (required for App Store / Play submission).
- Native plugins in use: `@capacitor/local-notifications`, `@capacitor/push-notifications`, `@capgo/capacitor-health`.

---

## Project structure

```
src/
  pages/                  # Top-level routes
    Index.tsx             # Home dashboard
    Auth.tsx              # Sign-in / registration
    Questionnaires.tsx    # PROMs
    AdminDashboard.tsx    # Researcher tools (/admin)
    InstallPage.tsx       # PWA install guide
    WatchSetup.tsx        # Xiaomi watch pairing
    ShortcutsSetup.tsx    # iOS Shortcuts / Apple Health
    NotFound.tsx
  components/
    ConversationalAgent.tsx
    MedicationCheck.tsx
    HealthDataEntry.tsx
    DailyLogHistory.tsx
    NotificationBanner.tsx
    NavLink.tsx
    ui/                   # shadcn primitives
  integrations/supabase/  # auto-generated client + types (do not edit)
supabase/
  functions/
    health-chat/
    health-data-import/
    redcap-weekly-sync/
  migrations/             # SQL migrations (RLS + grants in the same file)
capacitor.config.json
```

---

## Local development

```sh
# Install
npm i

# Dev server (Vite)
npm run dev

# Lint
npm run lint

# Tests
npm run test
```

You can edit the project in three ways:

- **Lovable** — visit the project in the Lovable editor; changes auto-commit to this repo.
- **Your own IDE** — clone, edit, push; pushes are reflected in Lovable.
- **GitHub web / Codespaces** — edit directly on github.com or spin up a Codespace.

---

## Deployment checklist

### Prerequisites

| Item | Where to get it |
|------|-----------------|
| Lovable account with Cloud enabled | https://lovable.dev |
| GitHub repo connected | Settings → GitHub → Connect |
| REDCap API token | Your study REDCap → API → Request token |
| Google OAuth client ID | Google Cloud Console → Credentials |
| Apple Developer account (native iOS) | https://developer.apple.com |
| Google Play Console (native Android) | https://play.google.com/console |

### 1. Configure backend secrets

All secrets are stored in **Lovable Cloud → Secrets** (never in the repo).

```sh
# Required secrets and how to obtain them:
#
# SUPABASE_URL          — auto-provisioned by Lovable Cloud
# SUPABASE_ANON_KEY     — auto-provisioned by Lovable Cloud
# SUPABASE_SERVICE_ROLE_KEY — auto-provisioned by Lovable Cloud (edge functions only)
# SUPABASE_DB_URL       — auto-provisioned by Lovable Cloud
# SUPABASE_PUBLISHABLE_KEY — auto-provisioned by Lovable Cloud
# LOVABLE_API_KEY       — auto-provisioned by Lovable Cloud (AI Gateway + connectors)
# REDCAP_API_KEY        — from your REDCap project API page
# REDCAP_API_URL        — your REDCap instance base URL (e.g. https://redcap.ut.ee/api/)
```

**Verify secrets are set:**

1. Open your project in Lovable.
2. Go to **Cloud → Secrets**.
3. Confirm all 8 secrets above show a value (not empty).
4. If any are missing, click **Add Secret** and paste the value.

### 2. Configure authentication

```sh
# In Lovable Cloud → Users → Auth Settings:
# 1. Enable Email + Password provider
# 2. Enable Google provider
#    - Paste your Google Cloud OAuth 2.0 Client ID
#    - Add the Lovable publish URL to Google OAuth redirect URIs
# 3. Disable anonymous sign-ups (required for research traceability)
# 4. Enable password HIBP check (Have I Been Pwned)
```

### 3. Run database migrations

```sh
# Migrations live in supabase/migrations/
# They must be applied in order — each file is numbered.

# Lovable Cloud auto-applies migrations on push, but you can verify:
# Go to Cloud → Database → Tables and confirm:
#   - profiles
#   - user_roles
#   - health_logs
#   - questionnaire_responses
#   - translations
#   - notifications
# all exist with RLS enabled (padlock icon).
```

### 4. Deploy edge functions

Edge functions deploy automatically when you push to the connected GitHub repo. Manual verification:

```sh
# In Lovable Cloud → Edge Functions:
# 1. health-chat          — status should show "Deployed"
# 2. health-data-import   — status should show "Deployed"
# 3. redcap-weekly-sync   — status should show "Deployed"
#
# Test health-chat:
curl -X POST \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","language":"en"}' \
  <supabase-url>/functions/v1/health-chat
```

### 5. Build and publish web / PWA

```sh
# Local build test
npm ci
npm run build

# The dist/ folder should contain:
#   index.html, assets/, manifest.json, sw.js (if using custom SW)
#
# Publish via Lovable:
# 1. Click Publish button (top-right)
# 2. Verify title, meta description, OG tags in index.html
# 3. Click Update to go live
```

### 6. Build native iOS / Android (optional)

```sh
# 1. Sync web assets to native projects
npm run build
npx cap sync

# 2. iOS — open in Xcode
npx cap open ios
#   - Set bundle identifier (e.g. ee.ut.tallipid)
#   - Configure signing & capabilities (Push Notifications, HealthKit if needed)
#   - Product → Archive → Distribute → App Store Connect

# 3. Android — open in Android Studio
npx cap open android
#   - Set applicationId (e.g. ee.ut.tallipid)
#   - Build → Generate Signed Bundle → Upload to Play Console
```

### 7. Post-deployment verification

```sh
# Health check script (run after every deploy)
# 1. Open published URL in browser incognito window
# 2. Confirm manifest.json loads (DevTools → Application → Manifest)
# 3. Sign up as test user, verify:
#    - Profile created in database
#    - REDCap ID captured
#    - Welcome notification received
# 4. Submit one health log, verify:
#    - Entry appears in Daily Log History
#    - Edge function returns 200 (no console errors)
# 5. Open /admin as non-admin → confirm 403 / redirect
# 6. Open /admin as admin → confirm dashboard loads
# 7. Trigger REDCap sync manually → verify record appears in REDCap
```

---

## Security checklist

### Row-Level Security (RLS)

```sh
# Every public table MUST have:
# 1. RLS enabled           — ALTER TABLE ... ENABLE ROW LEVEL SECURITY
# 2. GRANT statements      — at minimum: authenticated SELECT/INSERT/UPDATE/DELETE
# 3. Policies scoped to auth.uid() for participant data
# 4. Policies using has_role('admin') for researcher data
#
# Run this query to audit:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%';
# Every rowsecurity column should show TRUE.
```

### Service role key handling

```sh
# DO:
#   - Use SUPABASE_SERVICE_ROLE_KEY only inside edge functions
#   - Use it to bypass RLS for admin/bulk operations
#   - Log access for audit trails
#
# DON'T:
#   - Never expose service_role_key to browser/client
#   - Never commit it to GitHub (already in .gitignore, but verify)
#   - Never use it in frontend Supabase client initialization
```

### Recommended permissions matrix

| Actor | Database access | Edge functions | REDCap | Notes |
|-------|-----------------|----------------|--------|-------|
| **Anonymous** | None | None (health-chat may allow anon for testing, disable in prod) | None | No unauthenticated reads |
| **Authenticated participant** | Own profile, own health_logs, own questionnaire_responses, own notifications | health-chat (with own context), health-data-import (own data only) | None | RLS scopes to auth.uid() |
| **Researcher / admin** | All rows via has_role('admin') policies | health-data-import (bulk), health-chat (any context), redcap-weekly-sync trigger | Read/Write via REDCap API token | Must have 'admin' role in user_roles table |
| **Edge functions (service role)** | All tables (bypass RLS) | N/A | POST to REDCap API | Runs server-side only; never exposed to client |

### Setting up the admin role

```sql
-- Run this in Lovable Cloud SQL Editor (or via migration):
-- 1. Create role enum (if not exists)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create user_roles table (if not exists)
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- 3. Grants (required for Data API access)
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 4. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create the security definer function (if not exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. Assign first admin (replace with actual researcher UUID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('<researcher-auth-uuid-here>', 'admin');
```

### REDCap API security

```sh
# 1. Use a dedicated REDCap API token for this app only
#    (don't reuse a personal token)
# 2. Store as REDCAP_API_KEY in Lovable Cloud Secrets
# 3. The token should have these rights in REDCap:
#    - API Import / Export Rights: ✅ Import
#    - Data Access Groups: the study DAG only
#    - No delete rights (append-only sync)
# 4. Rotate the token every 90 days or after any team member leaves
# 5. REDCap API URL should use HTTPS only (verify certificate)
```

### Google OAuth hardening

```sh
# In Google Cloud Console → Credentials → OAuth 2.0 Client:
# 1. Authorized JavaScript origins:
#    - https://tallipidproject.lovable.app
#    - https://localhost:5173 (local dev only)
# 2. Authorized redirect URIs:
#    - https://<your-supabase-project>.supabase.co/auth/v1/callback
# 3. Application type: Web application
# 4. Do NOT enable implicit flow (Authorization code flow only)
```

### Secrets rotation schedule

| Secret | Rotation frequency | How to rotate |
|--------|-------------------|---------------|
| REDCAP_API_KEY | 90 days | REDCap → API → Regenerate token |
| Google OAuth Client Secret | 180 days or on suspicion | Google Cloud → Credentials → Reset |
| SUPABASE_SERVICE_ROLE_KEY | On suspicion or team change | Lovable Cloud → Secrets → Regenerate |
| LOVABLE_API_KEY | Auto-managed | Use lovable_api_key--rotate tool if needed |

### Audit checklist (run monthly)

```sh
# 1. Review user_roles table for unexpected admins
SELECT u.email, ur.role, ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id;

# 2. Check for failed auth attempts (anomalies)
# In Lovable Cloud → Logs → Auth, look for:
#   - Unusual login volumes
#   - Failed password attempts per IP
#   - Sign-ups from unexpected regions

# 3. Verify edge function logs for errors
# In Lovable Cloud → Edge Functions → Logs:
#   - 401/403 responses should be rare
#   - redcap-weekly-sync should report 200 on last run

# 4. Confirm no client-side role checks
# grep -r "isAdmin\|role.*localStorage\|role.*sessionStorage" src/
# Should return 0 matches — roles must always be checked server-side
```

---
