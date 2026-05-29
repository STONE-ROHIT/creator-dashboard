# Creator Dashboard — Complete Engineering Documentation

> This document is written for someone who wants to truly understand **why** the system works the way it does — not just what the files are. Every architectural decision, every flow, every tradeoff is explained in depth.

---

## PART 0 — REALISTIC PROJECT ASSESSMENT

Before anything else, here is an honest engineering assessment.

### 1. Is the project MVP-complete?

**Yes, functionally.** Every core feature works end-to-end:
- Users register, log in, and hold persistent sessions
- Subscribers discover and browse content
- Subscribers buy paid content via Razorpay and get lifetime access
- Creators upload, manage, and profit from content
- Access control is enforced server-side on every request
- The subscription lifecycle (pending → active → cancelled) is correctly implemented

What "MVP-complete" means here: a real user could sign up, a real creator could upload a course, a real subscriber could pay ₹499 and access it, and the money would flow correctly. That loop is closed.

### 2. Are we mainly at deployment/finalization stage?

**Yes, with caveats.** The architecture is stable, the data model is correct, and the critical bugs have been fixed. Deployment itself is a known set of steps (documented in README.md). The remaining work is almost entirely operational — getting environment variables right, configuring Razorpay webhooks, setting up a cloud PostgreSQL instance. There is no new feature to build before deployment.

### 3. What critical things are still missing before deployment?

Truly critical (will break without these):
- **CORS_ORIGIN** must be set to the exact Vercel frontend URL or the browser will block all API calls
- **RAZORPAY_WEBHOOK_SECRET** must match what's configured in the Razorpay dashboard or payments will never activate subscriptions
- **DATABASE_URL** (or individual DB params) must point to a live PostgreSQL instance
- **schema.sql must be run** on the production database — the app will crash on first request otherwise
- **JWT_SECRET** must be a long random string — a weak secret means tokens can be forged

