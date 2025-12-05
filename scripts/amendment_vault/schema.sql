-- ============================================================================
-- Amendment Vault - Database Schema
-- ============================================================================
-- 
-- This schema defines the canonical structure for Member Request amendments
-- parsed from HB1600 and SB800 PDFs.
--
-- Purpose: Support aggregation queries for legislator amendment focus by
-- spending category (for Spotlight Map pie charts).
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS amendment_vault_member_requests (
  -- ===== Identity =====
  id TEXT PRIMARY KEY,
  stage TEXT NOT NULL DEFAULT 'member_request',
  bill_number TEXT NOT NULL CHECK (bill_number IN ('HB1600', 'SB800')),
  session_year INTEGER NOT NULL,
  chamber TEXT NOT NULL CHECK (chamber IN ('House', 'Senate')),

  -- ===== Legislator Attribution =====
  patron_name TEXT NOT NULL,
  patron_lis_id TEXT,
  legislator_id TEXT,
  district_code TEXT,

  -- ===== Budget Item Details =====
  item_number TEXT NOT NULL,
  sub_item TEXT,
  agency_code TEXT,
  agency_name TEXT,

  -- ===== Spending Category Mapping =====
  secretariat_code TEXT,
  spending_category_id TEXT NOT NULL,

  -- ===== Dollar Amounts =====
  fiscal_year INTEGER,
  delta_gf REAL NOT NULL DEFAULT 0,
  delta_ngf REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL DEFAULT 0,

  -- ===== Metadata Flags =====
  is_increase INTEGER NOT NULL DEFAULT 0 CHECK (is_increase IN (0, 1)),
  is_language_only INTEGER NOT NULL DEFAULT 0 CHECK (is_language_only IN (0, 1)),

  -- ===== Descriptions =====
  description_short TEXT,
  description_full TEXT,

  -- ===== Source Tracking =====
  source_pdf_path TEXT NOT NULL,
  source_page INTEGER,
  source_line_hint TEXT,

  -- ===== Timestamps =====
  created_at TEXT,
  updated_at TEXT
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index for legislator lookups (primary use case for pie chart)
CREATE INDEX IF NOT EXISTS idx_legislator_id 
  ON amendment_vault_member_requests(legislator_id);

CREATE INDEX IF NOT EXISTS idx_patron_name 
  ON amendment_vault_member_requests(patron_name);

-- Index for spending category aggregation
CREATE INDEX IF NOT EXISTS idx_spending_category 
  ON amendment_vault_member_requests(spending_category_id);

-- Index for session/stage filtering
CREATE INDEX IF NOT EXISTS idx_session_stage 
  ON amendment_vault_member_requests(session_year, stage);

-- Index for bill number filtering
CREATE INDEX IF NOT EXISTS idx_bill_number 
  ON amendment_vault_member_requests(bill_number);

-- Composite index for common query pattern (legislator + session + category)
CREATE INDEX IF NOT EXISTS idx_legislator_session_category 
  ON amendment_vault_member_requests(legislator_id, session_year, spending_category_id);

-- ============================================================================
-- Sample Aggregation Queries
-- ============================================================================

-- Query 1: Legislator Amendment Focus (by legislator_id)
-- Returns spending category totals for a specific legislator
-- This is the core query for the pie chart
/*
SELECT
  spending_category_id AS categoryId,
  SUM(net_amount) AS totalAmount
FROM
  amendment_vault_member_requests
WHERE
  stage = 'member_request'
  AND session_year = :session_year
  AND legislator_id = :legislator_id
  AND is_language_only = 0
  AND net_amount != 0
GROUP BY
  spending_category_id
ORDER BY
  ABS(totalAmount) DESC;
*/

-- Query 2: Legislator Amendment Focus (by patron_name fallback)
-- Same as Query 1 but uses patron_name when legislator_id is not available
/*
SELECT
  spending_category_id AS categoryId,
  SUM(net_amount) AS totalAmount
FROM
  amendment_vault_member_requests
WHERE
  stage = 'member_request'
  AND session_year = :session_year
  AND (
    legislator_id = :legislator_id
    OR (legislator_id IS NULL AND LOWER(patron_name) = LOWER(:patron_name))
  )
  AND is_language_only = 0
  AND net_amount != 0
GROUP BY
  spending_category_id
ORDER BY
  ABS(totalAmount) DESC;
*/

-- Query 3: Legislator Amendment Focus (with bill filter)
-- Allows filtering by HB1600 only, SB800 only, or both
/*
SELECT
  spending_category_id AS categoryId,
  SUM(net_amount) AS totalAmount
FROM
  amendment_vault_member_requests
WHERE
  stage = 'member_request'
  AND session_year = :session_year
  AND legislator_id = :legislator_id
  AND (:bill_number IS NULL OR bill_number = :bill_number)
  AND is_language_only = 0
  AND net_amount != 0
GROUP BY
  spending_category_id
ORDER BY
  ABS(totalAmount) DESC;
*/

-- Query 4: All Legislators Summary
-- Get total amendment activity per legislator (for rankings/comparisons)
/*
SELECT
  legislator_id,
  patron_name,
  COUNT(*) AS amendment_count,
  SUM(net_amount) AS total_impact,
  SUM(CASE WHEN is_increase = 1 THEN net_amount ELSE 0 END) AS total_increases,
  SUM(CASE WHEN is_increase = 0 THEN net_amount ELSE 0 END) AS total_decreases
FROM
  amendment_vault_member_requests
WHERE
  stage = 'member_request'
  AND session_year = :session_year
  AND is_language_only = 0
GROUP BY
  legislator_id, patron_name
ORDER BY
  ABS(total_impact) DESC;
*/

