# Creator Dashboard

A production-grade creator monetization platform. Creators upload courses and tutorials; subscribers pay once for lifetime access via Razorpay.

**Stack:** React 18 · Vite · Tailwind CSS · Node.js · Express · PostgreSQL · JWT · Razorpay

---

## Table of Contents
1. [Architecture](#architecture)
2. [Local Development Setup](#local-development-setup)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Running the App](#running-the-app)
6. [Project Structure](#project-structure)
7. [API Reference](#api-reference)
8. [Deployment](#deployment)
9. [Known Design Decisions](#known-design-decisions)

---

## Architecture

```
┌─────────────────┐    HTTPS     ┌──────────────────────┐
│   React (Vite)  │ ──────────▶ │  Express (Node.js)   │
│   Vercel CDN    │             │  Railway / Render     │
└─────────────────┘             └──────────┬───────────┘
                                           │
                                           ▼
                                ┌──────────────────────┐
                                │    PostgreSQL         │
                                │  Railway / Neon       │
                                └──────────────────────┘
                                           ▲
                                           │ webhook
                                ┌──────────────────────┐
                                │      Razorpay        │
                                │  (payment gateway)   │
                                └──────────────────────┘
```

### Key architectural decisions

**JWT role sync:** When a user becomes a creator, the backend issues a *new* JWT with `role='creator'`. The frontend stores this immediately. Without this, the old token still says `subscriber` and every creator API call fails.

**Subscription state machine:**
```
pending ──(webhook)──▶ active ──(cancel)──▶ cancelled
                                                ↑
                         Only active grants content access
```

**Content access IDs:** `content.creator_id` → `creators.id` (not `users.id`). The JWT carries `users.id`. The `content` table's JOIN with `creators` exposes `creator_user_id` to safely do the creator-bypass check in middleware.

**403 with metadata:** When a subscriber without access hits a paid content endpoint, the server returns 403 *with full content metadata* so the frontend can render a locked-preview + purchase CTA without a second request.

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally
- A Razorpay test account (free at razorpay.com)

### 1. Clone and install

```bash
git clone https://github.com/yourusername/creator-dashboard.git
cd creator-dashboard

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Database setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE creator_dashboard;"

# Run schema (creates all tables and indexes)
psql -U postgres -d creator_dashboard -f database/schema.sql

# Optional: load test data
psql -U postgres -d creator_dashboard -f database/seed.sql
```

### 3. Configure environment

```bash
cd server
cp .env.example .env
# Edit .env with your DB credentials and Razorpay test keys
```

Minimum required values for local dev:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=creator_dashboard
DB_USER=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=any_long_random_string_here
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 4. Razorpay webhook (local testing)

For local webhook testing, use [ngrok](https://ngrok.com):

```bash
ngrok http 5000
# Copy the https URL, e.g. https://abc123.ngrok.io

# In Razorpay dashboard → Webhooks → Add new
# URL: https://abc123.ngrok.io/api/payments/webhook
# Events: payment.authorized
# Copy the webhook secret into RAZORPAY_WEBHOOK_SECRET
```

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | `development` or `production` |
| `PORT` | No | Server port (default: 5000) |
| `DATABASE_URL` | Either/or | Full connection string (cloud) |
| `DB_HOST` | Either/or | PostgreSQL host (local) |
| `DB_PORT` | Either/or | PostgreSQL port (local) |
| `DB_NAME` | Either/or | Database name (local) |
| `DB_USER` | Either/or | Database user (local) |
| `DB_PASSWORD` | Either/or | Database password (local) |
| `JWT_SECRET` | **Yes** | Secret for signing JWTs (min 32 chars) |
| `RAZORPAY_KEY_ID` | **Yes** | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | **Yes** | Razorpay API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | **Yes** | Razorpay webhook secret |
| `CORS_ORIGIN` | Prod only | Frontend URL(s), comma-separated |

### Client (`client/.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL in production (blank = use Vite proxy) |

---

## Running the App

```bash
# Terminal 1 — Backend
cd server
npm run dev         # Node --watch restarts on file change

# Terminal 2 — Frontend
cd client
npm run dev         # Vite dev server on http://localhost:3000
```

Visit **http://localhost:3000**

---

## Project Structure

```
creator-dashboard/
├── database/
│   ├── schema.sql          # All tables, indexes, views
│   └── seed.sql            # Test data
│
├── server/
│   ├── server.js           # Express app entry point
│   ├── package.json
│   ├── .env.example
│   ├── Dockerfile
│   ├── render.yaml
│   │
│   ├── config/
│   │   └── db.js           # PostgreSQL pool (supports DATABASE_URL)
│   │
│   ├── models/             # Database access layer
│   │   ├── User.js
│   │   ├── Creator.js
│   │   ├── Content.js      # findById includes creator info
│   │   └── Subscription.js # findByUserId returns content_title alias
│   │
│   ├── controllers/        # Business logic
│   │   ├── authController.js
│   │   ├── creatorController.js
│   │   ├── contentController.js   # uploadContent uses creator.id not user.id
│   │   ├── subscriptionController.js
│   │   └── paymentController.js
│   │
│   ├── routes/             # Express routers
│   │   ├── auth.js
│   │   ├── creators.js
│   │   ├── content.js
│   │   ├── subscriptions.js
│   │   └── payments.js
│   │
│   ├── middleware/
│   │   ├── auth.js           # JWT verification
│   │   ├── contentAccess.js  # Access control (uses creator_user_id from JOIN)
│   │   └── authorization.js  # Ownership checks
│   │
│   └── utils/
│       ├── tokenGenerator.js
│       ├── razorpay.js
│       ├── amountConverter.js  # INR ↔ paise conversions
│       ├── webhookVerifier.js  # HMAC-SHA256 signature check
│       └── validators.js
│
├── client/
│   ├── index.html          # Loads Razorpay SDK + Google Fonts
│   ├── vite.config.js      # Proxy /api to backend
│   ├── tailwind.config.js
│   ├── vercel.json         # SPA routing rewrites
│   │
│   └── src/
│       ├── App.jsx           # React Router v6 routes
│       ├── main.jsx
│       ├── index.css         # Tailwind + component classes
│       │
│       ├── context/
│       │   ├── AuthContext.jsx  # JWT storage, becomeCreator token refresh
│       │   └── ToastContext.jsx
│       │
│       ├── utils/
│       │   ├── api.js            # All API calls; errors carry status + data
│       │   └── razorpayLoader.js # Dynamic SDK loading
│       │
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── ContentCard.jsx
│       │   └── ui.jsx           # LoadingSpinner, EmptyState, etc.
│       │
│       └── pages/
│           ├── LoginPage.jsx
│           ├── RegisterPage.jsx
│           ├── BrowseContentPage.jsx
│           ├── ContentDetailPage.jsx  # State machine: accessible/locked/requires_auth
│           ├── CheckoutPage.jsx       # Razorpay + polling
│           ├── MySubscriptionsPage.jsx
│           └── DashboardPage.jsx      # Creator tabs + subscriber CTA
│
└── README.md
```

---

## API Reference

### Auth
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/api/auth/register` | — | `{email, username, password, passwordConfirm}` | `{user}` |
| POST | `/api/auth/login` | — | `{email, password}` | `{token, user}` |

### Creators
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/api/creators/become-creator` | Bearer | `{displayName}` | `{creator, token}` ← **new token!** |
| GET | `/api/creators/me` | Bearer | — | creator object |
| PUT | `/api/creators/:id` | Bearer | `{displayName, bio, bankAccount}` | `{creator}` |

### Content
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| GET | `/api/content/browse` | — | — | `{content[]}` |
| GET | `/api/content/:id` | Optional | — | content or 401/403/404 |
| POST | `/api/content/:id/view` | Optional | — | `{views_count}` |
| POST | `/api/content` | Creator | `{title, description?, fileUrl?, price}` | `{content}` |
| PUT | `/api/content/:id` | Creator | `{title?, description?, fileUrl?, price?}` | `{content}` |
| DELETE | `/api/content/:id` | Creator | — | `{content}` |
| GET | `/api/content/my` | Creator | — | `{content[]}` |

### Subscriptions
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/api/subscriptions` | Bearer | `{contentId}` | `{subscription}` (status: pending) |
| GET | `/api/subscriptions` | Bearer | — | `{subscriptions[], summary}` |
| DELETE | `/api/subscriptions/:id` | Bearer | — | `{subscription}` (status: cancelled) |
| POST | `/api/subscriptions/:id/activate-testing` | Bearer | — | dev only |

### Payments
| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/api/payments/create-order` | Bearer | `{subscriptionId}` | `{order: {orderId, amount, keyId}}` |
| POST | `/api/payments/webhook` | Signature | Razorpay payload | `{status: ok}` |
| POST | `/api/payments/verify` | Bearer | `{subscriptionId}` | 200 (active) or 202 (pending) |

---

## Deployment

### Deploy to Render + Vercel (recommended free tier)

**Step 1: Deploy database (Neon.tech — free PostgreSQL)**
1. Create account at [neon.tech](https://neon.tech)
2. Create a new project → copy the connection string
3. Run schema: `psql "your_connection_string" -f database/schema.sql`

**Step 2: Deploy backend to Render**
1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo, set root directory to `server`
4. Build command: `npm install` | Start command: `npm start`
5. Add environment variables (from `.env.example`):
   - `DATABASE_URL` = your Neon connection string
   - `JWT_SECRET` = generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
   - `NODE_ENV` = `production`
6. Note your Render URL (e.g. `https://creator-api.onrender.com`)

**Step 3: Deploy frontend to Vercel**
1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Set root directory to `client`
3. Build command: `npm run build` | Output directory: `dist`
4. Add environment variable: `VITE_API_URL` = your Render backend URL
5. Deploy → note your Vercel URL

**Step 4: Update CORS**
- In Render, set `CORS_ORIGIN` = your Vercel URL (e.g. `https://creator-dashboard.vercel.app`)

**Step 5: Configure Razorpay webhook**
- In Razorpay dashboard → Settings → Webhooks → Add new
- URL: `https://your-render-url.onrender.com/api/payments/webhook`
- Events: `payment.authorized`
- Copy secret → set as `RAZORPAY_WEBHOOK_SECRET` in Render

---

## Known Design Decisions

**Why `creators.id` ≠ `users.id`?**
The content table links to the `creators` table (not `users`) via `creator_id`. This enables future multi-creator features. The middleware joins `creators` to get `creator_user_id` for safe comparison with JWT's `users.id`.

**Why no refresh tokens?**
Kept simple for MVP. The 1-hour JWT expiry is short enough for security. A TODO comment is left for refresh token implementation in a future iteration.

**Why is payment verification done by polling?**
Razorpay's webhook is async and may arrive seconds after the user's payment completes. The frontend polls `POST /verify` every 2 seconds (max 12 attempts = 24 seconds) and shows a spinner. This is the standard pattern for Razorpay integrations.

**Why partial unique index for subscriptions?**
`UNIQUE (user_id, content_id) WHERE status='active'` allows a user to have multiple *pending* subscriptions to the same content (e.g., retrying payment) while preventing two *active* subscriptions. Only the webhook-activated one counts.

File Storage: Content is currently stored as a URL reference rather than 
a hosted file. Phase 2 would replace this with S3-backed private storage 
and signed URL generation for time-limited access. Creators should use 
private/unlisted external hosting for meaningful content protection.