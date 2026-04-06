<p align="center">
  🛡️
</p>

<h1 align="center">DataGuard PRO</h1>

<p align="center">
  <strong>Real-time data quality monitoring with AI-powered root cause analysis.</strong>
  <br />
  <em>Upload CSV → Detect issues → Claude explains why → One-click fix → Team gets alerts</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Claude_AI-Anthropic-CC785C?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" />
</p>

---

## What is DataGuard?

DataGuard PRO is an enterprise data quality platform that monitors your data in real-time. When problems are detected:

1. **🔍 Validates instantly** — NULLs, duplicates, outliers, format errors, garbage data
2. **📊 Shows what's wrong** — Quality score (0–100%), affected rows, severity badges
3. **🤖 Claude AI explains WHY** — Root cause analysis with confidence scoring
4. **💡 Suggests smart fixes** — Approve with one click
5. **📡 Monitors continuously** — Hourly/daily/weekly cron jobs
6. **🔔 Alerts your team** — Severity-filtered notifications with real-time polling

---

## Features

### 📋 Data Validation
- CSV upload with automatic validation (10K+ rows in <100ms)
- Live database connections: PostgreSQL, MySQL, MongoDB
- Detects: NULLs, duplicates, outliers (Z-score), format mismatches, garbage values
- Quality score 0–100% with historical tracking

### 🤖 AI-Powered Analysis
- Claude API integration for root cause analysis
- Confidence scoring (0–100%) with SVG ring visualization
- Smart fix suggestions + alternative fixes
- Fallback rule-based analyzer (works without API key)
- Response caching (1hr TTL) to reduce API costs

### 📡 Real-Time Monitoring
- Schedule checks: Hourly, Daily, Weekly, or Manual
- Quality trend chart (Recharts area chart, 7-day view)
- Auto-alerts on quality drops >10%
- Trend tracking: Improving ↑, Declining ↓, Stable →

### 👥 Team Collaboration
- Invite team members by email
- Role-based access: Viewer, Editor, Admin
- Auto-accept for existing users
- Source-scoped permissions

### 🔔 Alert System
- Severity levels: Info, Warning, Critical
- Filter tabs (All / Unread / Critical / Warning / Info)
- Mark as read, mark all read, delete
- Real-time polling (30s) with unread badge in sidebar

### 🔐 Security
- Passwords hashed with bcrypt (10 rounds)
- DB credentials encrypted with AES-256-GCM
- JWT authentication (7-day expiry)
- Per-user data isolation
- Rate limiting on connection tests (5/min per user)
- Passwords never returned in API responses

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Backend** | Node.js + Express |
| **Database** | MongoDB (Atlas or local) |
| **Auth** | JWT + bcrypt |
| **AI** | Anthropic Claude API |
| **Scheduling** | node-cron |
| **Frontend** | Next.js 16 + React 19 |
| **Styling** | TailwindCSS 4 + Custom design system |
| **Charts** | Recharts |
| **Deployment** | Railway (backend) + Vercel (frontend) |

---

## Getting Started

### Prerequisites
- **Node.js 18+**
- **MongoDB** — [Atlas](https://www.mongodb.com/cloud/atlas) (free tier) or local
- **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com) *(optional)*

### 1. Clone & Install

```bash
git clone https://github.com/yourname/dataguard-pro.git
cd dataguard-pro
npm install
cd client && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dataguard
JWT_SECRET=your_random_secret_string
CLAUDE_API_KEY=sk-ant-xxxxx   # optional
NODE_ENV=development
PORT=5000
```

### 3. Run Development Servers

```bash
# Terminal 1 — Backend (port 5000)
node server.js

# Terminal 2 — Frontend (port 3000)
cd client && npm run dev
```

Open **http://localhost:3000** → Sign up → Upload CSV → See validation results.

---

## Usage

### Upload & Validate
1. Login or Sign up
2. Go to **Data Sources** → Click **+ New Source**
3. Upload a CSV or connect a database
4. System validates automatically and shows quality score

### AI Analysis
1. Go to **AI Analysis** page
2. Select an upload → Click **"Analyze with AI"**
3. See Claude's root cause explanations with confidence scores
4. Click **✅ Approve Fix** to accept or **🚫 Ignore**

### Start Monitoring
1. Go to **Monitoring** dashboard
2. Select a database source + schedule (Daily, Hourly, etc.)
3. Click **▶️ Start** — system checks automatically
4. View 7-day quality trend chart

### Team Collaboration
1. Go to **Team** page
2. Select data source → Enter teammate's email + role
3. Click **📨 Send Invite**
4. Teammate gets an alert and can access the shared source

---

## API Reference

### Auth
```
POST /auth/signup          — Create account
POST /auth/login           — Get JWT token
GET  /auth/me              — Current user info
```

### Data Uploads
```
POST /api/upload           — Upload CSV + auto-validate
GET  /api/uploads          — List uploads
GET  /api/upload/:id       — Upload detail + validations
```

