# Creator Dashboard — Comprehensive Testing Guide

This document covers every testable flow: happy paths, edge cases, and security checks.
Run these in order — later tests depend on data created earlier.

---

## Prerequisites

```bash
# 1. Database running with schema loaded
psql -U postgres -d creator_dashboard -f database/schema.sql

# 2. Server running
cd server && npm run dev

# 3. Set BASE_URL for curl commands
BASE=http://localhost:5000/api

# 4. Optionally load seed data for pre-built scenarios
# psql -U postgres -d creator_dashboard -f database/seed.sql
```

---

## Section 1 — Authentication

### 1.1 Register (Subscriber)
```bash
curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","username":"alice","password":"password123","passwordConfirm":"password123"}' \
  | jq .
```
**Expected:** `201` — `{"message":"User registered successfully","user":{...}}`

### 1.2 Register validation errors
```bash
# Missing fields
curl -s -X POST $BASE/auth/register \
  -d '{"email":"alice@test.com"}' -H "Content-Type: application/json" | jq .message,.error
# Expected: "All fields are required"

# Duplicate email
curl -s -X POST $BASE/auth/register \
  -d '{"email":"alice@test.com","username":"alice2","password":"password123","passwordConfirm":"password123"}' \
  -H "Content-Type: application/json" | jq .error
# Expected: "Email already registered"

# Password mismatch
curl -s -X POST $BASE/auth/register \
  -d '{"email":"x@test.com","username":"x","password":"password123","passwordConfirm":"wrong"}' \
  -H "Content-Type: application/json" | jq .error
# Expected: "Passwords do not match"
```

### 1.3 Login — save token
```bash
ALICE_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}' \
  | jq -r .token)

echo "Alice token: $ALICE_TOKEN"
# Expected: long JWT string
```

### 1.4 Login with wrong credentials
```bash
curl -s -X POST $BASE/auth/login \
  -d '{"email":"alice@test.com","password":"wrongpassword"}' \
  -H "Content-Type: application/json" | jq .error
# Expected: "Invalid credentials"
```

### 1.5 Access protected route without token
```bash
curl -s $BASE/content/my -H "Authorization: Bearer invalid_token" | jq .error
# Expected: "Invalid or expired token"
```

---

## Section 2 — Creator Flow

### 2.1 Register a second user (will become creator)
```bash
curl -s -X POST $BASE/auth/register \
  -d '{"email":"bob@test.com","username":"bob_creator","password":"password123","passwordConfirm":"password123"}' \
  -H "Content-Type: application/json" | jq .

BOB_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -d '{"email":"bob@test.com","password":"password123"}' \
  -H "Content-Type: application/json" | jq -r .token)

echo "Bob token (subscriber): $BOB_TOKEN"
```

### 2.2 Try creator endpoint before becoming creator
```bash
curl -s $BASE/content/my -H "Authorization: Bearer $BOB_TOKEN" | jq .error
# Expected: "Only creators can access this" (403)
```

### 2.3 Become a creator
```bash
BECOME_RESP=$(curl -s -X POST $BASE/creators/become-creator \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Bob Teaches Code"}')

echo $BECOME_RESP | jq .

# CRITICAL: Extract the NEW token — Bob's role is now 'creator'
BOB_NEW_TOKEN=$(echo $BECOME_RESP | jq -r .token)
echo "Bob new token (creator): $BOB_NEW_TOKEN"
```
**Expected:** `201` with a `token` field. The new token has `role: "creator"` in its payload.

**Verify the new token has correct role:**
```bash
# Decode middle segment of JWT (base64)
echo $BOB_NEW_TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .role
# Expected: "creator"
```

### 2.4 Trying to become creator again
```bash
curl -s -X POST $BASE/creators/become-creator \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Another Name"}' | jq .error
# Expected: "You are already a creator"
```

