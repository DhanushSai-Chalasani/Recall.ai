# Recall.ai — Enterprise AI Meeting Intelligence & Vector Search (Vault)

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-v2-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Groq Whisper](https://img.shields.io/badge/Groq-Whisper_v3-7C6EF0?style=for-the-badge)](https://groq.com/)
[![NVIDIA Llama](https://img.shields.io/badge/NVIDIA-LLaMA_3-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://nvidia.com/)

**Focus on the meeting, we’ll take the notes.** Recall.ai is a high-fidelity, split-panel developer companion that captures room and system audio, processes smart speaker diarization, generates chronologues, extracts actionable tasks, and supports highly optimized, pre-filtered database-level vector RAG search (Vault) across your meeting archives.

---
</div>

## 🌌 Platform Overview

Recall.ai is a premium Next.js and Supabase web application styled with curated dark modes, custom HSL palettes, responsive `framer-motion` micro-animations, and sleek glassmorphic overlays. 

By integrating high-performance client-side voice codecs with advanced serverless LLM pipelines, it processes hours of dialogue in seconds, producing highly structured meeting transcripts, prioritized checklists, speaker analytics, and automated third-party workspace synchronization.

---

## ⚡ Key Technical Milestones

### 🧠 Vault RAG Vector Search (v2 Upgraded)
We engineered an optimized Retrieval-Augmented Generation (RAG) vector engine utilizing local PostgreSQL functions (`pgvector`) to deliver instant answers from meeting contexts.
* **Pre-Filtering Optimization:** Rather than fetching database rows and post-filtering results in JavaScript (which wastes database bandwidth and can cut off relevant matches), filters are compiled and evaluated **directly inside the SQL queries**.
* **Flexible Search Query Parameters:** Supports filtering by date ranges (start and end times), specific category tags (e.g., `"Work"`, `"Lecture"`, `"Personal"`), and restricting search bounds to a single meeting session.
* **Advanced Fallback Handler:** Implemented an API-level automatic fallback to the V1 matching function (`match_meeting_embeddings`) if the V2 database schema migrations have not been applied on local developer environments, ensuring zero downtime.

### 🎤 Capture, Compression & Diarization
* **Audio Loopback Capture:** Captures native system audio directly via browser `getDisplayMedia` to record active Google Meet, Zoom, or Microsoft Teams calls.
* **Vocal Codec Compression:** Integrates a client-side Mono Vocal compressor in `MediaRecorder` that reduces audio payloads by **up to 80%** (32kbps mono) while preserving speech recognition readability.
* **Multi-Speaker Analytics:** Automatically diarizes conversations into color-coded timelines mapped to estimated speaker profiles, generating dynamic talk ratios and sentiment tracking indices.

---

## 🔒 Security Hardening

Recall.ai has been rigorously audited and secured against modern web vulnerabilities:

| Severity | Vulnerability | Resolution |
| :---: | :--- | :--- |
| **Critical** | Route Access Bypass | Implemented root Next.js `middleware.ts` to block unauthorized users from accessing `/dashboard`, `/meetings`, `/profile`, and `/upgrade`. |
| **Critical** | Billing Escalation | Disabled direct client-side DB writes for tier states. Created secure server-side `/api/account/upgrade` and `/api/account/downgrade` routes. |
| **Critical** | File Upload DOS | Added strict **25 MB** upload limits and dynamic MIME-type extensions filters in `/api/process-audio/route.ts`. |
| **High** | Prompt Injection | Isolated system instructions from user inputs by packing raw transcript blocks inside strict `<transcript>` tags. |
| **High** | Open Redirect | Sanitized and validated `returnUrl` parameters inside route controllers. |

---

## 🛠 Tech Stack

* **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript
* **Styling:** CSS-First Tailwind CSS (v4) + premium HSL custom variables
* **Database & Auth:** Supabase SSR Auth + PostgreSQL with `pgvector`
* **Audio Engineering:** HTML5 Web Audio API + Web Analyser Node (Waveform Visualizer Canvas)
* **LLM Pipelines:** Groq API (Whisper-v3 speech-to-text) + NVIDIA LLaMA 3 NIM Models
* **Type Safety:** High-level compile checks with zero-error validation (`npx tsc --noEmit`)

---

## 📁 Repository Blueprint

```
/app
  /dashboard
    page.tsx                  ← Split-panel recorder & current session analytics
    layout.tsx                ← Sidebar + topbar layout wrapper
  /meetings
    page.tsx                  ← Meeting archive explorer & Vault AI Search (RAG)
    /[id]                     ← Detailed saved notes, transcript logs & export actions
  /api
    /process-audio
      route.ts                ← Secure 25MB validation & AI analytics orchestrator
    /vault-search
      route.ts                ← Upgraded vector search endpoint with dynamic filtering
    /export
      /google-docs
        route.ts              ← Google Docs batch-styled note creator & Drive exporter
      /notion
        route.ts              ← Notion database page integration
    /account
      /upgrade                ← Secure subscription/tier upgrader
      /downgrade              ← Secure tier downgrade router

/components
  /recorder
    AudioRecorder.tsx         ← Recorder coordinator (Mic, File Upload, System Audio)
    WaveformCanvas.tsx        ← Frequency waveform visualizer
  /results
    ResultsPanel.tsx          ← Summary, Action Items, & Insights tab panel
  /shared
    ExportDropdown.tsx        ← Premium dropdown with Google Docs, Notion, & Local exporters
    ProcessingState.tsx       ← Stepped processing loader timeline

/supabase
  /migrations
    20260521_optimize_rag...sql  ← SQL script declaring custom 'match_meeting_embeddings_v2' RPC
```

---

## ⚡ Key Technical Milestones (Newly Completed)

### 📄 Google Docs & Notion Workspace Synchronizers
* **Dynamic Google Docs Creation:** Implemented authenticated OAuth Drive integration in `/api/export/google-docs` using the Google APIs Client Library. Formats document content hierarchically using structural titles, subtitles, colored quote highlights, and stylized action logs in a single batch-update call.
* **Notion Integration:** Automatically parses meeting attributes to build formatted database entries, mapping markdown paragraphs, checkbox items, and metadata onto user Notion pages.
* **Local Fallback Mode:** Operates elegantly in local development without keys by generating high-fidelity mock export URLs.

### 🔒 Robust Offline Sandbox & Safety Guards (Developer Experience)
* **Local Auth Bypass (Demo Mode):** Added a secure, cookie-based local sandbox bypass (`sb-mock-session=true`) in Next.js `middleware.ts`, `auth-helper.ts`, and React context. If remote database connections fail or Supabase environment variables are missing, the server gracefully falls back to a mock demo session (`demo@recall.ai`), allowing developers to test and record client-side dashboards 100% offline.
* **Database Query Fixes:** Resolved query schema discrepancies by selecting and mapping normalized SQL table fields (such as `duration`, `speakers`, and `action_items`) instead of querying non-existent fields, preventing server-side API crashes.

---

## 🚀 Quick Start Guide

### Prerequisites
* [Node.js](https://nodejs.org/) v20+
* [Supabase Account](https://supabase.com/) or Local Supabase CLI

### Setup Instructions

1. **Clone & Install Dependencies:**
   ```bash
   git clone https://github.com/DhanushSai-Chalasani/Recall.ai.git
   cd Recall.ai
   npm install
   ```

2. **Configure Environment Keys (`.env.local`):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   GROQ_API_KEY="your-groq-key-here"
   NVIDIA_API_KEY="your-nvidia-key-here"
   ```

3. **Launch Main Web Application Development Server:**
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3000](http://localhost:3000)** in your browser, create an account, and start capturing meetings.

---

## 🗺 Active Roadmap Features

Recall.ai development continues:
* **📊 Slack Webhook Action Pipeline:** Real-time event notifications for high-priority checklist action items.
* **💼 Salesforce / HubSpot CRM Sync:** Automated meeting insight logs linked directly to customer records.

---

## 👥 Essential Commands

```bash
npm run dev          # Start Next.js development server
npm run build        # Compile production-optimized code
npx tsc --noEmit     # Verify strict TypeScript safety (Keep at zero errors!)
npm run lint         # Run ESLint validation checks
```

---
*Developed under premium developer standards by the Recall.ai team. © 2026. All rights reserved.*