Not critical but strongly recommended before showing to anyone:
- Real Razorpay live keys (test mode won't process real money)
- The `activate-testing` endpoint is blocked in production (already guarded by `NODE_ENV` check)

### 4. Is the architecture stable enough for deployment and resume usage?

**Yes.** The architecture follows industry-standard patterns:
- Layered backend (routes → middleware → controllers → models → database)
- Stateless JWT authentication (horizontally scalable)
- Database is the single source of truth for all business state
- Frontend is presentation-only (no business logic lives in React)
- Payment activation happens server-side via webhook (not client-reported)

This is production-grade thinking applied to an MVP scope. It's honest internship-level work — not overengineered, not underengineered.

### 5. What remaining work is optional/hardening/devops?

| Category | Item |
|----------|------|
| **Deployment** | Run schema on prod DB, configure env vars, set up Razorpay webhook URL |
| **Security hardening** | Add rate limiting (express-rate-limit), add Helmet.js headers |
| **Security hardening** | Add refresh tokens (JWT expires in 1h — users get logged out) |
| **Production hardening** | Structured logging (Winston/Pino instead of console.log) |
| **Production hardening** | Error monitoring (Sentry for both frontend and backend) |
| **UI/UX refinement** | Responsive mobile layout (currently desktop-first) |
| **UI/UX refinement** | Loading skeleton screens instead of spinner |
| **UI/UX refinement** | Search and filter on browse page |
| **Testing improvement** | Automated tests (Jest for backend unit tests, Playwright for E2E) |
| **Scalability** | Redis caching for browse results and content metadata |
| **Scalability** | S3/Cloudinary for actual file uploads (currently just a URL field) |
| **Optional polishing** | Email notifications (SendGrid — subscription confirmed, etc.) |
| **Optional polishing** | Creator earnings dashboard with transaction history table |
| **Optional polishing** | Pagination on browse page (currently loads all published content) |

---

## PART 1 — PROJECT OVERVIEW

### What the Application Is

Creator Dashboard is a **creator monetization platform** — a system where people who have knowledge (creators) can package it into courses, tutorials, or any digital content, set a price, and sell lifetime access to people who want to learn (subscribers).

Think of it as a minimal version of Gumroad or Patreon's course feature. A creator uploads "Advanced React Patterns" for ₹499. A subscriber pays once. The subscriber gets permanent access. The creator earns money. Simple, clean, and complete.

### Target Users

**Creators:** Developers, designers, educators, or any knowledge-holder who wants to monetize their expertise without building their own payment infrastructure. They need: a place to list their content, a way to set prices, and a way to receive payment.

**Subscribers:** Learners who want to buy and access educational content. They need: discovery (browse), a purchase mechanism, and reliable access to what they paid for.

### The Business Model

Pure one-time payment, lifetime access. This is intentionally simple:
- No monthly subscriptions (no recurring billing complexity)
- No revenue sharing split shown to creator yet (total_earnings field exists for future)
- No free trials or coupons
- Content is either free (₹0, open to all) or paid (one-time purchase)

This model was chosen because it's the minimum viable monetization loop: create → sell → access. Every other model adds complexity (recurring webhooks, proration, dunning) that's out of scope for an MVP.

### Backend-First Philosophy

The single most important architectural decision in this project: **the backend is the source of truth for all business state.** The frontend never decides:
- Whether a user has access to content
- Whether a subscription is active
- Whether a payment was successful
- Whether a user is a creator

The frontend only **renders** what the backend tells it. The backend **enforces** every rule. This is the correct approach for any system involving money or access control, because browsers can be manipulated — servers (usually) cannot.

If you removed the entire React frontend and replaced it with curl commands, every business rule would still be enforced identically. That's how you know the architecture is correct.

---

## PART 2 — COMPLETE TECH STACK EXPLANATION

### React 18

React is a JavaScript library for building user interfaces using **components** — reusable pieces of UI that manage their own state. React 18 introduced concurrent features, but we primarily use:

- **Hooks** (`useState`, `useEffect`, `useCallback`, `useContext`) — functional components with lifecycle awareness
- **Context API** — global state shared across components without "prop drilling"

**Why React and not plain HTML/JS?** The application has many pages, complex conditional rendering (the content detail page has 5 different states), shared authentication state, and toast notifications that appear from anywhere. Managing all this in vanilla JS would require reinventing React. React's component model makes each piece independently understandable.

**Why not Vue or Angular?** React is the industry standard for frontend internship roles. The ecosystem (React Router, React DevTools, component libraries) is the largest.

### Vite

Vite is the **development server and build tool**. During development, it:
1. Serves JavaScript as native ES modules (no bundling needed → instant start)
2. Proxies `/api/*` requests to `localhost:5000` (avoiding CORS issues in dev)
3. Hot-reloads the browser when you save a file

For production, it bundles everything into optimized static files in `/dist`.

**Why Vite and not Create React App (CRA)?** CRA bundles everything on startup with Webpack, which takes 30+ seconds for large projects. Vite uses native browser ES modules and only processes what's actually requested — startup is under 1 second. CRA is also deprecated.

**The proxy is critical:** Without it, browser requests to `/api/content/browse` would go to `localhost:3000` (Vite's port) and fail. The proxy in `vite.config.js` intercepts any `/api/*` request and forwards it to `localhost:5000` where Express is running.

### Tailwind CSS v3

Tailwind is a **utility-first CSS framework**. Instead of writing CSS classes like `.card { background: white; padding: 16px; border-radius: 8px; }`, you put the utilities directly in the HTML: `className="bg-white p-4 rounded-lg"`.

**Why Tailwind?** Three reasons:
1. **Speed** — you never leave the component file to write styles. Everything is co-located.
2. **Consistency** — Tailwind's default scale (spacing, colors, typography) produces consistent results without a design system.
3. **Production size** — Tailwind v3 uses JIT (Just-In-Time) compilation. It scans your source files and only generates CSS for utilities you actually use. The production CSS bundle is tiny.

**Our custom additions** in `tailwind.config.js`: We define `bg-bg-primary`, `bg-bg-card`, `ink-primary`, `ink-muted`, `brand` colors so we can use `bg-bg-card` instead of `bg-[#171722]` everywhere. We also define component classes (`.card`, `.btn-primary`, `.input`) in `index.css` using `@apply` — these are reusable class combinations for consistency.

### Context API

React's Context API is a **dependency injection system for React components**. It lets you create a value (like the current user's auth state) and make it available to any component in the tree without passing it as props through every intermediate component.

We have two contexts:
- **AuthContext** — the logged-in user, their JWT token, and auth functions (login, logout, becomeCreator)
- **ToastContext** — the system for showing temporary notification messages

**Why Context API and not Redux?** Redux is appropriate for complex applications with many pieces of shared, frequently-changing state. Our shared state is simple: one user object and a list of toasts. Context API handles this with zero additional dependencies and far less boilerplate.

### Express.js

Express is a **minimalist Node.js web framework**. It handles HTTP requests through a chain of **middleware functions** — each function processes the request and either responds or passes it to the next function.

A typical Express request flow:
```
Browser request
  → express.json() (parse request body)
  → cors() (add CORS headers)
  → router.get('/api/content/browse', browseContent)
  → browseContent controller executes
  → res.json(data) sends response
```

**Why Express and not Fastify or NestJS?** Express is the most widely known Node.js framework. It's simple enough that you can see exactly what's happening without framework magic. NestJS adds significant abstraction (decorators, modules, dependency injection) that's valuable in large teams but adds cognitive overhead for an MVP.

### PostgreSQL

PostgreSQL is a **relational database** — data is stored in tables with defined relationships between them. It provides:
- **ACID transactions** — operations either fully succeed or fully fail (critical for payment activation)
- **Foreign key constraints** — the database enforces that `content.creator_id` must reference a real `creators.id`
- **Partial unique indexes** — `UNIQUE (user_id, content_id) WHERE status='active'` (this is not possible in most NoSQL databases)
- **SQL** — a declarative query language that lets you express complex relationships simply

**Why PostgreSQL and not MongoDB?** This data is inherently relational. A subscription belongs to a user AND belongs to content AND has a status that follows a state machine. Expressing and enforcing these relationships in SQL is natural. In MongoDB, you'd enforce all of this in application code — which means bugs when you forget. PostgreSQL lets the database be the safety net.

**Why not MySQL?** PostgreSQL has partial unique indexes (critical for our subscription constraint), better JSON support, and is generally considered the production-grade choice.

### JWT (JSON Web Tokens)

A JWT is a **signed token** containing a JSON payload. Our tokens contain:
```json
{ "id": 1, "role": "creator", "iat": 1700000000, "exp": 1700003600 }
```

The token is signed with `JWT_SECRET` using HMAC-SHA256. Anyone can decode the payload (it's just base64), but they cannot modify it without invalidating the signature — because they don't know the secret.

**How authentication works:** The browser sends `Authorization: Bearer <token>` on every API request. The server verifies the signature, extracts the payload, and trusts `req.user.id` and `req.user.role`.

**Why stateless JWT and not sessions?** Sessions require the server to store session data (in memory or Redis). JWT is stateless — the server doesn't store anything. Any server instance can verify any token. This makes horizontal scaling trivial: add more backend instances without shared session storage.

**The tradeoff:** JWTs cannot be invalidated before they expire. If you wanted to implement "log out everywhere" or "revoke access," you'd need a token blacklist — which reintroduces statefulness. For an MVP with 1-hour expiry, this tradeoff is acceptable.

### Razorpay

Razorpay is an **Indian payment gateway**. It handles:
- Collecting card/UPI/netbanking details from users (in their PCI-compliant popup)
- Processing the actual payment
- Notifying us via webhook when payment succeeds

**Why Razorpay and not Stripe?** Razorpay is designed for Indian merchants. It supports UPI (the dominant payment method in India), requires an Indian business registration for live mode, and has better bank support in India. Stripe has poor UPI support and higher fees for INR transactions.

**The key insight:** We never see the user's payment details. The Razorpay popup collects them directly on Razorpay's servers. We only ever see order IDs and webhook notifications. This is the correct and secure way to handle payments.

### ES Modules

Both the frontend (React) and backend (Node.js) use ES Modules — the modern JavaScript module system. This means:
```js
import something from './module.js';  // ES Module (what we use)
const something = require('./module'); // CommonJS (old way)
```

**Why ES Modules?** They're the browser-native module system (no transpilation needed), support tree-shaking (unused imports aren't bundled), and use static analysis (imports are resolved at parse time, not runtime). The backend uses `"type": "module"` in `package.json` to enable ES Modules in Node.js.

---

## PART 3 — COMPLETE DATABASE DOCUMENTATION

### The Big Picture: How Tables Relate

```
users (1)
 │
 ├── [1:1] creators
 │         │
 │         └── [1:M] content
 │                    │
 └── [1:M] subscriptions ←───┘
           (user_id FK → users)
           (content_id FK → content)
```

Every subscription connects a user to a piece of content. Every piece of content belongs to a creator. Every creator profile belongs to a user. The `users` table is the root of everything — delete a user and all their data cascades away.

---

### Table: `users`

```sql
id            SERIAL PRIMARY KEY
email         VARCHAR(255) UNIQUE NOT NULL
username      VARCHAR(100) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
role          VARCHAR(20) DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'creator'))
created_at    TIMESTAMP DEFAULT NOW()
updated_at    TIMESTAMP DEFAULT NOW()
```

**Purpose:** The authentication table. Every person using the system has a row here. It stores their identity and credentials.

**The `role` column:** This is the most important column in the table. It has only two possible values: `'subscriber'` and `'creator'`. New users always start as `'subscriber'`. When they click "Become a Creator," it changes to `'creator'`. This role flows into the JWT, which is then used by every subsequent API request to decide what that user is allowed to do.

**The `password_hash` column:** The actual password is never stored. Ever. `bcrypt.hash(password, 10)` runs the password through 10 rounds of the bcrypt key derivation function. The result is a 60-character string that can verify the original password but cannot be reversed to recover it. Even if the database is leaked, users' passwords are safe.

**Why `username` is UNIQUE:** Two users cannot have the same username. This prevents confusion and enables future features (like `@username` mentions or profile URLs like `/creators/alexdev`).

**Cascade behavior:** `creators.user_id` and `subscriptions.user_id` both have `ON DELETE CASCADE`. This means deleting a user row automatically deletes their creator profile and all their subscriptions. This keeps the database clean without requiring application-level cleanup.

---

### Table: `creators`

```sql
id             SERIAL PRIMARY KEY
user_id        INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE
display_name   VARCHAR(255)
bio            TEXT
total_earnings NUMERIC(10,2) DEFAULT 0
bank_account   VARCHAR(255)
created_at     TIMESTAMP DEFAULT NOW()
updated_at     TIMESTAMP DEFAULT NOW()
```

**Purpose:** The "creator profile" — additional information about users who have chosen to create content. This is deliberately **separate from `users`** for clean normalization.

**Why a separate table instead of adding columns to `users`?** Consider the alternative: adding `display_name`, `bio`, `total_earnings`, `bank_account` directly to the `users` table. For subscribers, all those columns would be NULL. You'd always be querying columns that don't apply. The separate table means subscribers have zero rows in `creators` — the data model reflects reality. This is called **table-per-type normalization**.

**The `user_id UNIQUE` constraint:** A user can have at most one creator profile. The UNIQUE constraint enforces this at the database level. Even if a bug in the application tried to insert two creator rows for the same user, the database would reject it.

**`total_earnings`:** Currently updated manually (placeholder for future payout system). In a production system, this would be computed from the `subscriptions` table where `status='active'`. For now it's stored directly.

**`bank_account`:** Stored as plain text (future: encrypt at rest for PCI compliance). This is the creator's bank account for payout — not yet implemented beyond storage.

**The ID problem:** `creators.id` is **not** the same as `users.id`. They're both auto-incrementing integers that start at 1 and go up. The first creator's `creators.id` might be 1, and the corresponding `users.id` might also be 1 — but that's a coincidence, not a guarantee. This caused one of the critical bugs described in Part 11.

---

### Table: `content`

```sql
id           SERIAL PRIMARY KEY
creator_id   INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE
title        VARCHAR(255) NOT NULL
description  TEXT
file_url     VARCHAR(500)
price        NUMERIC(10,2) NOT NULL DEFAULT 0
is_free      BOOLEAN DEFAULT false
views_count  INTEGER DEFAULT 0
status       VARCHAR(50) DEFAULT 'published' CHECK (status IN ('published', 'archived'))
created_at   TIMESTAMP DEFAULT NOW()
updated_at   TIMESTAMP DEFAULT NOW()
```

**Purpose:** Everything a creator has uploaded. Each row is one piece of content (a course, tutorial, ebook, etc.).

**`creator_id` → `creators.id`:** This links content to its creator profile. Note carefully: it references `creators.id`, NOT `users.id`. This is correct — content belongs to a creator profile, not directly to a user. The creator profile is the identity a creator presents publicly.

**The `price` and `is_free` columns:** These are redundant by design. `is_free` is always `price === 0`. Why store both? Performance — checking `is_free = true` is faster than `price = 0.00` in a query, and it's more semantically readable in the access control middleware. The backend enforces consistency: when price is set to 0, `is_free` is automatically set to `true`.

**Why `NUMERIC(10,2)` and not `FLOAT`?** Floating point numbers cannot represent all decimal values exactly. `0.1 + 0.2` in JavaScript is `0.30000000000000004`, not `0.3`. For currency, exactness is required. `NUMERIC(10,2)` is a fixed-precision decimal type — ₹499.00 is always exactly ₹499.00. However, when PostgreSQL returns a `NUMERIC` value over the `pg` driver, it comes back as a **string** ("499.00"), not a number. This is why every place in the code that uses price does `parseFloat(content.price)` before arithmetic.

**The `status` field:** Content is either `'published'` (visible) or `'archived'` (soft-deleted). We never hard-delete content rows because subscriptions reference them. If you hard-deleted content that had active subscriptions, those subscriptions would have a broken `content_id` FK — or worse, cascade-delete the subscriptions, taking away access users paid for.

**`views_count`:** An analytics counter. Incremented by a separate `POST /api/content/:id/view` endpoint, not on the GET endpoint. Why separate? Because GET requests may be cached by CDNs or browsers. The explicit POST is an intentional "record this view" action. Creator self-views are excluded to keep analytics meaningful.

---

### Table: `subscriptions`

```sql
id                SERIAL PRIMARY KEY
user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
content_id        INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE
subscription_type VARCHAR(50) DEFAULT 'lifetime'
status            VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','active','cancelled'))
created_at        TIMESTAMP DEFAULT NOW()
cancelled_at      TIMESTAMP
paid_amount       NUMERIC(10,2)
payment_id        VARCHAR(255)   -- Razorpay order ID
paid_at           TIMESTAMP
```

**Purpose:** The entitlement table. A row here means "user X has some relationship with content Y." The `status` column determines whether that relationship grants access.

**The state machine:** Every subscription row lives in exactly one state:

```
[CREATED] → pending → active → cancelled
                ↑                   ↑
           (on creation)    (user cancels, or
                             payment fails)
           
cancelled is FINAL — no resurrection
```

States and what they mean:
- `pending`: Row created, payment not yet confirmed. User cannot access content. Awaiting Razorpay webhook.
- `active`: Payment confirmed via webhook. User CAN access content. This is the "entitlement granted" state.
- `cancelled`: User revoked access, or cancelled a pending subscription before paying. User cannot access content. Immutable — you cannot un-cancel.

**Why is `cancelled` immutable?** Because the access control logic only checks for `active`. Making cancelled reversible would require extra logic to check "is this cancellation reversed?" — a complex history system. Instead, a cancelled subscription means the user creates a new `pending` subscription and pays again. Clean, simple, correct.

**The partial unique index — the most interesting constraint:**
```sql
CREATE UNIQUE INDEX idx_user_content_active
  ON subscriptions(user_id, content_id)
  WHERE status = 'active';
```

This says: for any given (user, content) combination, there can be at most one row where `status = 'active'`. But there can be multiple `pending` rows and multiple `cancelled` rows.

**Why allow multiple pending?** A user might click "Subscribe," go to checkout, close the tab (abandoning the pending subscription), and click "Subscribe" again. The second click creates a new pending row. The old one is orphaned but harmless. When the user eventually pays, only one activates. The partial index ensures exactly one active subscription per user-content pair regardless of how many pending/cancelled rows exist.

**`paid_amount` vs `content.price`:** Why store the amount paid on the subscription? Because prices can change. If a creator changes a course from ₹499 to ₹299, subscriptions that were created at ₹499 should record what was actually paid. The `paid_amount` is the historical record; `content.price` is the current price.

**`payment_id`:** The Razorpay order ID (format: `order_XXXXXXXXXX`). Stored when we create the Razorpay order, before payment happens. Used by the webhook to find which subscription to activate. Also used as an idempotency key — if the webhook fires twice for the same payment, the second time `payment_id` already maps to an active subscription and is silently ignored.

---

### Foreign Keys and Cascading

Every FK in this project uses `ON DELETE CASCADE`, which means:

| If you delete... | Then automatically deleted... |
|-----------------|-------------------------------|
| A `users` row | That user's `creators` row + all their `subscriptions` |
| A `creators` row | All `content` rows by that creator |
| A `content` row | All `subscriptions` to that content |

**Why cascade delete?** The alternative is `ON DELETE RESTRICT` (refuse to delete if children exist) or `ON DELETE SET NULL` (set FK to null). CASCADE is chosen because orphaned data is worse than no data. An active subscription to non-existent content is a bug. A creator profile without a user is a ghost. Cascade keeps the database self-consistent.

**Business concern:** If a creator deletes their account, subscribers lose access to what they paid for. A production system would need account deletion protection (prevent deletion if content has active subscribers) or a graceful migration (archive content, preserve access). For MVP, we accept this limitation and document it.

---

## PART 4 — COMPLETE AUTHENTICATION FLOW

### Registration

```
User fills form → POST /api/auth/register
                     │
                     ▼
              Validate inputs
              (email format, password length, match)
                     │
                     ▼
              User.findByEmail(email)  ← query users table
                     │
                  email exists? → 409 "Email already registered"
                     │
                     ▼
              bcrypt.hash(password, 10)  ← ~100ms, intentionally slow
                     │
                     ▼
              INSERT INTO users (email, username, password_hash, role='subscriber')
                     │
                     ▼
              201 { user: { id, email, username, role } }
              NOTE: No token returned. User must log in separately.
```

**Why no token on registration?** Two reasons: (1) registration confirms identity but login verifies it; (2) some flows might have email verification before allowing login — this architecture supports that future without breaking anything.

**Why is bcrypt slow?** It's intentional. The 10 "rounds" means bcrypt iterates the hashing 2^10 = 1024 times. If someone steals the database, they can only try ~100 passwords/second per CPU core against a bcrypt hash. Against SHA-256 (the wrong choice), they could try billions per second. The slowness is the security.

---

### Login

```
User submits email + password → POST /api/auth/login
                                      │
                                      ▼
                               User.findByEmail(email)
                                      │
                                 not found? → 401 "Invalid credentials"
                                      │         (same error as wrong password
                                      │          — don't reveal which is wrong)
                                      ▼
                               bcrypt.compare(password, user.password_hash)
                                      │
                                 no match? → 401 "Invalid credentials"
                                      │
                                      ▼
                               generateToken(user.id, user.role)
                                      │
                                      ▼
                               jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' })
                                      │
                                      ▼
                               200 { token, user: { id, email, username, role } }
```

**The token structure:**
```json
Header:  { "alg": "HS256", "typ": "JWT" }
Payload: { "id": 1, "role": "subscriber", "iat": 1700000000, "exp": 1700003600 }
Signature: HMAC-SHA256(base64(header) + "." + base64(payload), JWT_SECRET)
```

All three parts are base64-encoded and joined with dots: `eyJ...header.eyJ...payload.signature`

**Why the same error for "user not found" and "wrong password"?** Security. If the error said "User not found," an attacker could enumerate valid email addresses by trying different emails and watching for "wrong password" vs "not found." By returning the same error for both cases, you reveal nothing.

---

### Token Storage and Restoration

**Frontend side:**
```
Login success
  → localStorage.setItem('cd_token', token)
  → localStorage.setItem('cd_user', JSON.stringify(user))
  → setToken(token) + setUser(user) in AuthContext state
```

**On page load (AuthContext initialization):**
```js
const [token, setToken] = useState(() => localStorage.getItem('cd_token') || null);
const [user, setUser]   = useState(() => {
  const stored = localStorage.getItem('cd_user');
  return stored ? JSON.parse(stored) : null;
});
```

The `useState` initializer runs once, synchronously, before any render. This means when the user refreshes the page, React immediately knows the auth state — there's no "flash" where the user appears logged out.

**Why localStorage and not cookies?** Cookies require `httpOnly` and `Secure` flags for security, and CSRF protection becomes necessary. localStorage with JWT is simpler for a frontend-only SPA, and the XSS risk (the main concern with localStorage tokens) is acceptable for this scope. Production systems often use `httpOnly` cookies for higher security.

---

### Protected Routes

In React Router v6, our `ProtectedRoute` component wraps all routes that require login:

```jsx
// ProtectedRoute.jsx
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login, remembering where they wanted to go
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />; // Render the actual protected page
}
```

The `state={{ from: location }}` passes the intended destination to the login page. After a successful login, the frontend redirects the user to `location.state.from` instead of always going to `/dashboard`. If you tried to visit `/subscriptions` while logged out, you'd be sent to `/login`, and after logging in, you'd land on `/subscriptions`.

---

### The Stale JWT Problem: Creator Conversion

This is the most important auth subtlety in the entire codebase. Here's what happens:

```
User logs in → JWT issued: { id: 1, role: "subscriber" }
User clicks "Become a Creator"
Server: creates creators row, updates users.role to 'creator'
Server: generates NEW token: { id: 1, role: "creator" }

WRONG (what the original code did):
  Frontend ignores the new token
  Old token still in localStorage: { role: "subscriber" }
  Next request: GET /api/content/my
  Server: checks req.user.role === 'creator' → "subscriber" → 403 FORBIDDEN
  Creator cannot use any creator features

CORRECT (what we implemented):
  Frontend AuthContext.becomeCreator():
    const data = await api.becomeCreator(displayName, token);
    saveAuth(data.token, updatedUser);  // ← replaces old token immediately
  Old token is gone. New token with role='creator' is stored.
  Next request: GET /api/content/my → req.user.role === 'creator' → 200 OK
```

**The lesson:** JWTs are immutable signed documents. The signature covers the payload. You cannot change the payload (like the role) without generating a new token. The server-side database update is not enough — the client must receive and use the new token.

---

## PART 5 — COMPLETE AUTHORIZATION & ENTITLEMENT SYSTEM

### The Four Layers of Authorization

```
Layer 1: Is the user authenticated?     (auth.js middleware)
Layer 2: Is the user a creator?         (requireCreator in auth.js)
Layer 3: Does the user own this content? (contentAccess.js → checkContentOwnership)
Layer 4: Does the user have access?     (contentAccess.js → checkContentAccess)
```

Different routes use different combinations of these layers.

---

### Content Access Decision Tree

The most complex authorization in the system lives in `contentAccess.js → checkContentAccess`:

```
GET /api/content/:id
      │
      ▼
Content.findById(id)  ← JOIN with creators to get creator_user_id
      │
  not found? → 404
      │
      ▼
  content.is_free?
      │
   YES → pass (anyone can view)
   NO  ↓
      ▼
  JWT in Authorization header?
      │
   NO  → 401 "Login required to view paid content"
   YES ↓
      ▼
  Verify JWT → extract userId (users.id)
      │
      ▼
  content.creator_user_id === userId?   ← FIXED: uses creator_user_id, not creator_id
      │
   YES → pass (creator bypass)
   NO  ↓
      ▼
  Subscription.findActive(userId, contentId)
      │
   FOUND → pass (subscriber with access)
  NOT FOUND ↓
      ▼
  403 {
    error: "Subscribe to access this content",
    locked: true,
    content: { ...full metadata... }  ← CRITICAL: include metadata for locked preview
  }
```

**Why include full metadata in the 403 response?** The locked preview page needs to show the title, description, price, and creator name — otherwise it would just say "forbidden" with no context. The user needs to see what they're about to buy. The frontend `ContentDetailPage` specifically checks `if (err.status === 403) { setLockedData(err.data.content); }` and renders a purchase UI with that data.

**The creator bypass — why `creator_user_id` and not `creator_id`?**

The original code:
```js
if (content.creator_id === userId) { ... }  // WRONG
```

`content.creator_id` is the `creators` table primary key (e.g., `1`).
`userId` comes from the JWT — it's the `users` table primary key (e.g., also `1`).

For the very first user and first creator, these happen to be equal. But if user 1 is a subscriber and user 2 is the first creator, then `creators.id = 1` (first creator row) while `users.id = 2`. The comparison `1 === 2` is `false` — creator bypass never fires.

The fix in `Content.findById`:
```sql
SELECT c.*, cr.user_id AS creator_user_id FROM content c JOIN creators cr ON c.creator_id = cr.id
```

Now `content.creator_user_id` is the `users.id` of the creator — the same ID space as the JWT's `userId`. The comparison works correctly.

---

### Subscription States and Access

Only `status = 'active'` grants access. Here's why each state behaves as it does:

| Status | Access Granted | Reason |
|--------|---------------|--------|
| `pending` | ❌ No | Payment not confirmed. Money may not have moved. Granting access before payment would allow free access with a failed card. |
| `active` | ✅ Yes | Webhook confirmed payment. Money moved. Entitlement is deserved. |
| `cancelled` | ❌ No | User explicitly revoked access. Respects user intent. (Also: prevents abuse where you cancel/resubscribe to dodge a price increase.) |

The `Subscription.findActive` query:
```sql
SELECT * FROM subscriptions
WHERE user_id = $1 AND content_id = $2 AND status = 'active'
```

If this returns a row, access is granted. Simple, unambiguous, and enforced at the database level.

---

### Frontend Entitlement Rendering

`ContentDetailPage` implements a state machine with 5 states:

```
'loading'       → Show spinner
'accessible'    → Show full content (creator bypass, active sub, or free)
'locked'        → Show locked preview + purchase CTA (403 response)
'requires_auth' → Show login prompt (401 response)
'not_found'     → Show 404 message
'error'         → Show generic error
```

The transition code:
```js
try {
  const data = await api.getContent(id, token);
  setContent(data);
  setViewState('accessible');
} catch (err) {
  if (err.status === 401) setViewState('requires_auth');
  else if (err.status === 403) {
    setViewState('locked');
    setLockedData(err.data?.content || null);
  }
  else if (err.status === 404) setViewState('not_found');
  else setViewState('error');
}
```

The HTTP status code from the server directly maps to the UI state. The frontend doesn't need to know business rules — it just responds to what the server tells it.

---

## PART 6 — COMPLETE SUBSCRIPTION & PAYMENT FLOW

This is the most complex flow in the system. Here is the complete lifecycle:

### Step 1: User Clicks "Get Access"

```
User on /content/5 (paid, locked)
User clicks "Get access for ₹499"
  │
  ▼
frontend: api.subscribe(contentId, token)
  │
  ▼
POST /api/subscriptions
  body: { contentId: 5 }
  Authorization: Bearer <token>
  │
  ▼
subscriptionController.subscribeToContent:
  1. Validate contentId exists
  2. Check content is NOT free (free = no subscription needed)
  3. Check user is NOT the creator (cannot buy own content)
  4. Subscription.create(userId, contentId) → INSERT INTO subscriptions
     status='pending', created_at=NOW()
  │
  ▼
201 { subscription: { id: 42, status: 'pending', ... } }
  │
  ▼
frontend: navigate('/checkout/42')
```

At this point, a subscription row exists but grants no access. The user is redirected to the checkout page.

---

### Step 2: Checkout Page Loads

```
/checkout/42 mounts
  │
  ▼
api.getSubscriptions(token) → find subscription with id=42
  │
  ▼
If status='active' → redirect to /content/5 (already paid, go enjoy it)
If status='cancelled' → show error
If status='pending' → continue to payment
  │
  ▼
api.getContent(5, token) → 403 with metadata (still locked)
Extract: content.title, content.price = 499
  │
  ▼
Render: "Advanced React Patterns — ₹499" + "Pay with Razorpay" button
```

---

### Step 3: Creating the Razorpay Order

```
User clicks "Pay ₹499 with Razorpay"
  │
  ▼
api.createOrder(42, token)
  │
  ▼
POST /api/payments/create-order
  body: { subscriptionId: 42 }
  │
  ▼
paymentController.createPaymentOrder:
  1. Find subscription 42 → verify it's pending, belongs to this user
  2. Find content 5 → get price = 499
  3. Convert to paise: 499 * 100 = 49900
  4. razorpayInstance.orders.create({ amount: 49900, currency: 'INR', receipt: 'sub_42' })
  5. UPDATE subscriptions SET payment_id = 'order_XYZ' WHERE id = 42
     (order_XYZ = Razorpay's order ID)
  │
  ▼
201 { order: { orderId: 'order_XYZ', amount: 499, keyId: 'rzp_test_...' } }
```

Why store the Razorpay order ID in the subscription **before** payment? The webhook (Step 5) will later receive `order_XYZ` and needs to find which subscription to activate. The `payment_id` column on the subscription is the link between Razorpay's world and our database.

---

### Step 4: The Razorpay Payment Modal

```
frontend:
  const Razorpay = await loadRazorpay();  // Ensure SDK loaded
  const rzp = new Razorpay({
    key: 'rzp_test_...',
    amount: 49900,          // paise
    order_id: 'order_XYZ',
    handler: async () => {
      // Payment submitted — start polling
      startPolling();
    },
    modal: { ondismiss: () => setPageState('ready') }
  });
  rzp.open();  // Opens the Razorpay popup
```

The user interacts entirely with Razorpay's secure popup. Our code never touches the card number. The `handler` callback fires when the user successfully submits the payment form to Razorpay. **Important:** this does NOT mean payment is confirmed — it means payment was submitted. The actual confirmation comes via webhook.

---

### Step 5: Razorpay Webhook Activates Subscription

This happens **on Razorpay's servers**, independently of the user's browser session:

```
User submits payment → Razorpay processes it
  │
  ▼
Razorpay POST /api/payments/webhook
  Headers: X-Razorpay-Signature: <hmac>
  Body: {
    event: "payment.authorized",
    payload: {
      payment: {
        entity: { id: 'pay_ABC', order_id: 'order_XYZ', amount: 49900 }
      }
    }
  }
  │
  ▼
paymentController.handlePaymentWebhook:
  1. VERIFY SIGNATURE:
     expected = HMAC-SHA256(req.rawBody, WEBHOOK_SECRET)
     received = req.headers['x-razorpay-signature']
     if expected ≠ received → 401 (reject fake webhook)
     
  2. CHECK EVENT: only process 'payment.authorized'
  
  3. FIND SUBSCRIPTION:
     SELECT * FROM subscriptions WHERE payment_id = 'order_XYZ'
     → subscription 42, status='pending'
     
  4. VERIFY AMOUNT:
     received: 49900 paise = ₹499
     expected: content.price = 499
     if mismatch → 400 (reject tampered payment)
     
  5. IDEMPOTENCY CHECK:
     if subscription.status === 'active' → return 200 silently
     (handles duplicate webhook delivery)
     
  6. ACTIVATE:
     UPDATE subscriptions
     SET status='active', paid_amount=499, paid_at=NOW()
     WHERE id=42
  │
  ▼
200 { status: 'ok' }
```

**Why is webhook signature verification critical?** Without it, anyone could send a fake POST to `/api/payments/webhook` and activate subscriptions for free. The HMAC signature proves the request came from Razorpay (who knows the secret) and that the body wasn't tampered with in transit.

**Why does the webhook use `req.rawBody` instead of the parsed JSON?** The HMAC is computed over the exact bytes Razorpay sent. If you re-serialize the parsed JSON (`JSON.stringify(req.body)`), you might get different whitespace, different key ordering. The signature wouldn't match. In `server.js`, Express's `verify` callback captures the raw buffer before parsing:
```js
app.use(express.json({
  verify: (req, _res, buf, encoding) => {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}));
```

---

### Step 6: Frontend Polls for Confirmation

```
frontend (after Razorpay handler fires):
  
  function poll(attempt) {
    if (attempt >= 12) { show error; return; }
    
    await sleep(2000);  // Wait 2 seconds
    
    try {
      const result = await api.verifyPayment(42, token);
      // 200 = active
      toast.success('Payment confirmed!');
      navigate('/content/5');
    } catch (err) {
      if (err.status === 202) {
        // 202 = still pending
        poll(attempt + 1);  // Keep polling
      } else {
        show error;
      }
    }
  }
```

The `verifyPayment` endpoint:
```
POST /api/payments/verify
  body: { subscriptionId: 42 }
  │
  ▼
SELECT status FROM subscriptions WHERE id=42 AND user_id=$userId
  │
  status='active' → 200 "Payment confirmed"
  status='pending' → 202 "Payment processing - please wait"
  status='cancelled' → 400 "Invalid status"
```

The 202 status code ("Accepted but processing") is the standard HTTP status for "I got your request and it's being processed." The frontend keeps polling as long as it gets 202. When it gets 200, the subscription is active and the user can access the content.

**Why polling and not WebSockets?** WebSockets would be more efficient (one persistent connection instead of polling). But they add complexity: server needs to maintain connection state, reconnect on disconnect, etc. Polling for ~24 seconds maximum (12 attempts × 2s) is acceptable for a payment flow and far simpler.

---

### Step 7: Content Access After Payment

```
User now on /content/5 with active subscription
  │
  ▼
GET /api/content/5
  Authorization: Bearer <token>
  │
  ▼
checkContentAccess middleware:
  content.is_free = false → check auth
  JWT valid → userId extracted
  content.creator_user_id ≠ userId → not creator
  Subscription.findActive(userId, 5) → FOUND (just activated!)
  → pass middleware → getContent controller
  │
  ▼
200 { id:5, title:'...', description:'...', file_url:'...', ... }
  │
  ▼
ContentDetailPage: setViewState('accessible')
  Renders: AccessibleContentUI with content, "Subscribed ✓" badge
```

---

### Cancellation Flow

```
User on /subscriptions, clicks "Cancel" on subscription 42
  │
  ▼
confirm("Cancel? You'll lose access.")
  │
  ▼
api.cancelSubscription(42, token)
  │
  ▼
DELETE /api/subscriptions/42
  │
  ▼
Subscription.cancel(42, userId):
  1. findById(42) → verify exists
  2. verify subscription.user_id === userId (can't cancel others')
  3. UPDATE subscriptions SET status='cancelled', cancelled_at=NOW() WHERE id=42
  │
  ▼
200 { subscription: { status: 'cancelled', ... } }
  │
  ▼
frontend: reload subscriptions → subscription moves to "Cancelled" tab
```

Access is now revoked. If the user visits `/content/5` again, `Subscription.findActive(userId, 5)` returns nothing → 403 locked.

**Why not hard-delete the subscription?** History. If a user paid ₹499 on Jan 1 and cancelled on Jan 15, that transaction happened. Deleting the row would erase proof of payment. The soft-delete (setting `status='cancelled'`, recording `cancelled_at`) preserves the record.

---

## PART 7 — COMPLETE FRONTEND ARCHITECTURE

### Folder Structure Philosophy

```
src/
├── context/        State that spans the entire app (auth, toasts)
├── utils/          Functions that don't render anything (API calls, Razorpay loader)
├── components/     Reusable UI pieces used by multiple pages
└── pages/          One component per route — orchestrates layout and data
```

This separation means:
- **Pages** are the "directors" — they fetch data, manage page-level state, render layout
- **Components** are the "actors" — they receive props and render UI
- **Utils** are the "crew" — they do work that isn't rendering
- **Context** is the "shared memory" — global state that any component can read

### React Router v6 Route Structure

```jsx
<Routes>
  {/* Public */}
  <Route path="/browse"       element={<BrowseContentPage />} />
  <Route path="/content/:id"  element={<ContentDetailPage />} />
  <Route path="/login"        element={isAuthenticated ? <Navigate to="/dashboard"/> : <LoginPage />} />
  <Route path="/register"     element={isAuthenticated ? <Navigate to="/dashboard"/> : <RegisterPage />} />

  {/* Protected — wrapped in ProtectedRoute outlet */}
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard"              element={<DashboardPage />} />
    <Route path="/subscriptions"          element={<MySubscriptionsPage />} />
    <Route path="/checkout/:subscriptionId" element={<CheckoutPage />} />
  </Route>

  {/* Default */}
  <Route path="/" element={<Navigate to="/browse" />} />
  <Route path="*" element={<Navigate to="/browse" />} />
</Routes>
```

**How `ProtectedRoute` works with `<Outlet>`:** React Router v6 uses `<Outlet />` as a placeholder for nested routes. When you visit `/dashboard`:
1. Router finds the `<Route element={<ProtectedRoute />}>` wrapper
2. `ProtectedRoute` checks `isAuthenticated`
3. If authenticated: renders `<Outlet />` which resolves to `<DashboardPage />`
4. If not: renders `<Navigate to="/login" />`

**Why redirect logged-in users away from `/login` and `/register`?** If you're already logged in, hitting the login page makes no sense. The redirect to `/dashboard` provides the behavior users expect from every real app.

---

### AuthContext — The Global State Spine

`AuthContext` is the most important context. Every component that needs to know "who is logged in" reads from it:

```js
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // useState initializer runs ONCE, synchronously
  // Reads localStorage so auth state survives page refresh
  const [token, setToken] = useState(() => localStorage.getItem('cd_token') || null);
  const [user, setUser]   = useState(() => JSON.parse(localStorage.getItem('cd_user') || 'null'));

  const saveAuth = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    if (newToken) {
      localStorage.setItem('cd_token', newToken);
      localStorage.setItem('cd_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('cd_token');
      localStorage.removeItem('cd_user');
    }
  };

  const login = async (email, password) => {
    const data = await api.login(email, password);
    saveAuth(data.token, data.user);
    return data;
  };

  // CRITICAL: receives new token, stores it atomically
  const becomeCreator = async (displayName) => {
    const data = await api.becomeCreator(displayName, token);
    const updatedUser = { ...user, role: 'creator' };
    saveAuth(data.token, updatedUser);
    return data;
  };

  const logout = () => saveAuth(null, null);

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, isCreator: user?.role === 'creator', login, register, becomeCreator, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**The `isCreator` computed value:** `user?.role === 'creator'` is computed fresh on every render from the current `user` state. After `becomeCreator()` updates `user.role`, every component that reads `isCreator` re-renders automatically with the new value. The Navbar badge changes, the DashboardPage switches from subscriber to creator view, all instantly.

---

### The API Service Layer (`utils/api.js`)

All HTTP calls live in one file. This is the **service layer** pattern:

```js
async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { method, headers, body: JSON.stringify(body) });
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;  // ← CRITICAL: attach status to error
    err.data = data;           // ← CRITICAL: attach full response to error
    throw err;
  }
  return data;
}
```

**Why attach `status` and `data` to the error?** The `ContentDetailPage` state machine needs to differentiate 401 from 403 from 404 to render different UI. Without `err.status`, you'd have to parse the error message string — fragile. Without `err.data`, you couldn't access the locked content metadata from the 403 response.

**Why centralize all API calls?** Two reasons:
1. If the backend URL changes, you change it in one place
2. Every component that calls `api.getContent(...)` gets the same error handling behavior. No component re-implements fetch logic.

---

### DashboardPage — Conditional Rendering Architecture

The dashboard renders completely different content based on role:

```jsx
export default function DashboardPage() {
  const { isCreator } = useAuth();
  return isCreator ? <CreatorDashboard /> : <SubscriberDashboard />;
}
```

`isCreator` comes from `user.role === 'creator'` in AuthContext. The moment `becomeCreator()` runs, `isCreator` becomes `true`, React re-renders `DashboardPage`, and the creator dashboard appears — no page refresh needed.

**The Creator Dashboard tab system:**
```
state: tab = 'content' | 'upload' | 'profile'