### 2.5 Get creator profile
```bash
curl -s $BASE/creators/me \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" | jq .
# Expected: {id, user_id, display_name: "Bob Teaches Code", bio, total_earnings: 0, ...}
```

### 2.6 Update creator profile
```bash
curl -s -X PUT $BASE/creators/1 \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Bob Teaches Code","bio":"Full-stack instructor with 5 years experience","bankAccount":"HDFC0001234567"}' \
  | jq .
# Expected: updated creator object
```

---

## Section 3 — Content Management (Creator)

### 3.1 Upload free content
```bash
FREE_CONTENT=$(curl -s -X POST $BASE/content \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to JavaScript",
    "description": "A beginner-friendly introduction to JS programming",
    "fileUrl": "https://www.youtube.com/watch?v=test",
    "price": 0
  }')

echo $FREE_CONTENT | jq .
FREE_ID=$(echo $FREE_CONTENT | jq -r .content.id)
echo "Free content ID: $FREE_ID"
# Expected: is_free: true, price: 0
```

### 3.2 Upload paid content
```bash
PAID_CONTENT=$(curl -s -X POST $BASE/content \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Advanced React Patterns",
    "description": "Deep dive into React 18 patterns and performance",
    "price": 499
  }')

echo $PAID_CONTENT | jq .
PAID_ID=$(echo $PAID_CONTENT | jq -r .content.id)
echo "Paid content ID: $PAID_ID"
# Expected: is_free: false, price: 499
```

### 3.3 Content validation errors
```bash
# Title too short
curl -s -X POST $BASE/content \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"ab","price":0}' | jq .error
# Expected: "Title must be at least 3 characters"

# Negative price
curl -s -X POST $BASE/content \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Valid Title","price":-10}' | jq .error
# Expected: "Price must be 0 or a positive number"

# Invalid URL
curl -s -X POST $BASE/content \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Valid Title","fileUrl":"not-a-url","price":0}' | jq .error
# Expected: "Invalid URL format"
```

### 3.4 Get my content list
```bash
curl -s $BASE/content/my \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" | jq '.content | length, .[].title'
# Expected: 2 (free + paid), with their titles
```

### 3.5 Browse all content (public — no auth)
```bash
curl -s "$BASE/content/browse" | jq '.content_count, .content[].title'
# Expected: count and list of titles
```

### 3.6 Update content
```bash
curl -s -X PUT $BASE/content/$PAID_ID \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Advanced React Patterns — Updated","price":599}' | jq .content.title,.content.price
# Expected: updated title and price
```

### 3.7 Delete content (try with different user)
```bash
# Alice (subscriber) cannot delete Bob's content
curl -s -X DELETE $BASE/content/$PAID_ID \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .error
# Expected: 403 error
```

---

## Section 4 — Content Access Control

### 4.1 Free content — anyone can view
```bash
# Unauthenticated
curl -s $BASE/content/$FREE_ID | jq .title,.is_free
# Expected: title and is_free: true

# As subscriber
curl -s $BASE/content/$FREE_ID \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .title
# Expected: title returned
```

### 4.2 Paid content — unauthenticated user gets 401
```bash
curl -s $BASE/content/$PAID_ID | jq .error
# Expected: "Login required to view paid content" (401)
```

### 4.3 Paid content — subscriber without subscription gets 403 with preview data
```bash
LOCKED_RESP=$(curl -s $BASE/content/$PAID_ID \
  -H "Authorization: Bearer $ALICE_TOKEN")

echo $LOCKED_RESP | jq .error,.locked,.content.title,.content.price
# Expected:
#   error: "Subscribe to access this content"
#   locked: true
#   content.title: "Advanced React Patterns — Updated"
#   content.price: 599
```

### 4.4 Creator can view their own paid content (bypass)
```bash
curl -s $BASE/content/$PAID_ID \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" | jq .title
# Expected: content returned (no 403) — creator bypass works
```

