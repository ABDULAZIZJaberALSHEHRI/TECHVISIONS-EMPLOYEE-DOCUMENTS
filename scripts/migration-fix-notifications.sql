-- =============================================================
-- Migration Script: Fix notification links after refactor
-- =============================================================
-- This script fixes notification links that were incorrectly
-- rewritten by the old getRequestBasePathForRole() function.
--
-- The old code rewrote /employee/requests/{id} to /hr/assignments/{id}
-- for any HR-role recipient, regardless of whether they were the
-- HR processor or just an employee target.
-- =============================================================

-- STEP 1: Preview all misrouted employee-target notifications
-- These are notifications with /hr/assignments/ links sent to users
-- who are NOT the assignedToId on that request.
SELECT
  n.id AS notification_id,
  n.user_id,
  u.email,
  u.role,
  n.title,
  n.link,
  dr.assigned_to_id,
  CASE
    WHEN dr.assigned_to_id IS NULL THEN 'NO_HR_ASSIGNED'
    WHEN dr.assigned_to_id != n.user_id THEN 'WRONG_HR_USER'
    ELSE 'OK'
  END AS diagnosis
FROM notifications n
JOIN users u ON u.id = n.user_id
LEFT JOIN document_requests dr ON dr.id = SUBSTRING_INDEX(n.link, '/', -1)
WHERE n.link LIKE '/hr/assignments/%'
  AND n.link NOT LIKE '%?%'
  AND n.title IN ('New Document Request', 'Deadline Approaching',
                   'Document Request Overdue', 'Reminder from HR')
  AND (dr.assigned_to_id IS NULL OR dr.assigned_to_id != n.user_id);

-- STEP 2: Fix the links (change /hr/assignments/ back to /employee/requests/)
START TRANSACTION;

UPDATE notifications n
LEFT JOIN document_requests dr ON dr.id = SUBSTRING_INDEX(n.link, '/', -1)
SET n.link = CONCAT('/employee/requests/', SUBSTRING_INDEX(n.link, '/', -1))
WHERE n.link LIKE '/hr/assignments/%'
  AND n.link NOT LIKE '%?%'
  AND n.title IN ('New Document Request', 'Deadline Approaching',
                   'Document Request Overdue', 'Reminder from HR')
  AND (dr.assigned_to_id IS NULL OR dr.assigned_to_id != n.user_id);

-- Verify: should return 0
SELECT COUNT(*) AS remaining_misrouted
FROM notifications n
LEFT JOIN document_requests dr ON dr.id = SUBSTRING_INDEX(n.link, '/', -1)
WHERE n.link LIKE '/hr/assignments/%'
  AND n.link NOT LIKE '%?%'
  AND n.title IN ('New Document Request', 'Deadline Approaching',
                   'Document Request Overdue', 'Reminder from HR')
  AND (dr.assigned_to_id IS NULL OR dr.assigned_to_id != n.user_id);

COMMIT;

-- STEP 3: Integrity check - every PENDING_HR request should have assignedToId
SELECT id, title, status, assigned_to_id, created_by_id
FROM document_requests
WHERE status = 'PENDING_HR' AND assigned_to_id IS NULL;
-- If rows returned: these requests are stuck. Fix by assigning them or changing status to OPEN.

-- STEP 4: Integrity check - every assignment should reference valid request and employee
SELECT ra.id, ra.request_id, ra.employee_id
FROM request_assignments ra
LEFT JOIN document_requests dr ON dr.id = ra.request_id
LEFT JOIN users u ON u.id = ra.employee_id
WHERE dr.id IS NULL OR u.id IS NULL;
-- If rows returned: orphaned assignments. Delete them.
