-- ============================================================
-- Creator Dashboard — Seed Data
-- Populates DB with test users, content, and subscriptions
-- Run AFTER schema.sql
--
-- Test accounts (all passwords: "password123"):
--   subscriber@test.com  → subscriber role
--   creator@test.com     → creator role (display_name: "Alex Dev")
-- ============================================================

-- Clear existing data (for re-runs)
TRUNCATE subscriptions, content, creators, users RESTART IDENTITY CASCADE;

-- ============================================================
-- USERS
-- Password hash = bcrypt("password123", 10 rounds)
-- ============================================================
INSERT INTO users (email, username, password_hash, role) VALUES
(
  'subscriber@test.com',
  'subscriber_user',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
  'subscriber'
),
(
  'creator@test.com',
  'alex_dev',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'creator'
),
(
  'newuser@test.com',
  'new_user',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'subscriber'
);

-- ============================================================
-- CREATORS
-- user_id=2 (creator@test.com) becomes a creator
-- ============================================================
INSERT INTO creators (user_id, display_name, bio, total_earnings) VALUES
(
  2,
  'Alex Dev',
  'Full-stack developer with 5+ years experience. I teach React, Node.js, and system design.',
  1299.00
);

-- ============================================================
-- CONTENT
-- creator_id=1 (only one creator)
-- Mix of free and paid content
-- ============================================================
INSERT INTO content (creator_id, title, description, file_url, price, is_free, views_count, status) VALUES
(
  1,
  'JavaScript Fundamentals — Free Intro',
  'A complete introduction to JavaScript for absolute beginners. Covers variables, functions, loops, and DOM manipulation. This is a free preview of the full course.',
  'https://www.youtube.com/watch?v=W6NZfCO5SIk',
  0,
  true,
  342,
  'published'
),
(
  1,
  'React 18 Masterclass — From Zero to Production',
  'Learn React 18 from scratch. Covers hooks, context, React Router, performance optimization, and deploying to production. Includes 50+ exercises and a full capstone project.',
  'https://drive.google.com/drive/folders/example',
  499,
  false,
  128,
  'published'
),
(
  1,
  'Node.js & PostgreSQL — Build a REST API',
  'Build a complete production-grade REST API with Node.js, Express, and PostgreSQL. Covers authentication, authorization, database design, testing, and deployment.',
  'https://drive.google.com/drive/folders/example2',
  399,
  false,
  89,
  'published'
),
(
  1,
  'System Design for Junior Developers',
  'Understand how large-scale systems work. Covers load balancing, caching, databases, message queues, and common interview patterns. Perfect for engineering interviews.',
  'https://drive.google.com/drive/folders/example3',
  299,
  false,
  203,
  'published'
);

-- ============================================================
-- SUBSCRIPTIONS
-- Covers all status scenarios for testing
-- ============================================================

-- Active subscription: subscriber_user (id=1) → React course (id=2)
INSERT INTO subscriptions (user_id, content_id, subscription_type, status, paid_amount, payment_id, paid_at)
VALUES (1, 2, 'lifetime', 'active', 499.00, 'order_test_active_001', NOW() - INTERVAL '3 days');

-- Pending subscription: subscriber_user (id=1) → Node.js course (id=3)
INSERT INTO subscriptions (user_id, content_id, subscription_type, status, payment_id)
VALUES (1, 3, 'lifetime', 'pending', 'order_test_pending_001');

-- Cancelled subscription: subscriber_user → System Design (id=4)
INSERT INTO subscriptions (user_id, content_id, subscription_type, status, cancelled_at)
VALUES (1, 4, 'lifetime', 'cancelled', NOW() - INTERVAL '1 day');

-- ============================================================
-- VERIFY (run after seed to check data)
-- ============================================================
-- SELECT u.username, u.role, cr.display_name FROM users u LEFT JOIN creators cr ON cr.user_id = u.id;
-- SELECT c.title, c.price, c.is_free, cr.display_name FROM content c JOIN creators cr ON c.creator_id = cr.id;
-- SELECT s.status, c.title, u.username FROM subscriptions s JOIN content c ON s.content_id = c.id JOIN users u ON s.user_id = u.id;