### 4.5 Record a view
```bash
# Subscriber viewing free content
curl -s -X POST $BASE/content/$FREE_ID/view | jq .message
# Expected: "View recorded"

# Creator viewing own content — self-view not counted
curl -s -X POST $BASE/content/$PAID_ID/view \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" | jq .message
# Expected: "View not counted (self-view)"
```

---

## Section 5 — Subscription Flow

### 5.1 Subscribe to paid content (creates pending subscription)
```bash
SUB_RESP=$(curl -s -X POST $BASE/subscriptions \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"contentId\": $PAID_ID}")

echo $SUB_RESP | jq .
SUB_ID=$(echo $SUB_RESP | jq -r .subscription.id)
echo "Subscription ID: $SUB_ID (status: pending)"
# Expected: subscription with status: "pending"
```

### 5.2 Subscriber still can't access content while pending
```bash
curl -s $BASE/content/$PAID_ID \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .locked
# Expected: true (403) — pending subscription does NOT grant access
```

### 5.3 Cannot subscribe to free content
```bash
curl -s -X POST $BASE/subscriptions \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"contentId\": $FREE_ID}" | jq .error
# Expected: "This content is free. No subscription needed."
```

### 5.4 Creator cannot subscribe to own content
```bash
curl -s -X POST $BASE/subscriptions \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"contentId\": $PAID_ID}" | jq .error
# Expected: "You cannot subscribe to your own content"
```

### 5.5 View subscriptions list
```bash
curl -s $BASE/subscriptions \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq '.summary, .subscriptions[].status'
# Expected: {total:1, active:0, pending:1, cancelled:0}, "pending"
```

---

## Section 6 — Payment Flow

### 6.1 Create Razorpay order
```bash
ORDER_RESP=$(curl -s -X POST $BASE/payments/create-order \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"subscriptionId\": $SUB_ID}")

echo $ORDER_RESP | jq .
ORDER_ID=$(echo $ORDER_RESP | jq -r .order.orderId)
echo "Razorpay Order ID: $ORDER_ID"
# Expected: {order: {orderId: "order_...", amount: 599, keyId: "rzp_test_..."}}
```

### 6.2 Cannot create order for wrong subscription ID
```bash
curl -s -X POST $BASE/payments/create-order \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"subscriptionId\": $SUB_ID}" | jq .error
# Expected: "Unauthorized - subscription does not belong to you"
```

### 6.3 Verify payment (should be pending)
```bash
curl -s -X POST $BASE/payments/verify \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"subscriptionId\": $SUB_ID}" | jq .message
# Expected: HTTP 202 — "Payment processing - please wait"
```

### 6.4 Activate for testing (DEV ONLY — simulates webhook)
```bash
curl -s -X POST $BASE/subscriptions/$SUB_ID/activate-testing \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .message,.subscription.status
# Expected: "Subscription activated (dev testing)" + status: "active"
```

### 6.5 Verify payment again (now active)
```bash
curl -s -X POST $BASE/payments/verify \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"subscriptionId\": $SUB_ID}" | jq .message
# Expected: HTTP 200 — "Payment confirmed"
```

### 6.6 Now Alice can access the paid content
```bash
curl -s $BASE/content/$PAID_ID \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .title
# Expected: "Advanced React Patterns — Updated" (200, not 403)
```

---

## Section 7 — Full Payment Flow with Razorpay UI

For testing the real payment UI in the browser:

1. **Open** http://localhost:3000 → Register a new account
2. **Browse** → find paid content → click it → see locked preview
3. **Click** "Get access" → system creates pending subscription → redirect to /checkout
4. **Click** "Pay with Razorpay" → Razorpay modal opens

**Use these Razorpay test cards:**

| Card Type | Number | CVV | Expiry | Expected |
|-----------|--------|-----|--------|----------|
| Success | `4111 1111 1111 1111` | Any 3 digits | Any future date | Payment succeeds |
| Success | `5267 3181 8797 5449` | Any 3 digits | Any future date | Mastercard success |
| Failure | `4000 0000 0000 0002` | Any | Any future date | Card declined |
| 3D Secure | `4000 0025 0000 3155` | Any | Any future date | Requires OTP |

