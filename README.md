# FlowOps

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js version](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)

FlowOps is an AI-powered Engineering Intelligence SaaS platform for software teams to analyze, optimize, and improve development workflows based on GitHub activity and real-time metrics.

## 🚀 What FlowOps solves

- Consolidates commit, PR, review, and deployment events into a single analytics platform.
- Tracks cycle time, review latency, and engineering health.
- Detects bottlenecks and makes productivity insights actionable.

## 🧠 Implemented features (full SaaS scope)

### Core engineering intelligence

- GitHub OAuth authentication and session management
- GitHub webhook ingestion for commits, PRs, reviews, pushes
- PR tracking: open/merged/closed, cycle times, review status
- Commit analytics: velocity, churn (additions/deletions/changed files)
- Review latency metrics, DORA-style health metrics foundation
- Sprint health generation (delivery predictability, burnout risk)
- Leaderboard and personal productivity dashboard

### Organization & access management

- Multi-tenant org model with `organization`, `organization_member`, `repository`
- RBAC: owner/admin/member/viewer roles
- Invite flow: invite, accept, cancel, list invites
- Org repository connect/disconnect (with GitHub webhook lifecycle)

### User and profile

- User profiles with username, e-mail, avatar, preferred mode (personal/org)
- Public profile endpoints, personal metrics, contribution heatmaps
- Onboarding status, welcome flow, and per-user mode switching

### AI features

- AI code review: trigger via PR or GitHub path
- AI review results: security issues, performance hints, anti-patterns, refactor suggestions, score
- AI-generated documentation pipeline: repo exploration, content extraction, markdown generation

### SaaS & governance features

- Billing with Razorpay: plan checkout, subscription lifecycle, payment verification, webhook handling
- Usage tracking: organization usage summary, history, quota meters
- API keys for automation and service-to-service auth
- Audit logs of events, actions, and data changes
- Compliance tools: export org data, delete org data, configure retention policy
- Changelog management (CRUD + seeded release history)
- Review rules: custom thresholds, automation support
- Notifications preferences (email/push/stateful settings)
- Slack slash-command integration endpoint support

### Productivity utilities

- Achievements and gamification checks
- Code snippets management (create/update/delete/favorite)
- Personal tasks with stats dashboard

### Miscellaneous

- Health check endpoint (`/health`)
- Public report sharing endpoint with rate-limited access
- WebSocket event support for real-time updates

## 📦 Repositories

- `flowops-api/`: Express backend, Prisma ORM, PostgreSQL, webhook handling, metrics APIs.
- `flowops-web/`: Next.js frontend (App Router), Tailwind CSS, UI screens for dashboards, org/team settings, reporting.

---

## ⚙️ Local setup

### Prerequisites

- Node.js >= 18
- npm or pnpm
- PostgreSQL >= 14
- GitHub app (client ID/secret) + webhook URL (e.g. via `ngrok`)

### 1. Clone repo

```bash
git clone https://github.com/vedantDube/FlowOps.git
cd FlowOps
```

### 2. Backend setup (`flowops-api`)

```bash
cd flowops-api
cp .env.example .env
# Update .env with:
# DATABASE_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_WEBHOOK_SECRET, JWT_SECRET
# Optional: PORT (default 4000), FRONTEND_URL, LOG_LEVEL, JWT_EXPIRY, GEMINI_API_KEY, RAZORPAY_* etc.
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

### 3. Frontend setup (`flowops-web`)

```bash
cd ../flowops-web
cp .env.example .env
# Update .env with FRONTEND_URL (usually http://localhost:3000) and NEXT_PUBLIC_API_URL (e.g. http://localhost:4000)
npm install
npm run dev
```

### 4. Webhooks

- Run `npx ngrok http 3000` (or whichever port your API uses)
- Configure GitHub webhook URL: `https://<ngrok-id>.ngrok.io/webhooks/github`

---

## 🧩 Architecture

- `flowops-api/src/`: auth, controllers, services, middleware, routes
- `prisma/schema.prisma`: data models for users, orgs, repos, events, PRs, reviews, metrics
- `flowops-web/app/`: Next.js pages, components, dashboard analytics
- `flowops-web/components/`: shared UI elements

## 🔐 Authentication & Authorization

- GitHub OAuth login redirect flow in `flowops-api/src/auth/github.auth.js`
- API key support for internal service-to-service access in `api-keys.controller`
- RBAC checks in `flowops-api/src/middleware/rbac.middleware.js`

## 📊 Metrics pipeline

- Webhooks saved in events tables
- Background or on-demand metric population from controllers and services
- Reports, review rules, SaaS usage, and leaderboard endpoints available

---

## 🧪 Testing

Run tests in each workspace (if tests exist):

```bash
cd flowops-api && npm test
cd flowops-web && npm test
```

## 🐛 Troubleshooting

- Clear DB and rerun migration: `npx prisma migrate reset`
- Inspect webhook delivery in GitHub App dashboard
- Check logs: `flowops-api` prints webhook and auth events

---

## 🔗 Getting started as dev

1. Create GitHub OAuth App
2. Seed first user via GitHub login
3. Add org/repo via UI
4. Trigger webhook events via test GitHub commits/PRs
5. Review analytics dashboard and metrics cards

---

## 🧍‍♂️ Contributing

- Fork main
- Create feature branch `feature/<desc>`
- Follow PR template and code style (prettier + eslint)
- Add tests for controllers/services

---

## 🌟 Roadmap (key planned enhancements)

- enterprise policy & advanced team metrics
- DORA metrics dashboard (lead time, MTTR, deployment frequency)
- Slack/MS Teams alerting
- jira / ci tool integrations
- AI-suggested code review review patterns

---

## 📚 Links

- API docs: `flowops-api/src/controllers` (Swagger if added)
- UI walkthrough: `flowops-web/app/*`
- DB schema: `flowops-api/prisma/schema.prisma`

---
