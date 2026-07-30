# Testing Guide for Recall.ai

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup & Migrations](#database-setup--migrations)
4. [Running the Development Server](#running-the-development-server)
5. [Account Creation & Authentication](#account-creation--authentication)
6. [Feature‑by‑Feature Smoke Tests](#feature-by-feature-smoke-tests)
   - 6.1 [Audio Processing API (`/api/process-audio`)](#audio-processing-api)
   - 6.2 [Google Docs & Notion Export (`/api/export/*`)](#google-docs--notion-export)
   - 6.3 [Account Management (`/api/account/*`)](#account-management)
   - 6.4 [Rate‑Limiting & Tier Checks](#rate-limiting--tier-checks)
   - 6.5 [Mobile‑Ready Auth Flow](#mobile-ready-auth-flow)
7. [Security & Error Resilience Checks](#security--error-resilience-checks)
8. [Cleanup](#cleanup)

---

### Prerequisites
- **Node.js >= 20** (latest LTS) installed and available in your `PATH`.
- **npm** for package management.
- **Supabase CLI** (`supabase`) or a cloud Supabase project.
- **Git** for version control.
- A modern browser (Chrome/Edge) for UI and system audio tests.

---

## Environment Setup
1. **Clone the repo**
   ```bash
   git clone https://github.com/DhanushSai-Chalasani/Recall.ai.git
   cd Recall.ai
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Create a `.env.local`** – fill in real API keys.
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   GROQ_API_KEY="your-groq-key-here"
   NVIDIA_API_KEY="your-nvidia-key-here"
   ```

---

## Database Setup & Migrations
1. **Run all migrations** – creates tables, RLS policies, and vector search functions.
   ```bash
   supabase db push    # applies migrations from `supabase/migrations`
   ```

---

## Running the Development Server
```bash
npm run dev   # starts Next.js on http://localhost:3000
```
- Verify that the UI loads without console errors.
- Open the Network tab – confirm requests to `/api/*` endpoints return valid JSON.

---

## Account Creation & Authentication
1. **Navigate to the Sign‑Up page** (`/auth/signup`).
2. Register a new user profile.
3. **Log‑in** with credentials.
4. Confirm that a **Supabase session cookie** is set.
5. **Extract the Bearer token** for mobile auth tests if needed from `supabase.auth.token` in Local Storage.

---

## Feature‑by‑Feature Smoke Tests

### Audio Processing API (`/api/process-audio`)
1. **Capture/Upload Audio:** Test recording live via **Microphone**, **System Audio** (browser tab share), or uploading an audio file.
2. **Downsampling Test:** Upload a large `.mp4` or `.mp3` file. Confirm client-side downsampling converts it to a 16kHz Mono WAV file before uploading.
3. **File Size Enforcement:** Try selecting a file exceeding 250MB raw or 25MB extracted WAV. Confirm an error toast is displayed and upload is blocked.
4. **API Key Fallback Test:** Temporarily unset `GROQ_API_KEY` or `NVIDIA_API_KEY`. Process an audio file and verify the system responds gracefully with `MISSING_API_KEYS` status, preserving local demo workflow without crashing.

### Google Docs & Notion Export (`/api/export/*`)
1. **Google Docs:** Call `/api/export/google-docs` with a meeting payload and verify structured document generation.
2. **Notion:** Click **Export to Notion** from the UI dropdown and verify page creation.

### Account Management (`/api/account/*`)
| Endpoint | Action | Expected Result |
|----------|--------|-----------------|
| `POST /api/account/upgrade` | Upgrade to PRO | `200 OK` with upgraded tier |
| `POST /api/account/downgrade` | Downgrade to Free | `200 OK` with updated tier |
| `DELETE /api/account/delete` | Delete account | `200 OK` and user data purged |

### Rate‑Limiting & Tier Checks
- **Free tier**: Limited to 3 meetings per month. After 3 meetings, subsequent process requests return `402 Payment Required`.
- **PRO tier**: Unlimited meeting transcriptions.

---

## Security & Error Resilience Checks
| Check | How to Verify |
|-------|---------------|
| **RLS Policies** | Attempt to read `subscriptions` or another user's `meetings` directly via Supabase anon client; verify denial. |
| **Tier Enforcement** | Free user exceeding limits receives `402`. Pro user is granted access. |
| **25MB Size Boundary** | Uploading >25MB processed WAV returns `413 Payload Too Large`. |
| **Prompt Injection Protection** | Transcripts with prompt injection text are sanitized inside `<transcript>` tags without altering system prompt instructions. |

---

## Cleanup
- Stop dev server (`Ctrl+C`).
- To reset local DB: `supabase db reset`.

---

*Updated for Recall.ai core Web Application architecture.*