### Connections
```
POST /api/connections           — Add database connection
GET  /api/connections           — List connections
POST /api/connections/test-new  — Test before saving
POST /api/connections/:id/test  — Re-test saved connection
DELETE /api/connections/:id     — Delete connection
```

### AI Analysis
```
POST /api/analyze/problems  — Run Claude analysis on upload
```

### Monitoring
```
POST /api/monitoring/:sourceId/start     — Start scheduled monitoring
GET  /api/monitoring/:sourceId/status    — Current status + score
GET  /api/monitoring/:sourceId/history   — Quality trend history
POST /api/monitoring/:sourceId/stop      — Stop monitoring
POST /api/monitoring/:sourceId/check-now — Manual one-off check
```

### Alerts
```
GET    /api/alerts               — List alerts (filterable)
POST   /api/alerts/:id/mark-read — Mark as read
POST   /api/alerts/mark-all-read — Mark all as read
DELETE /api/alerts/:id           — Delete alert
```

### Team
```
POST   /api/team/:sourceId/invite          — Invite by email + role
GET    /api/team/:sourceId/members         — List members
PUT    /api/team/:sourceId/member/:id/role — Update role
DELETE /api/team/:sourceId/member/:email   — Remove member
```

---

## Enable Claude AI

By default, DataGuard uses a **rule-based fallback analyzer** (65% confidence). To enable live Claude analysis:

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env`:
   ```
   CLAUDE_API_KEY=sk-ant-api03-xxxxx
   ```
3. Restart the backend
4. Claude will now analyze all data quality issues with higher confidence

---

## Deployment

### Backend → Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add environment variables (MONGODB_URI, JWT_SECRET, etc.)
4. Railway uses `railway.json` config automatically
5. Get your production URL (e.g., `dataguard-api.up.railway.app`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → Import GitHub repo
2. Set root directory to `client`
3. Add env: `NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app`
4. Deploy → Get URL (e.g., `dataguard-pro.vercel.app`)

---

## Project Structure

```
dataguard-pro/
├── server.js                 # Express entry point
├── config/db.js              # MongoDB connection
├── middleware/auth.js         # JWT authentication
├── models/
│   ├── User.js               # User + bcrypt
│   ├── Upload.js             # CSV upload metadata
│   ├── ValidationResult.js   # Validation findings
│   ├── DataConnection.js     # Encrypted DB credentials
│   ├── DataSource.js         # CSV/DB sources + quality history
│   ├── MonitoringRecord.js   # Quality check records
│   ├── TeamMember.js         # Role-based memberships
│   └── Alert.js              # Notification alerts
├── routes/
│   ├── auth.js               # Signup, Login, Me
│   ├── upload.js             # CSV upload + validation
│   ├── connections.js        # Database connections CRUD
│   ├── dataSources.js        # Data sources + validate
│   ├── analysis.js           # Claude AI analysis
│   ├── monitoring.js         # Start/stop monitoring
│   ├── team.js               # Team invites + members
│   └── alerts.js             # Alert management
├── services/
│   ├── validator.js           # 6 validation functions
│   ├── claudeAnalyzer.js      # Claude API + cache + fallback
│   ├── monitoringEngine.js    # Cron scheduler + alerts
│   ├── databaseConnector.js   # PG/MySQL/Mongo connector
│   └── encryptionHelper.js    # AES-256-GCM
├── client/                    # Next.js 16 frontend
│   ├── app/
│   │   ├── page.js            # Login / Signup
│   │   └── (dashboard)/
│   │       ├── connections/   # DB connections page
│   │       ├── data-sources/  # Data sources page
│   │       ├── uploads/       # CSV uploads page
│   │       ├── analysis/      # Claude AI analysis
│   │       ├── monitoring/    # Monitoring dashboard
│   │       ├── alerts/        # Alert center
│   │       └── team/          # Team collaboration
│   ├── components/
│   │   ├── Sidebar.js
│   │   ├── ConnectionForm.js
│   │   ├── ConnectionList.js
│   │   ├── DataSourceForm.js
│   │   ├── ClaudeAnalysisCard.js
│   │   └── QualityTrendChart.js
│   └── services/api.js        # All API calls
├── .env.example
├── .gitignore
├── railway.json
└── README.md
```

---

## Roadmap

- [ ] Email notifications (SendGrid)
- [ ] Slack integration
- [ ] PDF quality reports
- [ ] Custom validation rules builder
- [ ] Data lineage tracking
- [ ] API endpoint monitoring
- [ ] Data governance dashboard
- [ ] Webhook triggers on quality events

---

## Contributing

Pull requests welcome! Please follow the existing code style.

```bash
# Run backend in dev mode
npm run dev

# Run frontend
cd client && npm run dev
```

---

## License

MIT © 2026

---

<p align="center">
  Built with ❤️ for data engineers who are tired of bad data.
</p>
