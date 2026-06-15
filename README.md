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

## Deployment

- **Web / PWA** — published via Lovable to https://tallipidproject.lovable.app. Use the Publish button in Lovable to ship a new version.
- **iOS / Android** — produced by running `npx cap sync` after `npm run build`, then opening the native projects in Xcode / Android Studio. The App Store / Play Store bundle identifiers and signing details are tracked in the deployment-roadmap memory.

---

## Security notes

- RLS is on for every public table; policies are scoped to `auth.uid()` for participant-owned data and to the `admin` role (via `has_role()`) for researcher-only data.
- Service role keys and database passwords are only ever used inside edge functions; they are never shipped to the client.
- Roles are stored in `public.user_roles`, never on the profile, to prevent client-side privilege escalation.