'content' → ContentTab (table of content rows with delete/view buttons)
'upload'  → UploadTab (form to create new content)
'profile' → ProfileTab (edit display_name, bio, bank_account)
```

Tab state lives inside `CreatorDashboard` — it's page-local state, not global. Only this component needs to know which tab is selected.

---

### CheckoutPage — Polling State Machine

```
pageState = 'loading' | 'ready' | 'paying' | 'polling' | 'success' | 'error'

'loading'  → Fetch subscription details
'ready'    → Show "Pay ₹499 with Razorpay" button
'paying'   → Clicked pay, creating Razorpay order + opening modal
'polling'  → Razorpay handler fired, polling /verify every 2s
'success'  → Got 200 from /verify — show success UI, redirect in 2s
'error'    → Something went wrong — show error, offer retry
```

The polling uses a `ref` (`pollTimer`) instead of state to store the setTimeout reference. Refs don't trigger re-renders, which is correct here — the timeout ID is implementation detail, not UI state.

```js
const pollTimer = useRef(null);

// Cleanup on unmount (prevents memory leak if user navigates away)
useEffect(() => {
  loadSubscriptionDetails();
  return () => clearTimeout(pollTimer.current);
}, [subscriptionId]);
```

The cleanup function in `useEffect` ensures that if the user navigates away during polling, the timer is cancelled. Without this, the `navigate()` call inside the poll function would run on an unmounted component — a React memory leak warning.

---

## PART 8 — COMPLETE BACKEND ARCHITECTURE

### The Layered Architecture

```
HTTP Request
    │
    ▼
