-- =============================================================
-- DEV-ONLY Database Cleanup Scripts for DRMS
-- =============================================================
-- WARNING: These scripts modify data. Only use in development.
-- Replace <HR_USER_ID> with the actual user ID before running.
-- =============================================================

-- ---------------------------------------------------------
-- SCRIPT A: Fix misrouted notification links
-- Employee-target notifications that were rewritten to
-- /hr/assignments/ for HR-role users.
-- ---------------------------------------------------------

-- Preview affected rows first:
SELECT n.id, n.user_id, u.email, n.link, n.title, dr.assigned_to_id
FROM notifications n
JOIN users u ON u.id = n.user_id
JOIN document_requests dr ON dr.id = SUBSTRING_INDEX(n.link, '/', -1)
WHERE n.link LIKE '/hr/assignments/%'
  AND n.link NOT LIKE '%?%'
  AND n.title = 'New Document Request'
  AND (dr.assigned_to_id IS NULL OR dr.assigned_to_id != n.user_id);

-- Apply fix:
START TRANSACTION;
UPDATE notifications n
JOIN document_requests dr ON dr.id = SUBSTRING_INDEX(n.link, '/', -1)
SET n.link = CONCAT('/employee/requests/', SUBSTRING_INDEX(n.link, '/', -1))
WHERE n.link LIKE '/hr/assignments/%'
  AND n.link NOT LIKE '%?%'
  AND n.title = 'New Document Request'
  AND (dr.assigned_to_id IS NULL OR dr.assigned_to_id != n.user_id);
-- Review ROW_COUNT() then:
COMMIT;

-- ---------------------------------------------------------
-- SCRIPT B: Reassign all PENDING_HR requests to a specific
-- HR user (for testing only).
-- Replace <HR_USER_ID> with the target HR user's ID.
-- ---------------------------------------------------------

-- Preview:
SELECT id, title, assigned_to_id, created_by_id, status
FROM document_requests
WHERE status = 'PENDING_HR';

-- Apply:
-- START TRANSACTION;
-- UPDATE document_requests
-- SET assigned_to_id = '<HR_USER_ID>'
-- WHERE status = 'PENDING_HR'
--   AND created_by_id != '<HR_USER_ID>';
-- COMMIT;

-- ---------------------------------------------------------
-- SCRIPT C: Delete test requests from the last 24 hours
-- with a specific title prefix.
-- Replace 'TEST%' with the actual prefix.
-- ---------------------------------------------------------

-- Preview:
SELECT id, title, created_at
FROM document_requests
WHERE title LIKE 'TEST%'
  AND created_at >= NOW() - INTERVAL 24 HOUR;

-- Apply (cascades must be configured or delete children first):
-- START TRANSACTION;
-- DELETE ra FROM request_assignments ra
-- JOIN document_requests dr ON dr.id = ra.request_id
-- WHERE dr.title LIKE 'TEST%'
--   AND dr.created_at >= NOW() - INTERVAL 24 HOUR;
--
-- DELETE FROM document_requests
-- WHERE title LIKE 'TEST%'
--   AND created_at >= NOW() - INTERVAL 24 HOUR;
-- COMMIT;
