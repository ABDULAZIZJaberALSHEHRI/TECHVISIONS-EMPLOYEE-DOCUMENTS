# DRMS - Local Testing Guide

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop (for MySQL)
- Azure AD app registration configured

### Start the Environment
```bash
# Start MySQL
docker start drms-mysql

# Start dev server
npm run dev
# App runs at http://localhost:3001
```

## Change Your Role

Switch your account role to test different portals:

```bash
# Make yourself ADMIN (access all portals)
npm run role:admin

# Make yourself HR
npm run role:hr

# Make yourself EMPLOYEE
npm run role:employee

# Interactive role management menu
npm run role:manage
```

After changing your role, **sign out and sign back in** for the change to take effect.

## Generate Test Data

```bash
# Seed categories, requests, and assignments
npm run db:seed-test

# View database status
npm run db:info

# List all users
npm run db:users

# Find specific user
npm run db:find-user abdulaziz
```

## Open Database GUI

```bash
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
```

## Testing Each Portal

### Employee Portal (`/employee/*`)
Set role to EMPLOYEE, then test:
- **Dashboard** - View stats (total, pending, approved, overdue)
- **My Requests** - See assigned document requests
- **Upload Document** - Click a request, upload a file
- **Notifications** - Check the bell icon for alerts

### HR Portal (`/hr/*`)
Set role to HR, then test:
- **Dashboard** - View request overview and charts
- **Create Request** - New request with title, deadline, priority, category
- **Assign Employees** - Select employees during request creation
- **Review Submissions** - Approve or reject uploaded documents
- **Send Reminders** - Remind employees about pending submissions
- **Export to Excel** - Download request data as .xlsx

### Admin Portal (`/admin/*`)
Set role to ADMIN (can also access HR portal), then test:
- **User Management** - View all users, change roles
- **Categories** - Create/edit document categories
- **System Settings** - Configure reminder days, app settings
- **Audit Logs** - View all system activity with filters

## Test Scenarios

### Complete Workflow
1. Set role to **HR** and sign in
2. Go to `/hr/requests/new` and create a request
3. Assign at least one employee and set a deadline
4. Set role to **EMPLOYEE** and sign in
5. Go to `/employee/requests` - see the new request
6. Click the request and upload a document
7. Set role to **HR** and sign in
8. Go to the request and approve/reject the submission

### File Upload Testing
- Upload valid files (PDF, DOCX, images)
- Try uploading a file larger than 25MB (should be rejected)
- Try uploading an invalid file type if format restrictions are set
- Download uploaded files and verify content

### Overdue Testing
- Create a request with a deadline in the past
- Run: `npm run check-overdue`
- Check that assignments are marked OVERDUE

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run role:admin` | Promote to ADMIN |
| `npm run role:hr` | Promote to HR |
| `npm run role:employee` | Demote to EMPLOYEE |
| `npm run role:manage` | Interactive role menu |
| `npm run db:info` | Database status overview |
| `npm run db:users` | List all users |
| `npm run db:find-user <email>` | Find user details |
| `npm run db:seed-test` | Generate test data |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:push` | Push schema changes to DB |

## Stop Everything

```bash
# Stop the dev server
Ctrl+C

# Stop MySQL container
docker stop drms-mysql
```