server.js
  └── express.json() middleware (parse body, capture rawBody)
  └── cors() middleware (add CORS headers)
    │
    ▼
routes/*.js
  └── Match URL pattern + HTTP method
  └── Apply middleware chain
  └── Call controller function
    │
    ▼
middleware/*.js
  └── authenticate (verify JWT, add req.user)
  └── requireCreator (check req.user.role)
  └── checkContentAccess (entitlement logic)
  └── checkContentOwnership (ownership verification)
    │
    ▼
controllers/*.js
  └── Business logic
  └── Call model methods
  └── Format and send response
    │
    ▼
models/*.js
  └── SQL queries against PostgreSQL
  └── Data validation
  └── Return plain JavaScript objects
    │
    ▼
PostgreSQL
```

**Why this layering?** Each layer has one job:
- Routes: declare which URL patterns exist and what middleware they use
- Middleware: make decisions about whether a request can proceed
- Controllers: orchestrate what happens when a request is allowed
- Models: translate business concepts into database operations

If you want to add a new feature, you know exactly which layer to touch. If auth breaks, you look at middleware. If a query is wrong, you look at models.

---

### Route Structure Analysis

Look at the content route file as a representative example:

```js
// Routes in specificity order — CRITICAL for Express
router.post('/',         authenticate, requireCreator, uploadContent);
router.get('/my',        authenticate, requireCreator, getMyContent);
router.get('/browse',    browseContent);                              // Public
router.get('/:id',       checkContentAccess, getContent);
router.post('/:id/view', recordContentView);
router.put('/:id',       authenticate, requireCreator, checkContentOwnership, updateContent);
router.delete('/:id',    authenticate, requireCreator, checkContentOwnership, deleteContent);
```

**Why does `/my` come before `/:id`?** Express matches routes in order. If `/:id` came first, a request to `/my` would match it with `id = 'my'`. Then `Content.findById('my')` would query for content with id='my', find nothing, and return 404. By putting `/my` first, it's matched specifically before the generic `/:id` pattern.

**Middleware as a security chain:** Each middleware in the array must call `next()` for the request to continue. If any middleware returns a response (like a 401 or 403), the chain stops there. The controller never executes. This means:
- Can't access content without passing access check
- Can't modify content without passing authentication AND creator check AND ownership check
- Three independent layers of defense

---

### Model Design Philosophy

Models are ES6 classes with `static` methods. There are no instances — you never do `new Content()`. Every call is `Content.findById(id)`:

```js
class Content {
  static async findById(contentId) {
    const result = await pool.query(
      `SELECT c.*, cr.display_name AS creator_display_name ...
       FROM content c JOIN creators cr ON c.creator_id = cr.id
       WHERE c.id = $1`,
      [contentId]  // ← parameterized — prevents SQL injection
    );
    return result.rows[0];
  }
}
```

**Why static methods?** Content is not a stateful object — it's a representation of a database row. There's nothing to instantiate. Static methods communicate this clearly: they're just functions namespaced under `Content`.

**Why no ORM (like Sequelize or Prisma)?** ORMs add magic. When your query doesn't do what you expect, debugging means understanding the ORM's SQL generation, not just SQL. For an MVP with well-understood queries, raw SQL in the model methods is clearer, faster, and more debuggable. The parameterized query syntax (`$1`, `$2`) prevents SQL injection without an ORM.

**Parameterized queries prevent SQL injection:**
```js
// DANGEROUS (SQL injection possible):
pool.query(`SELECT * FROM users WHERE email = '${email}'`)

// SAFE (parameterized):
pool.query('SELECT * FROM users WHERE email = $1', [email])
```

In the parameterized version, `email` is passed as data, not as part of the SQL string. PostgreSQL treats it as a literal value — even if `email = "'; DROP TABLE users; --"`, it's harmless.

---

### Error Handling Strategy

Controllers follow a consistent pattern:

```js
export const uploadContent = async (req, res) => {
  try {
    // ...business logic...
  } catch (err) {
    // Known errors → specific status codes
    if (err.message.includes('must be') || err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    // Unknown errors → 500 (log details, hide from client)
    console.error('uploadContent error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
```

**Why hide error details in production?** Stack traces and database error messages can reveal schema details, file paths, or system information to attackers. The client gets a generic "Server error"; the server logs the full detail for the developer.

---

### API Contract Design

The HTTP status codes are used semantically:

| Status | Meaning | Example |
|--------|---------|---------|
| `200` | Success, returning data | Content retrieved |
| `201` | Success, something created | Subscription created |
| `202` | Accepted, processing | Payment still pending |
| `400` | Bad request (client's fault) | Missing required field |
| `401` | Not authenticated | No token, or invalid token |
| `403` | Authenticated but forbidden | No subscription, wrong owner |
| `404` | Not found | Content doesn't exist |
| `409` | Conflict | Email already registered |
| `500` | Server error | Database unreachable |

This is important because the frontend makes decisions based on status codes (the ContentDetailPage state machine). If the backend used 400 for "not found" and 500 for "not authenticated," the frontend state machine would render the wrong UI.

---

## PART 9 — COMPLETE FLOW EXPLANATIONS

### Registration Flow (Complete)

```
[Browser]                [Frontend React]           [Express Server]         [PostgreSQL]

User fills form
  → onClick="Register"
                         handleSubmit(e)
                         e.preventDefault()
                         setLoading(true)
                         api.register(email, username, password, passwordConfirm)
                         → fetch('POST /api/auth/register', { body: {...} })
                                                    authenticate middleware
                                                    (no auth needed for register)
                                                    
                                                    authController.register()
                                                    validate(email, username, password)
                                                    passwords match?
                                                    User.findByEmail(email)
                                                                              SELECT * FROM users WHERE email=$1
                                                                              → null (user doesn't exist)
                                                    bcrypt.hash(password, 10)
                                                    → takes ~100ms
                                                    User.create(email, username, hash)
                                                                              INSERT INTO users ...
                                                                              → { id:1, email, username, role:'subscriber' }
                                                    res.status(201).json({ user })
                         
                         data = { user: {...} }
                         setLoading(false)
                         toast.success('Account created!')
                         navigate('/login')
```

---

### Content Upload Flow (Complete)

```
Creator fills upload form
  → title: "Advanced React"
  → price: 499
  → fileUrl: "https://..."
  → onClick="Upload"
                         api.uploadContent({ title, price, fileUrl }, token)
                         → fetch('POST /api/content', { Authorization: Bearer token })
                                                    
                                                    authenticate middleware:
                                                      verify JWT → req.user = { id:2, role:'creator' }
                                                    
                                                    requireCreator middleware:
                                                      req.user.role === 'creator' ✓ → next()
                                                    
                                                    contentController.uploadContent:
                                                      userId = req.user.id  // 2 (users.id)
                                                      Creator.findByUserId(2)
                                                                              SELECT * FROM creators WHERE user_id=2
                                                                              → { id:1, user_id:2, display_name:'Bob' }
                                                      creator.id  // 1 (creators.id) ← FIXED: use creator.id
                                                      Content.create(1, "Advanced React", ..., 499)
                                                                              INSERT INTO content
                                                                              (creator_id=1, title=..., price=499, is_free=false)
                                                                              → { id:3, ... }
                                                      res.status(201).json({ content })
                         
                         setMyContent(prev => [newContent, ...prev])
                         setTab('content')
                         toast.success('Content uploaded!')
```

---

### Full Subscription + Payment Flow (Complete)

```
Subscriber on /content/3 (paid, locked)
  │
  clicks "Get access for ₹499"
  │
  api.subscribe(3, token) → POST /api/subscriptions { contentId: 3 }
  Server: creates subscription { id:7, status:'pending', user_id:1, content_id:3 }
  │
  navigate('/checkout/7')
  │
  CheckoutPage mounts: loads subscription 7, loads content 3 metadata
  Displays: "Advanced React — ₹499"
  │
  clicks "Pay ₹499 with Razorpay"
  │
  api.createOrder(7, token) → POST /api/payments/create-order { subscriptionId: 7 }
  Server: creates Razorpay order 'order_ABC', stores in subscriptions.payment_id
  Returns: { orderId: 'order_ABC', keyId: 'rzp_test_...', amount: 499 }
  │
  loadRazorpay() → Razorpay SDK ready
  new Razorpay({ key, amount: 49900, order_id: 'order_ABC', handler: startPolling })
  rzp.open() → Razorpay modal appears
  │
  User enters card: 4111 1111 1111 1111
  User clicks "Pay ₹499"
  │
  Razorpay processes payment...
  │
  ┌────────────── Two things happen simultaneously ──────────────┐
  │                                                              │
  │  Razorpay → webhook                    Razorpay → handler() │
  │  POST /api/payments/webhook            fires in browser      │
  │                                                              │
  │  verifySignature ✓                     startPolling():       │
  │  find subscription by 'order_ABC'      poll attempt 1:       │
  │  verify amount ✓                         POST /verify 7      │
  │  UPDATE status='active',                → 202 (still pending)│
  │         paid_amount=499, paid_at=now   sleep(2000ms)         │
  │                                                              │
  │  Webhook arrives ~300ms after payment  poll attempt 2:       │
  │  Subscription 7 is now ACTIVE ✓         POST /verify 7      │
  │                                          → 200 ← active!    │
  │                                        toast.success(...)    │
  │                                        navigate('/content/3')│
  └──────────────────────────────────────────────────────────────┘
  │
  On /content/3:
  GET /api/content/3 (Authorization: Bearer token)
  checkContentAccess: findActive(userId=1, contentId=3) → FOUND ✓
  Returns full content → AccessibleContentUI renders
  User sees: "Subscribed ✓" badge + content
```

---

## PART 10 — MAJOR ARCHITECTURAL DECISIONS

### Decision: Backend as Source of Truth

**What it means:** No access decision is made in the frontend. React components never compute "does this user have access?" They ask the server.

**Why:** React code runs in the browser. Any user can open DevTools, modify `localStorage`, inject JavaScript, or intercept responses. If access control lived in the frontend, anyone could bypass it. The server runs in a controlled environment we own. Database state is authoritative.

**The implication:** The `ContentDetailPage` doesn't check "does my auth context say I'm subscribed?" It sends a request to the server. The server checks the database. The server responds. The UI reflects the server's decision.

### Decision: Entitlements Verified Per Request

**What it means:** Every request to a paid content endpoint checks the subscription status in the database. There's no "entitlement cache" in the JWT.

**Why:** Subscription status can change between requests (cancellation, webhook activation). If we embedded "has access to content IDs [3, 5, 7]" in the JWT, that data would be stale the moment a subscription was cancelled or activated. Per-request database checks are always current.

**The tradeoff:** One extra database query per request. For the scale of an MVP (hundreds of users, not millions), this is completely acceptable.

### Decision: Pending Subscriptions Deny Access

**What it means:** Creating a subscription (status='pending') gives no access. Only 'active' grants access.

**Why:** Pending means "I said I want to pay." Active means "I actually paid." If pending granted access, the payment step would be optional — users could subscribe, get access, and never complete payment.

**The implementation:** `Subscription.findActive()` specifically queries `WHERE status='active'`. Pending rows are invisible to the access check.

### Decision: 403 Response Includes Content Metadata

**What it means:** When a subscriber without access hits a paid content endpoint, the 403 response body contains the full content title, description, price, and creator info.

**Why:** The locked preview page needs to show the user what they're buying. Without this data, the locked page would just say "forbidden" — no title, no price, no purchase button. The user wouldn't know what to buy.

**The security question:** Is it safe to expose content metadata on a 403? Yes. The title, description, and price are *meant* to be visible to drive sales. The actual content (the course videos, the PDF, the tutorial) is still protected — the `file_url` is only returned on 200 responses.

### Decision: Creator Self-Views Excluded from Analytics

**What it means:** When a creator views their own content and triggers `POST /api/content/:id/view`, the view count doesn't increment.

**Why:** Analytics exist to help creators understand how many unique learners are discovering their content. A creator repeatedly viewing their own course to check it would inflate the count, making analytics meaningless.

**The implementation:** The view endpoint extracts the userId from the optional JWT, checks if `content.creator_user_id === userId`, and skips the increment if true. Non-authenticated views (public browsing) still count.

### Decision: Partial Unique Index Instead of Full Unique

**What it means:** `UNIQUE (user_id, content_id) WHERE status='active'` instead of `UNIQUE (user_id, content_id)`.

**Why a partial index?** A full unique constraint would prevent creating a second subscription after cancelling the first. If user 1 subscribed to content 3, cancelled, then tried to re-subscribe, the second INSERT would violate the unique constraint — even though the first subscription is cancelled. The partial index (`WHERE status='active'`) only enforces uniqueness among active subscriptions. Multiple cancelled/pending rows for the same (user, content) pair are allowed.

---

## PART 11 — BUGS & LESSONS LEARNED

### Bug 1: `creator_id` vs `user_id` — The Wrong ID Space

**What happened:** The `uploadContent` controller called `Content.create(req.user.id, ...)`. But `req.user.id` is `users.id`. And `content.creator_id` is a foreign key referencing `creators.id` — a different table, a different sequence.

For the first user ever (user.id=1) who becomes the first creator (creator.id=1), both IDs happen to be 1. The insert works. But when user 5 (users.id=5) becomes the 3rd creator (creators.id=3), `Content.create(5, ...)` tries to insert `creator_id=5`. The FK constraint `content.creator_id → creators.id` rejects it — there's no creator with id=5.

**The error:** `FK violation: Key (creator_id)=(5) is not present in table "creators"` — only visible with users 2+ becoming creators.

**The fix:** After `Creator.findByUserId(userId)`, use `creator.id` (the creators table PK) as the creator_id:
```js
const creator = await Creator.findByUserId(userId);
const content = await Content.create(creator.id, title, ...);
//                                   ↑ creator.id, not userId
```

**The lesson:** When you have multiple tables with their own auto-incrementing IDs, never assume two IDs from different tables are interchangeable even if they look the same. Always be explicit about which ID space you're operating in.

---

### Bug 2: Creator Bypass Comparing Wrong ID Spaces

**What happened:** The access control middleware checked:
```js
if (content.creator_id === userId) { /* bypass */ }
```

`content.creator_id` is `creators.id`. `userId` is `users.id`. These are different numbers from different sequences. The comparison is meaningless — it only accidentally works when both sequences happen to produce matching values (first user = first creator).

**The consequence:** A creator visiting their own paid content was treated as an unauthorized subscriber. They'd see the locked preview for content they created. The creator bypass never worked for any creator whose `users.id !== creators.id`.

**The fix:** Add `cr.user_id AS creator_user_id` to the `Content.findById` JOIN. Now `content.creator_user_id` is in the `users.id` space — directly comparable to the JWT's `userId`:
```js
if (content.creator_user_id === userId) { /* correct bypass */ }
```

**The lesson:** When your data model has two tables with their own ID sequences (users and creators), be extremely explicit about which ID you're working with. Comment the ID type: `// creator.id (creators table PK)`, `// userId (users table PK)`. Better yet, name your variables to include the table: `creatorProfileId` vs `userId`.

