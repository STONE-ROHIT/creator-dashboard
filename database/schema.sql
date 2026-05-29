-- ============================================================
-- Creator Dashboard — Complete Database Schema
-- Run this on a fresh PostgreSQL database
-- ============================================================

-- Drop tables in reverse dependency order (for clean re-runs)
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS content CASCADE;
DROP TABLE IF EXISTS creators CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'subscriber'
                  CHECK (role IN ('subscriber', 'creator')),
  created_at    TIMESTAMP    DEFAULT NOW(),
  updated_at    TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- ============================================================
-- CREATORS
-- Creator profile — one per user, created via /become-creator
-- ============================================================
CREATE TABLE creators (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name   VARCHAR(255),
  bio            TEXT,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  bank_account   VARCHAR(255),          -- For future payout system
  created_at     TIMESTAMP    DEFAULT NOW(),
  updated_at     TIMESTAMP    DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_creators_user_id ON creators(user_id);

-- ============================================================
-- CONTENT
-- Uploaded by creators; price=0 means is_free=true
-- status: 'published' | 'archived' (soft delete)
-- ============================================================
CREATE TABLE content (
  id           SERIAL PRIMARY KEY,
  creator_id   INTEGER        NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title        VARCHAR(255)   NOT NULL,
  description  TEXT,
  file_url     VARCHAR(500),
  price        NUMERIC(10,2)  NOT NULL DEFAULT 0,
  is_free      BOOLEAN        DEFAULT false,
  views_count  INTEGER        DEFAULT 0,
  status       VARCHAR(50)    DEFAULT 'published'
                 CHECK (status IN ('published', 'archived')),
  created_at   TIMESTAMP      DEFAULT NOW(),
  updated_at   TIMESTAMP      DEFAULT NOW()
);

CREATE INDEX idx_content_creator_id ON content(creator_id);
CREATE INDEX idx_content_status     ON content(status);

-- ============================================================
-- SUBSCRIPTIONS
-- Lifecycle: pending → active → cancelled (immutable final state)
-- One active subscription per (user, content) enforced by partial index
-- Multiple pending subscriptions allowed (user can retry payment)
-- ============================================================
CREATE TABLE subscriptions (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id        INTEGER        NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  subscription_type VARCHAR(50)    DEFAULT 'lifetime',
  status            VARCHAR(50)    DEFAULT 'pending'
                      CHECK (status IN ('pending', 'active', 'cancelled')),
  created_at        TIMESTAMP      DEFAULT NOW(),
  cancelled_at      TIMESTAMP,
  paid_amount       NUMERIC(10,2),  -- Set when status becomes 'active'
  payment_id        VARCHAR(255),   -- Razorpay order ID
  paid_at           TIMESTAMP       -- Set when status becomes 'active'
);

-- Performance indexes
CREATE INDEX idx_subscriptions_user_id    ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_content_id ON subscriptions(content_id);
CREATE INDEX idx_subscriptions_status     ON subscriptions(status);
CREATE INDEX idx_subscriptions_payment_id ON subscriptions(payment_id);

-- CRITICAL: One active subscription per (user, content) — partial unique index
-- Allows multiple pending but only one active
CREATE UNIQUE INDEX idx_user_content_active
  ON subscriptions(user_id, content_id)
  WHERE status = 'active';

-- ============================================================
-- HELPFUL VIEWS (optional, for debugging)
-- ============================================================

CREATE OR REPLACE VIEW v_content_with_creator AS
  SELECT
    c.id,
    c.creator_id,
    c.title,
    c.description,
    c.file_url,
    c.price::float AS price,
    c.is_free,
    c.views_count,
    c.status,
    c.created_at,
    cr.display_name  AS creator_display_name,
    cr.bio           AS creator_bio,
    cr.user_id       AS creator_user_id
  FROM content c
  JOIN creators cr ON c.creator_id = cr.id;

CREATE OR REPLACE VIEW v_subscriptions_full AS
  SELECT
    s.id,
    s.user_id,
    s.content_id,
    s.subscription_type,
    s.status,
    s.created_at,
    s.cancelled_at,
    s.paid_amount,
    s.payment_id,
    s.paid_at,
    c.title          AS content_title,
    c.price          AS content_price,
    c.is_free,
    cr.display_name  AS creator_display_name,
    u.username       AS subscriber_username
  FROM subscriptions s
  JOIN content c    ON s.content_id = c.id
  JOIN creators cr  ON c.creator_id = cr.id
  JOIN users u      ON s.user_id = u.id;
