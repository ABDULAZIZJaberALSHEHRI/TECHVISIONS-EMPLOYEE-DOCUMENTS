# DRMS - Quick Reference

## Change Your Role
```bash
npm run role:admin       # ADMIN - full access
npm run role:hr          # HR - manage requests
npm run role:dept-head   # DEPARTMENT_HEAD - manage department
npm run role:employee    # EMPLOYEE - submit documents
npm run role:manage      # Interactive menu (includes dept management)
```
Sign out and back in after changing.

## Database
```bash
npm run db:info          # Status overview
npm run db:users         # List all users
npm run db:seed-test     # Generate test data
npm run db:studio        # Open Prisma Studio GUI
npm run db:push          # Push schema changes
```

## Development
```bash
npm run dev              # Start dev server (http://localhost:3001)
npm run build            # Production build
npm run lint             # Run linter
```

## Docker MySQL
```bash
docker start drms-mysql  # Start MySQL
docker stop drms-mysql   # Stop MySQL
```

## Portals
| Role            | URL                                      |
|-----------------|------------------------------------------|
| Employee        | http://localhost:3001/employee/dashboard  |
| HR              | http://localhost:3001/hr/dashboard        |
| Department Head | http://localhost:3001/dept-head/dashboard |
| Admin           | http://localhost:3001/admin/users         |
| Tracking Matrix | http://localhost:3001/hr/tracking         |