---

### Bug 3: `Content.findById` Returned No Creator Info

**What happened:** The original `Content.findById` was:
```sql
SELECT * FROM content WHERE id = $1
```

The `getContent` controller returned `req.content` (the result of this query). The frontend `ContentDetailPage` tried to display `content.creator_display_name` and `content.creator_bio`. Both were `undefined` — the join hadn't been done.

**The locked preview was worse:** The 403 response's `content` object had no creator info. The locked preview sidebar showed nothing for the creator section.

**The fix:** Add JOIN to `creators` in `findById`:
```sql
SELECT c.*, cr.display_name AS creator_display_name, cr.bio AS creator_bio, cr.user_id AS creator_user_id
FROM content c JOIN creators cr ON c.creator_id = cr.id
WHERE c.id = $1
```

**The lesson:** When designing an API endpoint, consider what the frontend will display and ensure the query returns all needed data in one request. "N+1 queries" (fetching content then separately fetching creator) should be avoided with JOINs.

---

### Bug 4: `Subscription.findByUserId` Used Wrong Column Alias

**What happened:** The subscription model's query selected `c.title` from the content JOIN. When JavaScript received this, the subscription object had a property called `title`. But the frontend `MySubscriptionsPage` expected `sub.content_title`. Every subscription card showed `undefined` as the content name.

