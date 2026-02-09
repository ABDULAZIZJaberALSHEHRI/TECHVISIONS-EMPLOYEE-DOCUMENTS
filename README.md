# DRMS - Document Request Management System

A production-ready full-stack web application for internal document request management. HR creates document requests and employees upload the requested documents. Authentication is handled via Microsoft Azure AD SSO.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| UI | shadcn/ui + Tailwind CSS |
| Icons | lucide-react |
| Database | MySQL 8.0 |
| ORM | Prisma |
| Auth | NextAuth.js v4 + Azure AD |
| Email | Nodemailer (SMTP) |
| Charts | Recharts |
| File Upload | Local disk storage |
| Deployment | Standalone Next.js + PM2 + Nginx |

## Prerequisites

- Node.js 20+
- MySQL 8.0
- Azure AD tenant (for SSO)
- SMTP server (for email notifications)

## Local Development Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd drms
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `NEXTAUTH_URL` | Your app URL (http://localhost:3000 for dev) |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `AZURE_AD_CLIENT_ID` | From Azure Portal app registration |
| `AZURE_AD_CLIENT_SECRET` | From Azure Portal app registration |
| `AZURE_AD_TENANT_ID` | Your Azure AD tenant ID |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for TLS) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From email address |
| `UPLOAD_DIR` | Upload directory path (default: ./uploads) |
| `APP_NAME` | Application name |
| `APP_URL` | Public app URL |

### 3. Set up database

```bash
# Create the database
mysql -u root -p -e "CREATE DATABASE drms; CREATE USER 'drms_user'@'localhost' IDENTIFIED BY 'your_password'; GRANT ALL PRIVILEGES ON drms.* TO 'drms_user'@'localhost'; FLUSH PRIVILEGES;"

# Push schema to database
npx prisma db push

# Seed default data
npx prisma db seed
```

### 4. Run development server

```bash
npm run dev
```

Open http://localhost:3000

### 5. View database (optional)

```bash
npx prisma studio
```

## Building for Production

```bash
npm run build
npm run start
```

## OCI VM Deployment Guide

### 1. Prepare the server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL 8
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install SSL (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 2. Set up MySQL

```bash
sudo mysql
CREATE DATABASE drms;
CREATE USER 'drms_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON drms.* TO 'drms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Deploy the app

```bash
# Clone the repo
cd /opt
sudo git clone <repo-url> drms
cd drms

# Install dependencies
npm ci --only=production

# Set up environment
cp .env.example .env.local
nano .env.local  # Edit with production values

# Build
npx prisma generate
npx prisma db push
npx prisma db seed
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Configure Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/drms
sudo ln -s /etc/nginx/sites-available/drms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Set up cron job

```bash
crontab -e
# Add this line:
0 8 * * * cd /opt/drms && /usr/bin/node -r ts-node/register scripts/check-overdue.ts >> /opt/drms/logs/cron.log 2>&1
```

## Docker Deployment

```bash
# Copy env file
cp .env.example .env

# Edit .env with your values
nano .env

# Start services
docker-compose up -d

# Run migrations inside container
docker-compose exec app npx prisma db push
docker-compose exec app npx prisma db seed
```

## Azure AD Configuration

1. Go to Azure Portal > Azure Active Directory > App registrations
2. Click "New registration"
3. Name: "DRMS"
4. Redirect URI: `https://your-domain.com/api/auth/callback/azure-ad`
5. Under "Certificates & secrets", create a new client secret
6. Under "API permissions", add: `openid`, `profile`, `email`, `User.Read`
7. Copy Client ID, Client Secret, and Tenant ID to your `.env.local`

## User Roles

| Role | Capabilities |
|---|---|
| **ADMIN** | Everything HR can do + user management, categories, settings, audit logs |
| **HR** | Create requests, review submissions, send reminders, export data |
| **EMPLOYEE** | View own requests, upload documents, track submission status |

## Project Structure

```
drms/
├── prisma/          # Database schema and seed
├── scripts/         # Cron job scripts
├── src/
│   ├── app/         # Next.js pages and API routes
│   ├── components/  # React components
│   ├── hooks/       # Custom hooks
│   ├── lib/         # Utilities and configurations
│   └── types/       # TypeScript definitions
├── uploads/         # Document storage (gitignored)
└── deployment files (Dockerfile, nginx.conf, etc.)
```

## Troubleshooting

| Issue | Solution |
|---|---|
| Database connection fails | Check DATABASE_URL format and MySQL service status |
| Azure AD login fails | Verify redirect URI matches exactly, check client ID/secret |
| Emails not sending | Verify SMTP credentials, check firewall for port 587 |
| File upload fails | Check UPLOAD_DIR permissions, verify disk space |
| 502 Bad Gateway | Check PM2 status (`pm2 status`), verify Next.js is running on port 3000 |
| Prisma errors | Run `npx prisma generate` after schema changes |
