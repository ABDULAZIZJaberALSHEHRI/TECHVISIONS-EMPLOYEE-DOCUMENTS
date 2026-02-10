# DRMS - Feature Documentation

## Enhanced Role System

### Roles
| Role | Capabilities |
|------|-------------|
| **ADMIN** | Full system access. Create requests for anyone, view all tracking data, manage users/settings |
| **HR** | Create requests for anyone, review submissions, view tracking matrix, send reminders |
| **DEPARTMENT_HEAD** | Create requests for their department, view department tracking matrix, send reminders to department |
| **EMPLOYEE** | View assigned requests, upload documents, download templates |

### Setting Up Department Head
```bash
# Via npm script
npm run role:dept-head [email] [department]

# Example
npm run role:dept-head john@company.com IT

# Interactive
npm run role:manage
# Choose option 4, enter email and department
```

### Setting User Departments
```bash
npm run role:manage
# Choose option 6 to set department for any user
```

## Dynamic Request Creation

### Target Types
When creating a request, choose how to assign employees:

1. **All Employees** - Assigns to every active non-admin user
2. **By Department** - Select one or more departments (ADMIN/HR can select any, DEPARTMENT_HEAD is locked to their department)
3. **Specific Employees** - Pick individual employees from a searchable list

### Template Files
- Upload a template/reference file (PDF, DOCX, XLSX, PNG, JPG) up to 10MB
- Employees see a "Template Available" badge on their requests
- "Download Template" button available on request detail pages
- Templates stored in `uploads/templates/{requestId}/`

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/requests` | Create request with targetType, targetDepartments, templateFile |
| GET | `/api/requests/[id]/template` | Download template file |
| POST | `/api/requests/[id]/template` | Upload/replace template |
| DELETE | `/api/requests/[id]/template` | Remove template |

## Tracking Matrix

### Overview
The Tracking Matrix shows a grid of employees vs. document requests with real-time status indicators.

### Status Indicators
- ✅ **Green checkmark** - Approved
- 🔵 **Blue checkmark** - Submitted (awaiting review)
- ⏳ **Yellow clock** - Pending
- ❌ **Red triangle** - Overdue
- 🟠 **Orange X** - Rejected (needs resubmission)
- 📎 **Paperclip** - Has attached documents

### Features
- **Filter by department** - Dropdown to focus on one department
- **Filter by status** - Show only pending, submitted, etc.
- **Search employees** - Quick search by name or email
- **Bulk select** - Checkbox to select multiple employees
- **Send Reminders** - Send email reminders to selected employees
- **Export to Excel** - Download as `.xlsx` with color-coded status cells

### Accessing the Matrix
- **ADMIN/HR**: Navigate to HR portal > Tracking Matrix (`/hr/tracking`)
- **DEPARTMENT_HEAD**: Navigate to Department Head portal > Tracking Matrix (`/dept-head/tracking`)

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tracking/matrix` | Get tracking data with filters |
| POST | `/api/tracking/send-reminders` | Send bulk reminders |
| GET | `/api/tracking/export` | Download Excel export |

### Department Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/departments` | List all departments |
| POST | `/api/departments` | Register a department (ADMIN) |
| GET | `/api/departments/members` | Get employees by department |

## Excel Export

The tracking matrix can be exported as an Excel file with:
- **Sheet 1: Tracking Matrix** - Employees (rows) x Requests (columns) with color-coded cells
- **Sheet 2: Summary** - Total employees, assignments, completion rate, overdue count

Color coding in export:
- Green background - Approved
- Blue background - Submitted
- Red background + bold text - Overdue
- Yellow background - Rejected

## Permission Matrix

| Action | ADMIN | HR | DEPT_HEAD | EMPLOYEE |
|--------|-------|-----|-----------|----------|
| Create request (all employees) | ✅ | ✅ | ❌ | ❌ |
| Create request (by department) | ✅ | ✅ | Own dept only | ❌ |
| Create request (specific employees) | ✅ | ✅ | Own dept only | ❌ |
| Upload template | ✅ | ✅ | Own requests | ❌ |
| View tracking matrix (all) | ✅ | ✅ | ❌ | ❌ |
| View tracking matrix (dept) | ✅ | ✅ | Own dept | ❌ |
| Send reminders | ✅ | ✅ | Own dept | ❌ |
| Export tracking data | ✅ | ✅ | Own dept | ❌ |
| Review submissions | ✅ | ✅ | Own requests | ❌ |
| Download template | ✅ | ✅ | ✅ | ✅ |
| Upload documents | ❌ | ❌ | ❌ | ✅ |

## Portals

| Role | Base URL | Pages |
|------|----------|-------|
| ADMIN | `/admin/*` | Users, Categories, Settings, Audit Logs + HR portal access |
| HR | `/hr/*` | Dashboard, Requests, Employees, Tracking Matrix |
| DEPARTMENT_HEAD | `/dept-head/*` | Dashboard, Requests, Tracking Matrix |
| EMPLOYEE | `/employee/*` | Dashboard, My Documents |

## Database Changes

### New Fields
- `users.managed_department` - Department a DEPARTMENT_HEAD manages
- `document_requests.template_url` - Path to template file
- `document_requests.template_name` - Original template filename
- `document_requests.target_type` - ALL_EMPLOYEES, DEPARTMENT, or SPECIFIC
- `document_requests.target_departments` - JSON array of target departments
- `request_assignments.submitted_at` - When employee submitted

### New Enums
- `Role.DEPARTMENT_HEAD` - New role type
- `TargetType` - ALL_EMPLOYEES, DEPARTMENT, SPECIFIC