**For UPI testing:** Enter `success@razorpay` as UPI ID

5. After payment → frontend polls `/payments/verify` every 2 seconds
6. Webhook fires → subscription activates → verify returns 200 → redirect to content page
7. Content now accessible ✓

---

## Section 8 — Cancellation Flow

### 8.1 Cancel active subscription
```bash
curl -s -X DELETE $BASE/subscriptions/$SUB_ID \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .message,.subscription.status
# Expected: "Subscription cancelled" + status: "cancelled"
```

### 8.2 Content locked again after cancellation
```bash
curl -s $BASE/content/$PAID_ID \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .locked
# Expected: true (403) — cancelled subscription doesn't grant access
```

### 8.3 Can create new subscription after cancellation
```bash
NEW_SUB=$(curl -s -X POST $BASE/subscriptions \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"contentId\": $PAID_ID}")
echo $NEW_SUB | jq .subscription.status
# Expected: "pending" — can resubscribe after cancellation
```

### 8.4 Cannot cancel someone else's subscription
```bash
NEW_SUB_ID=$(echo $NEW_SUB | jq -r .subscription.id)
curl -s -X DELETE $BASE/subscriptions/$NEW_SUB_ID \
  -H "Authorization: Bearer $BOB_NEW_TOKEN" | jq .error
# Expected: "Unauthorized"
```

---

## Section 9 — Security Edge Cases

### 9.1 SQL injection attempt
```bash
curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x.com OR 1=1--","password":"anything"}' | jq .error
# Expected: "Invalid credentials" (parameterized queries protect us)
```

### 9.2 Cannot create order for cancelled subscription
```bash
# Cancel the subscription from 8.3
curl -s -X DELETE $BASE/subscriptions/$NEW_SUB_ID \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .

curl -s -X POST $BASE/payments/create-order \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"subscriptionId\": $NEW_SUB_ID}" | jq .error
# Expected: "Subscription is cancelled. Only pending subscriptions can proceed to payment."
```

### 9.3 Webhook requires valid signature
```bash
curl -s -X POST $BASE/payments/webhook \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: fakesignature" \
  -d '{"event":"payment.authorized","payload":{}}' | jq .error
# Expected: "Invalid webhook signature" (401)
```

### 9.4 activate-testing endpoint blocked in production
```bash
# This test requires temporarily changing NODE_ENV
# In production: NODE_ENV=production npm start
curl -s -X POST $BASE/subscriptions/1/activate-testing \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .error
# Expected (in production): "This endpoint is only available in development"
```

### 9.5 Creator cannot modify another creator's content
```bash
# Create a second creator account
CAROL_TOKEN=$(curl -s -X POST $BASE/auth/register \
  -d '{"email":"carol@test.com","username":"carol","password":"password123","passwordConfirm":"password123"}' \
  -H "Content-Type: application/json" | jq -r .token)

CAROL_CREATOR=$(curl -s -X POST $BASE/creators/become-creator \
  -H "Authorization: Bearer $CAROL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Carol Creator"}')

CAROL_NEW_TOKEN=$(echo $CAROL_CREATOR | jq -r .token)

# Try to delete Bob's content
curl -s -X DELETE $BASE/content/$PAID_ID \
  -H "Authorization: Bearer $CAROL_NEW_TOKEN" | jq .error
# Expected: "You do not own this content" (403)
```

---

## Section 10 — UI Walkthrough Checklist

Run through these in the browser at http://localhost:3000:

**Auth**
- [ ] Register with all fields → success toast, redirect to login
- [ ] Login with wrong password → inline error message
- [ ] Login → JWT stored in localStorage → inspect Application > Local Storage
- [ ] Navigate to /dashboard without login → redirect to /login
- [ ] After login, /login redirects to /dashboard

