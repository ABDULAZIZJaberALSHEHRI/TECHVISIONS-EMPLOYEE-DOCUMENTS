# DRMS - Pre-Deployment Test Plan

## 1. Local Build Verification

- [ ] `npm ci` completes without errors
- [ ] `npx prisma generate` succeeds
- [ ] `npm run build` produces standalone output in `.next/standalone/`
- [ ] `.next/static/` directory is generated
- [ ] `node .next/standalone/server.js` starts on port 3000
- [ ] `npm run lint` passes with no errors

## 2. Database Migration Testing

- [ ] `npx prisma db push` applies schema to a fresh MySQL 8.0 database
- [ ] All 9 tables are created: users, categories, document_requests, request_attachments, request_assignments, documents, notifications, audit_logs, system_settings
- [ ] All indexes and unique constraints are present
- [ ] All enum types are correctly applied

## 3. Health Endpoint

- [ ] `GET /api/health` returns 200 when DB is connected and upload dir exists
- [ ] Response includes: status, timestamp, version, uptime, checks
- [ ] Returns 503 with `"degraded"` status when DB is unreachable
- [ ] Returns 503 when upload directory is missing

## 4. Authentication Testing

- [ ] Login page loads at `/login`
- [ ] "Sign in with Microsoft" redirects to Azure AD
- [ ] Successful Azure AD login redirects back to the app
- [ ] User is created in DB on first login
- [ ] Session persists across page navigation
- [ ] JWT expires after 8 hours
- [ ] Unauthenticated access to `/dashboard` redirects to `/login`
- [ ] Role-based access: ADMIN can access `/admin/*`
- [ ] Role-based access: HR can access `/hr/*`
- [ ] Role-based access: EMPLOYEE can access `/employee/*`
- [ ] Cross-role access is blocked (employee cannot access `/admin/*`)

## 5. File Upload/Download Testing

- [ ] HR can attach files when creating a document request
- [ ] Employee can upload documents for their assignments
- [ ] Files are saved to the configured `UPLOAD_DIR`
- [ ] File size validation works (rejects files > MAX_FILE_SIZE_MB)
- [ ] File type validation works (respects acceptedFormats)
- [ ] Download API serves the correct file with proper Content-Type
- [ ] Download requires authentication
- [ ] Files persist across application restarts (block volume)

## 6. Email Notification Testing

- [ ] Email is sent when a new request is created (to assigned employees)
- [ ] Email is sent when a reminder is triggered
- [ ] Email is sent when a submission is approved/rejected
- [ ] SMTP connection errors are logged but don't crash the app
- [ ] Email content renders correctly (HTML template)

## 7. Core Feature Testing

### Document Requests (HR)
- [ ] Create a new document request with all fields
- [ ] Assign multiple employees to a request
- [ ] Set deadline and priority
- [ ] Cancel a request
- [ ] Close a request after all submissions are approved
- [ ] Export requests to Excel
- [ ] Send reminders to employees

### Employee Submissions
- [ ] View assigned requests on employee dashboard
- [ ] Upload document for an assignment
- [ ] Add notes with a submission
- [ ] Resubmit after rejection (version increment)

### Admin Panel
- [ ] View and manage users
- [ ] Create and manage categories
- [ ] View audit logs with filtering
- [ ] Update system settings

### Notifications
- [ ] Notifications appear in the bell icon
- [ ] Notification count updates in real-time
- [ ] Mark notifications as read
- [ ] Click notification navigates to related page

## 8. Performance Testing

- [ ] Page load time < 3 seconds on first visit
- [ ] API response time < 500ms for list endpoints
- [ ] File upload handles 25MB files without timeout
- [ ] Application remains stable with 50 concurrent users
- [ ] Memory usage stays under 1GB per PM2 instance
- [ ] No memory leaks after 24 hours of operation

## 9. Security Testing

- [ ] All pages served over HTTPS
- [ ] HTTP redirects to HTTPS
- [ ] Security headers present in responses (check with `curl -I`)
- [ ] SQL injection: test with `'OR 1=1--` in search fields
- [ ] XSS: test with `<script>alert(1)</script>` in text inputs
- [ ] CSRF: verify NextAuth CSRF token is required
- [ ] File upload: attempt to upload `.exe`, `.php`, `.sh` files
- [ ] Path traversal: attempt `../../etc/passwd` in file download
- [ ] Rate limiting: verify API returns 429 after threshold
- [ ] Session: verify expired JWT is rejected

## 10. Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (latest)

## 11. Deployment Infrastructure

- [ ] PM2 cluster mode starts correct number of instances
- [ ] PM2 auto-restarts crashed processes
- [ ] Log rotation works (force rotation and verify)
- [ ] Backup script completes successfully
- [ ] Backup files are valid (test restore on a separate DB)
- [ ] Monitoring script detects simulated failures
- [ ] Cron jobs execute on schedule
- [ ] Application auto-starts after VM reboot