**The fix:** Alias the column:
```sql
SELECT c.title AS content_title, ...
```

**The lesson:** Frontend and backend must agree on property names. The API contract (what field names the response contains) is as important as what data it contains. Document it (we did — in README.md's API Reference table) and verify it.

---

### Bug 5: `db.js` Only Supported Individual DB Parameters

**What happened:** The database config only accepted `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. Every cloud database service (Railway, Neon, Supabase, Render) provides a `DATABASE_URL` connection string like `postgresql://user:pass@host:5432/dbname`. Without `DATABASE_URL` support, deploying to any cloud database required manually parsing the connection string — error-prone and fragile.

**The fix:** Check for `DATABASE_URL` first:
```js
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { host, port, database, user, password }
);
```

**The lesson:** Always check how your target deployment environment provides credentials. Local development and cloud deployment often use different conventions. Write your config to support both from the start.

---

## PART 12 — SECURITY DOCUMENTATION

### JWT Security

**Token signing:** HS256 (HMAC-SHA256). The `JWT_SECRET` is the symmetric key — the same key signs and verifies. If the secret is compromised, anyone can forge tokens. The secret must be:
- At least 32 bytes (256 bits) of random data
- Never committed to git
- Different between dev and production environments

**Token expiry:** 1 hour (`expiresIn: '1h'`). After expiry, `jwt.verify()` throws an error, the middleware returns 401, and the user must log in again. Short expiry limits the damage window if a token is stolen.

**What the token does NOT contain:** The password, email, or any sensitive data. The token contains only `{id, role}` — the minimum needed for authorization.

**What the token cannot do:** Grant a subscriber access to paid content. Even with a valid token, the server checks the `subscriptions` table. A stolen token for a subscriber account cannot bypass subscription checks.

### Webhook Signature Verification

The Razorpay webhook uses HMAC-SHA256 to prove authenticity:
```
Razorpay computes: signature = HMAC(rawBody, webhookSecret)
We compute:        expected  = HMAC(req.rawBody, WEBHOOK_SECRET)
If signature === expected → authentic Razorpay request
If not → reject with 401
```

**Why HMAC and not just checking the IP?** Razorpay's IP addresses can change. IP whitelisting requires maintenance and can be spoofed. HMAC uses a shared secret that only Razorpay and us know. Even if an attacker knows the body format, they cannot compute a valid signature without the secret.

**The `rawBody` requirement:** The HMAC is computed over the exact bytes sent. If we re-stringify the parsed JSON, the result might differ (key order, whitespace). We must compute HMAC over `req.rawBody` — the raw request body captured before any JSON parsing.

### SQL Injection Prevention

All database queries use parameterized statements:
```js
pool.query('SELECT * FROM users WHERE email = $1', [email]);
// NOT: pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```

In the parameterized form, `email` is sent as a separate value alongside the SQL. PostgreSQL treats it as data, never as SQL syntax. An `email` value of `'; DROP TABLE users; --'` would simply fail to find any user — the SQL structure is not affected.

### Why Frontend Cannot Be Trusted

The React frontend runs in the user's browser. The user has full control:
- They can open DevTools and modify React state
- They can intercept and modify API responses
- They can run arbitrary JavaScript
- They can modify localStorage

If the frontend decided access control (e.g., "show content if `user.subscriptions.includes(contentId)`"), a user could just add the content ID to that array in DevTools.

**Our defense:** Every state-changing request and every content access request is validated server-side. The frontend is a UI shell. The server makes every security decision.

### Password Security

Passwords are hashed with bcrypt (10 rounds) before storage:
- The database contains only the hash, never the plaintext
- bcrypt is designed to be slow (computational cost increases with rounds)
- Different users with the same password get different hashes (bcrypt includes a random salt)
- The `User.verifyPassword(plaintext, hash)` comparison is timing-safe (bcrypt compare is constant-time to prevent timing attacks)

### CORS Configuration

In production, `CORS_ORIGIN` is set to exactly the Vercel frontend URL. Any request from a different origin (e.g., an attacker's website trying to call the API using a user's credentials) is rejected by the browser at the CORS preflight stage.

**What CORS prevents:** Cross-Site Request Forgery (CSRF) from browsers. An attacker's website cannot make credentialed requests to our API using a visitor's token. **What CORS does not prevent:** Direct API calls from Postman, curl, or any non-browser client. CORS is a browser security mechanism. Server-to-server calls ignore it. Our JWT auth handles those cases.

---

## PART 13 — FUTURE IMPROVEMENTS

### Immediate Production Improvements

**Rate limiting:** Add `express-rate-limit` to prevent brute-force attacks on `/api/auth/login`:
```js
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/auth/login', loginLimiter);
```

**Security headers:** Add `helmet` middleware to set security-relevant HTTP headers (CSP, HSTS, X-Frame-Options):
```js
import helmet from 'helmet';
app.use(helmet());
```

**Refresh tokens:** The current 1-hour JWT means users get logged out hourly. Refresh tokens (long-lived, stored in httpOnly cookies) allow the frontend to get new access tokens without re-login.

**Structured logging:** Replace `console.log` with Winston or Pino. Structured JSON logs can be queried, filtered by severity, and forwarded to logging services like Datadog or Papertrail.

### Scalability Improvements

**Redis caching for browse results:** The browse endpoint runs a full table scan on every request. With Redis, results are cached for 60 seconds. 1000 users simultaneously hitting browse → 1 database query, not 1000.

**Pagination with cursor-based navigation:** Current browse uses `LIMIT/OFFSET`. At large scale, `OFFSET 10000` requires the database to scan 10,000 rows and discard them. Cursor-based pagination (`WHERE created_at < $lastSeenCreatedAt`) is more efficient.

**File uploads to object storage:** Currently `file_url` is just a URL. A creator links to their Google Drive. Production systems would provide upload to S3/Cloudinary with file size limits, MIME type validation, and CDN delivery.

### Product Improvements

**Creator earnings dashboard:** The `total_earnings` field exists but isn't auto-computed. A real dashboard would show a transaction history table (which subscriptions activated, when, for how much) pulled from the `subscriptions` table.

**Email notifications:** Confirmation emails (subscription activated, payment failed) using SendGrid or AWS SES. Currently there's no email system at all.

**Recurring subscriptions:** Monthly subscription model using Razorpay's recurring payment APIs. Requires a `Plans` and `Billing Periods` concept — significant schema changes.

**Content preview:** Free sample lessons that are accessible without subscription (like a "Chapter 1 free" model). Currently content is entirely free or entirely paid.

### DevOps Improvements

**Docker Compose for local development:**
```yaml
version: '3'
services:
  db:
    image: postgres:16
    environment: { POSTGRES_DB: creator_dashboard, POSTGRES_PASSWORD: dev }
  server:
    build: ./server
    depends_on: [db]
  client:
    build: ./client
    depends_on: [server]
```

**CI/CD pipeline:** GitHub Actions to run tests on every pull request, and auto-deploy to Render on merge to main.

**Database migrations:** Instead of running `schema.sql` manually, use a migration tool (Flyway, node-postgres-migrate) that tracks which migrations have run and applies only new ones. Critical once you have production data you can't drop and recreate.

---

## PART 14 — COMPLETE APPLICATION LIFECYCLE

This is the story of the application from a completely empty database to a cancelled subscription. Every step is real code.

---

**The database is empty. Zero rows in all tables.**

---

**A developer runs `psql -d creator_dashboard -f schema.sql`.** Tables are created. Indexes are created. The `v_content_with_creator` view exists but shows nothing.

---

**Alice opens the app for the first time.** She visits `/browse`. React Router renders `BrowseContentPage`. `useEffect` fires `api.browseContent(1)`. The server calls `Content.findAllPublished(20, 0)`. The content table is empty. The response is `{ content: [], content_count: 0 }`. Alice sees "No content yet."

---

**Alice clicks "Get started" and registers.** She fills email, username, password. `api.register(...)` fires. `authController.register` validates inputs, hashes the password, inserts into `users`. `users` table now has 1 row: `{ id:1, email:'alice@test.com', role:'subscriber' }`. The app redirects to `/login`.

---

**Alice logs in.** `authController.login` verifies password, generates JWT `{ id:1, role:'subscriber' }`. Alice's localStorage now has the token. `AuthContext` initializes with `user = { id:1, role:'subscriber' }`. The Navbar shows "Subscriber" badge. Alice is redirected to `/dashboard`.

---

**Alice's Dashboard shows the "Become a Creator" card.** `DashboardPage` calls `useAuth()`, sees `isCreator=false`, renders `SubscriberDashboard`. Alice clicks "Start creating." A modal appears. She types "Alice Teaches JS" as her display name.

---

**Alice clicks Confirm.** `AuthContext.becomeCreator("Alice Teaches JS")` fires. `api.becomeCreator(...)` calls `POST /api/creators/become-creator`. The server: creates `creators` row `{ id:1, user_id:1, display_name:'Alice Teaches JS' }`, updates `users.role` to `'creator'`, generates a new JWT `{ id:1, role:'creator' }`. The response includes `token: 'eyJ...'`.

The `AuthContext.becomeCreator` handler receives the new token, calls `saveAuth(newToken, { ...user, role:'creator' })`. localStorage is updated. `isCreator` becomes `true`. React re-renders the Dashboard. The creator dashboard tabs appear.

---

**Alice uploads a free course.** She fills the Upload tab: "JavaScript Basics," no URL, price=0. `api.uploadContent(...)` fires. The controller: fetches creator (id=1) by userId, calls `Content.create(1, "JavaScript Basics", null, null, 0)`. The model: validates, sets `is_free=true` because `price=0`, inserts into `content`. Row: `{ id:1, creator_id:1, title:'JavaScript Basics', price:0, is_free:true, status:'published' }`.

---

**Alice uploads a paid course.** Price = ₹499. `Content.create(1, "Advanced JS", ..., 499)`. `is_free=false`. Row: `{ id:2, creator_id:1, title:'Advanced JS', price:499, is_free:false }`.

---

**Bob registers and logs in.** `users` now has 2 rows. Bob's JWT: `{ id:2, role:'subscriber' }`.

---

**Bob browses to `/browse`.** `Content.findAllPublished` returns both of Alice's courses. Bob sees them as cards. Free course has "Free" badge. Advanced JS has "₹499" badge.

---

**Bob clicks the free course.** `GET /api/content/1`. `checkContentAccess`: `content.is_free=true` → pass immediately. `getContent` returns the full content. Bob sees `AccessibleContentUI` with "Free" badge. He clicks "Record view." `POST /api/content/1/view`: Bob's userId ≠ content.creator_user_id (1) → `UPDATE views_count = views_count + 1`. Views count becomes 1.

---

**Bob clicks the Advanced JS course.** `GET /api/content/2` with Bob's token. `checkContentAccess`: not free → get userId=2 → content.creator_user_id=1 ≠ 2 → `Subscription.findActive(2, 2)` → null → 403 with full content metadata. Frontend: `err.status === 403` → `setViewState('locked')`. Bob sees locked preview: title, description, "₹499," "Get access" button.

---

**Bob clicks "Get access."** `api.subscribe(2, token)` → `POST /api/subscriptions { contentId:2 }`. Server creates `{ id:1, user_id:2, content_id:2, status:'pending' }`. Frontend navigates to `/checkout/1`.

---

**Bob completes payment.** (Full flow in Part 6.) The webhook fires. Subscription 1 is updated: `{ status:'active', paid_amount:499, paid_at:now }`. Bob's polling receives 200. He's redirected to `/content/2`.

---

**Bob visits `/content/2` with active subscription.** `checkContentAccess`: not free → userId=2 → not creator → `Subscription.findActive(2,2)` → row found (status='active') → pass. `getContent` returns full content. Bob sees "Subscribed ✓" badge and the content. His payment was worth it.

---

**Alice visits her own Advanced JS course.** `GET /api/content/2` with Alice's token (userId=1). `checkContentAccess`: not free → userId=1 → `content.creator_user_id === 1` ✓ → creator bypass → pass immediately. Alice sees "Your content" badge. No subscription needed. Self-view NOT counted.

---

**Bob visits `/subscriptions`.** `api.getSubscriptions(token)` → server returns subscriptions with content_title aliased from JOIN. Bob sees one row: "Advanced JS — Active — ₹499" with "View →" and "Cancel" buttons.

---

**Bob cancels.** `api.cancelSubscription(1, token)` → server: `UPDATE subscriptions SET status='cancelled', cancelled_at=NOW() WHERE id=1`. Subscription is now `{ status:'cancelled' }`.

---

**Bob tries to visit `/content/2` again.** `checkContentAccess`: not free → not creator → `Subscription.findActive(2,2)` → null (the active row is now cancelled) → 403 locked. Bob sees the locked preview again. The system is consistent.

---

**From clean database to cancelled subscription — 14 real state transitions, zero business logic in the frontend, zero ambiguity in the database.**

That is the architecture. That is the system. That is the codebase.