**Browse**
- [ ] /browse loads without login — all published content visible
- [ ] Free content card shows "Free" badge; paid shows price
- [ ] Click a free content card → full detail page, no paywall
- [ ] Click a paid card without login → see locked preview + "Sign in" CTA

**Creator Flow**
- [ ] Login as subscriber → Dashboard shows "Become a creator" card
- [ ] Click → modal appears → enter display name → click Confirm
- [ ] Navbar badge changes from "Subscriber" to "Creator" immediately
- [ ] Dashboard now shows tabs: My Content / Upload / Profile
- [ ] Upload tab → fill form (price=0) → submit → card appears in My Content
- [ ] Upload paid content → appears in table with "Paid" badge
- [ ] View my paid content as creator → full access, no paywall
- [ ] Edit profile → display name and bio update correctly

**Subscription & Payment**
- [ ] As subscriber, click paid content → locked preview with price displayed
- [ ] Click "Get access" → /checkout page shows correct price
- [ ] DEV: click "Skip payment (testing)" → activates → redirect to content
- [ ] Content now shows "Subscribed ✓" badge
- [ ] My Library → 1 active subscription, "View →" button works
- [ ] Cancel subscription → item moves to "Cancelled" tab
- [ ] Content is locked again after cancellation
- [ ] REAL PAYMENT: click "Pay with Razorpay" → Razorpay modal opens → use test card → spinner polls → success

**Edge Cases in UI**
- [ ] Try to browse to /checkout/999 (nonexistent) → error message
- [ ] Navigate to /dashboard as creator → My Content tab is default
- [ ] Empty My Content list → empty state with upload prompt

---

## Section 11 — Database State Verification

After running all tests, verify the database directly:

```sql
-- Check all users and their roles
SELECT id, email, username, role FROM users ORDER BY id;

-- Check creator profiles
SELECT c.id, u.username, c.display_name, c.total_earnings
FROM creators c JOIN users u ON c.user_id = u.id;

-- Check content with creator info
SELECT c.id, c.title, c.price, c.is_free, c.views_count, c.status, cr.display_name
FROM content c JOIN creators cr ON c.creator_id = cr.id
ORDER BY c.id;

-- Check subscription lifecycle
SELECT s.id, u.username, c.title, s.status, s.paid_amount, s.created_at
FROM subscriptions s
JOIN users u ON s.user_id = u.id
JOIN content c ON s.content_id = c.id
ORDER BY s.created_at DESC;

-- Verify no duplicate active subscriptions
SELECT user_id, content_id, count(*)
FROM subscriptions WHERE status = 'active'
GROUP BY user_id, content_id
HAVING count(*) > 1;
-- Expected: 0 rows
```

---

## Common Issues & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| 403 on creator endpoints after becoming creator | Old token still in use | Frontend must store and use the `token` from `/become-creator` response |
| Webhook signature fails | Raw body not captured | Verify `req.rawBody` is set in `express.json({ verify: ... })` — must be BEFORE cors middleware |
| Cannot find content after upload | `creator_id` FK mismatch | Ensure `uploadContent` passes `creator.id` (not `user.id`) to `Content.create` |
| Creator can't see own paid content | Creator bypass comparing wrong IDs | `content.creator_user_id` (from JOIN) must equal `userId` (from JWT) |
| Subscription shows `content_title: undefined` | Missing alias in SQL | `Subscription.findByUserId` must alias `c.title AS content_title` |
| Payment polling never resolves | Webhook not configured or wrong secret | Check `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard; use ngrok for local testing |
| CORS error in production | `CORS_ORIGIN` not set | Set `CORS_ORIGIN` in backend env to the Vercel frontend URL |
| `DATABASE_URL` SSL error | Cloud DB requires SSL | Ensure `ssl: { rejectUnauthorized: false }` when `NODE_ENV=production` |
