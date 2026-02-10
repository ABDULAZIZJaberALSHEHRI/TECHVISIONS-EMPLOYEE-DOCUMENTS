# DRMS Production Deployment Guide - Oracle Cloud Infrastructure

> **Document Request Management System (DRMS)**
> Next.js 14 + Prisma + MySQL on OCI Compute Instance
> Designed for 100+ concurrent users

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [OCI Infrastructure Setup](#2-oci-infrastructure-setup)
3. [Server Prerequisites](#3-server-prerequisites)
4. [Database Setup](#4-database-setup)
5. [Application Deployment](#5-application-deployment)
6. [Environment Configuration](#6-environment-configuration)
7. [Build & Launch Sequence](#7-build--launch-sequence)
8. [Nginx Reverse Proxy & SSL](#8-nginx-reverse-proxy--ssl)
9. [OCI Networking (Security Lists)](#9-oci-networking-security-lists)
10. [Azure AD Configuration](#10-azure-ad-configuration)
11. [File Storage (Block Volume)](#11-file-storage-block-volume)
12. [Scaling for 100+ Users](#12-scaling-for-100-users)
13. [Monitoring & Health Checks](#13-monitoring--health-checks)
14. [Backup & Disaster Recovery](#14-backup--disaster-recovery)
15. [Maintenance & Operations](#15-maintenance--operations)
16. [Troubleshooting](#16-troubleshooting)
17. [Security Hardening Checklist](#17-security-hardening-checklist)
18. [Quick Command Reference](#18-quick-command-reference)

---

## 1. Architecture Overview

```
                    Internet
                       |
              [OCI Load Balancer] (optional)
                       |
              [OCI Compute Instance]
              Ubuntu 24.04 LTS
              VM.Standard.E4.Flex
              (2+ OCPU / 16+ GB RAM)
                       |
         +-------------+-------------+
         |             |             |
      [Nginx]      [PM2]       [MySQL 8]
      Port 80    Cluster Mode   Port 3306
      Port 443   Port 3000     (localhost)
         |             |             |
         +------+------+      [Block Volume]
                |              /mnt/drms-uploads
         [Next.js App]
         Standalone Mode
```

**Request Flow:**
```
User -> HTTPS (443) -> Nginx -> PM2 Cluster -> Next.js App -> Prisma -> MySQL
                                                           -> File System (Block Volume)
```

---

## 2. OCI Infrastructure Setup

### 2.1 Compute Instance (Recommended Specs for 100+ Users)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Shape | VM.Standard.E4.Flex | VM.Standard.E4.Flex |
| OCPUs | 2 | 4 |
| RAM | 16 GB | 32 GB |
| Boot Volume | 50 GB | 100 GB |
| Block Volume | 50 GB | 200 GB (for uploads) |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

### 2.2 Create the Instance

1. Go to **OCI Console > Compute > Instances > Create Instance**
2. Select **Ubuntu 24.04** as the image
3. Choose **VM.Standard.E4.Flex** shape (adjust OCPU/RAM)
4. Under Networking, select your **VCN** and **public subnet**
5. Upload or paste your **SSH public key**
6. Click **Create**

### 2.3 Attach Block Volume (for file uploads)

1. Go to **Block Storage > Block Volumes > Create Block Volume**
2. Set size (50-200 GB), select same **Availability Domain** as your instance
3. Attach to your instance: **Compute > Instance > Attached Block Volumes > Attach**
4. Choose **Paravirtualized** attachment type

---

## 3. Server Prerequisites

SSH into your OCI instance:

```bash
ssh -i ~/.ssh/your_key ubuntu@YOUR_OCI_PUBLIC_IP
```

### 3.1 System Update

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget gnupg2 software-properties-common \
    apt-transport-https ca-certificates lsb-release \
    git build-essential ufw fail2ban logrotate unzip jq
```

### 3.2 Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v    # Should show v20.x.x
npm -v     # Should show 10.x.x
```

### 3.3 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Verify
pm2 -v
```

### 3.4 Install MySQL 8.0

```bash
sudo apt install -y mysql-server mysql-client

# Start and enable on boot
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure the installation
sudo mysql_secure_installation
# Answer: Yes to all prompts, set a strong root password
```

### 3.5 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 3.6 Install Certbot (SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 3.7 Create Application User

```bash
sudo useradd --system --shell /bin/bash --home-dir /opt/drms --create-home drms
```

---

## 4. Database Setup

### 4.1 Create Database and User

```bash
sudo mysql
```

Run the following SQL commands inside the MySQL shell:

```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS drms
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Generate a strong password first: openssl rand -base64 24
-- Replace STRONG_PASSWORD_HERE with the generated password
CREATE USER IF NOT EXISTS 'drms_user'@'localhost'
    IDENTIFIED WITH mysql_native_password
    BY 'STRONG_PASSWORD_HERE';

-- Grant required privileges
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
    ON drms.*
    TO 'drms_user'@'localhost';

-- Allow Prisma to create temp tables during migrations
GRANT CREATE TEMPORARY TABLES ON drms.* TO 'drms_user'@'localhost';

FLUSH PRIVILEGES;

-- Verify
SELECT User, Host, plugin FROM mysql.user WHERE User = 'drms_user';
```

```bash
# Exit MySQL
exit
```

### 4.2 MySQL Performance Tuning (for 100+ users)

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf` and add under `[mysqld]`:

```ini
[mysqld]
# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Timezone (UTC)
default-time-zone = '+00:00'

# InnoDB - tune buffer_pool_size to ~25% of total RAM
# For 16 GB RAM -> 4G, for 32 GB RAM -> 8G
innodb_buffer_pool_size = 4G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
innodb_io_capacity = 2000
innodb_io_capacity_max = 4000

# Connections - set to handle 100+ concurrent users
max_connections = 200
wait_timeout = 600
interactive_timeout = 600
thread_cache_size = 16

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
log_queries_not_using_indexes = 1

# Security
bind-address = 127.0.0.1
skip-name-resolve
local-infile = 0

# Binary logging (for point-in-time recovery)
log_bin = /var/log/mysql/mysql-bin
expire_logs_days = 7
max_binlog_size = 100M
server-id = 1
```

Restart MySQL:

```bash
sudo systemctl restart mysql
```

### 4.3 Verify Database Connection

```bash
mysql -u drms_user -p -e "SHOW DATABASES;" | grep drms
```

---

## 5. Application Deployment

### 5.1 Clone the Repository

```bash
sudo -u drms bash
cd /opt/drms

# Clone your repo (replace with your actual repo URL)
git clone https://github.com/YOUR_ORG/TECHVISIONS-EMPLOYEE-DOCUMENTS.git .

# Or if transferring files manually (from your local machine):
# scp -r -i ~/.ssh/key ./TECHVISIONS-EMPLOYEE-DOCUMENTS/* ubuntu@OCI_IP:/opt/drms/
```

### 5.2 Set Directory Permissions

```bash
# As root
sudo chown -R drms:drms /opt/drms
sudo chmod 750 /opt/drms
```

### 5.3 Create Required Directories

```bash
sudo mkdir -p /var/log/drms
sudo chown drms:drms /var/log/drms
sudo chmod 750 /var/log/drms

sudo mkdir -p /mnt/drms-uploads
sudo chown drms:drms /mnt/drms-uploads
sudo chmod 750 /mnt/drms-uploads
```

---

## 6. Environment Configuration

### 6.1 Create the .env File

```bash
sudo -u drms nano /opt/drms/.env
```

### 6.2 Required Environment Variables

```env
# ==============================================================================
# DRMS Production Environment Variables
# ==============================================================================

# ------------------------------------------------------------------------------
# Database (MySQL)
# Replace STRONG_PASSWORD_HERE with the password you set in Step 4.1
# ------------------------------------------------------------------------------
DATABASE_URL="mysql://drms_user:STRONG_PASSWORD_HERE@localhost:3306/drms"

# ------------------------------------------------------------------------------
# NextAuth.js Authentication
# Generate secret: openssl rand -base64 32
# ------------------------------------------------------------------------------
NEXTAUTH_SECRET="GENERATE_A_RANDOM_SECRET_HERE"
NEXTAUTH_URL="https://your-domain.com"

# ------------------------------------------------------------------------------
# Azure AD (Microsoft Entra ID) - SSO Configuration
# Get these from Azure Portal > App Registrations > Your App
# ------------------------------------------------------------------------------
AZURE_AD_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
AZURE_AD_CLIENT_SECRET="your-client-secret-value"
AZURE_AD_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# ------------------------------------------------------------------------------
# Email (SMTP) - For notifications and reminders
# ------------------------------------------------------------------------------
SMTP_HOST="smtp.office365.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="noreply@yourcompany.com"
SMTP_PASS="your-smtp-password"
SMTP_FROM="DRMS <noreply@yourcompany.com>"

# ------------------------------------------------------------------------------
# Application Settings
# ------------------------------------------------------------------------------
NODE_ENV=production
PORT=3000
MAX_FILE_SIZE_MB=25
UPLOAD_DIR=/mnt/drms-uploads
```

### 6.3 Protect the .env File

```bash
sudo chmod 600 /opt/drms/.env
sudo chown drms:drms /opt/drms/.env
```

> **IMPORTANT:** Never commit `.env` to git. Verify `.gitignore` includes `.env`.

---

## 7. Build & Launch Sequence

Run all commands as the `drms` user:

```bash
sudo -u drms bash
cd /opt/drms
```

### Step 1: Install Dependencies

```bash
npm ci
```

> `npm ci` uses `package-lock.json` for deterministic installs. Do NOT use `--production` flag because devDependencies (TypeScript, PostCSS, Tailwind) are needed for the build step.

### Step 2: Generate Prisma Client

```bash
npx prisma generate
```

### Step 3: Push Database Schema (First Deploy)

```bash
# For first deployment - creates all tables
npx prisma db push

# For subsequent deployments with migration history:
# npx prisma migrate deploy
```

> **Note:** This project currently uses `db push` (no migration files). If you switch to migration-based workflow later, use `npx prisma migrate deploy` in production.

### Step 4: Build the Application

```bash
npm run build
```

This creates the Next.js standalone build in `.next/standalone/`.

### Step 5: Copy Static Assets (Required for Standalone Mode)

```bash
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

> Next.js standalone output does NOT include `public/` and `.next/static/` automatically. This step is **critical** or your CSS/images will be broken.

### Step 6: Setup PM2 & Start the Application

```bash
# Start with ecosystem config (cluster mode)
pm2 start ecosystem.config.js

# Verify it's running
pm2 status
pm2 logs drms --lines 20

# Save PM2 process list for auto-restart on reboot
pm2 save

# Setup PM2 startup script (run the command it outputs as root)
pm2 startup
# It will print a command like: sudo env PATH=... pm2 startup systemd -u drms --hp /opt/drms
# Copy and run that command as root
```

### Step 7: Verify the App

```bash
curl -s http://localhost:3000/api/health | jq
```

Expected output:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-09T...",
  "version": "0.1.0",
  "checks": {
    "database": { "status": "ok" },
    "storage": { "status": "ok" }
  }
}
```

### PM2 ecosystem.config.js Reference

The included `ecosystem.config.js` configures:

```
- Cluster mode (uses all OCPUs for parallel request handling)
- Auto-restart on crash with exponential backoff
- Max memory restart at 1 GB per worker
- Structured logging to /var/log/drms/
```

For a 4-OCPU VM serving 100+ users, adjust `instances` in `ecosystem.config.js`:
```js
instances: 4,  // Match your OCPU count, or use 'max'
```

---

## 8. Nginx Reverse Proxy & SSL

### 8.1 Get SSL Certificate

```bash
# Ensure DNS A record points to your OCI public IP first
# Then run certbot:
sudo certbot certonly --standalone -d your-domain.com

# Or if Nginx is already running:
sudo certbot --nginx -d your-domain.com
```

### 8.2 Configure Nginx

Copy the included nginx config:

```bash
sudo cp /opt/drms/nginx.conf /etc/nginx/sites-available/drms
```

Edit and replace `YOUR_DOMAIN` with your actual domain:

```bash
sudo sed -i 's/YOUR_DOMAIN/your-domain.com/g' /etc/nginx/sites-available/drms
```

Enable the site:

```bash
sudo ln -sf /etc/nginx/sites-available/drms /etc/nginx/sites-enabled/drms
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### 8.3 Auto-Renew SSL

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-renewal is handled via systemd timer (certbot.timer)
sudo systemctl enable certbot.timer
```

### 8.4 Key Nginx Settings for 100+ Users

The included `nginx.conf` provides:

| Feature | Configuration |
|---------|--------------|
| Rate limiting (API) | 30 req/sec per IP |
| Rate limiting (Auth) | 5 req/min per IP |
| Rate limiting (Uploads) | 10 req/min per IP |
| Upload size | 26 MB (`client_max_body_size`) |
| Gzip compression | Enabled for JS/CSS/JSON |
| Static cache | 1 year for `/_next/static` |
| Keepalive | 64 connections to upstream |
| Security headers | HSTS, CSP, X-Frame-Options, etc. |

---

## 9. OCI Networking (Security Lists)

**This is critical.** OCI blocks all inbound traffic by default.

### 9.1 Open Required Ports

Go to **OCI Console > Networking > Virtual Cloud Networks > Your VCN > Security Lists > Default Security List**

Add these **Ingress Rules**:

| Stateless | Source CIDR | Protocol | Dest Port | Description |
|-----------|------------|----------|-----------|-------------|
| No | 0.0.0.0/0 | TCP | 80 | HTTP (redirects to HTTPS) |
| No | 0.0.0.0/0 | TCP | 443 | HTTPS (main application) |
| No | 0.0.0.0/0 | TCP | 22 | SSH (consider restricting to your IP) |

> **Do NOT open port 3000.** Nginx proxies traffic from 443 -> 3000 internally. Port 3000 should only be accessible on localhost.

### 9.2 OS-Level Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment "SSH"
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"
sudo ufw enable

# Verify
sudo ufw status verbose
```

### 9.3 Security Recommendations

- **Restrict SSH:** Change OCI Security List source from `0.0.0.0/0` to your office IP
- **MySQL:** Already bound to `127.0.0.1` (localhost only) - do NOT open port 3306
- **Port 3000:** Only accessible internally via Nginx proxy

---

## 10. Azure AD Configuration

### 10.1 Initial App Registration (if not done)

1. Go to **Azure Portal > Microsoft Entra ID > App registrations**
2. Click **New registration**
3. Name: `DRMS - TechVisions`
4. Supported account types: **Single tenant** (your org only)
5. Redirect URI: `https://your-domain.com/api/auth/callback/azure-ad`
6. Click **Register**

### 10.2 Update Redirect URI for Production

**This is the most important step.** After deploying to OCI, you MUST update the redirect URI.

1. Go to **Azure Portal > App registrations > DRMS**
2. Click **Authentication** in the left sidebar
3. Under **Web > Redirect URIs**, update or add:

```
https://your-domain.com/api/auth/callback/azure-ad
```

4. If you had a localhost URI for development, you can keep it for local testing:
```
http://localhost:3000/api/auth/callback/azure-ad   (development)
https://your-domain.com/api/auth/callback/azure-ad (production)
```

5. Click **Save**

### 10.3 Collect Azure AD Credentials

From the App Registration page:

| Variable | Where to Find |
|----------|--------------|
| `AZURE_AD_CLIENT_ID` | Overview > Application (client) ID |
| `AZURE_AD_TENANT_ID` | Overview > Directory (tenant) ID |
| `AZURE_AD_CLIENT_SECRET` | Certificates & secrets > New client secret > Copy the **Value** |

> **WARNING:** Client secrets expire. Set a reminder to rotate before expiry (max 24 months).

### 10.4 Required API Permissions

Ensure these are granted under **API permissions**:

| API | Permission | Type |
|-----|-----------|------|
| Microsoft Graph | User.Read | Delegated |
| Microsoft Graph | email | Delegated |
| Microsoft Graph | profile | Delegated |
| Microsoft Graph | openid | Delegated |

Click **Grant admin consent** if required.

---

## 11. File Storage (Block Volume)

### 11.1 Mount the Block Volume

After attaching in the OCI Console (Step 2.3):

```bash
# Use the included setup script
sudo bash /opt/drms/setup-storage.sh /dev/sdb
```

Or manually:

```bash
# Find the device
lsblk

# Format (first time only)
sudo mkfs.ext4 -L drms-uploads /dev/sdb

# Mount
sudo mkdir -p /mnt/drms-uploads
sudo mount /dev/sdb /mnt/drms-uploads

# Auto-mount on reboot - add to fstab
UUID=$(sudo blkid -o value -s UUID /dev/sdb)
echo "UUID=$UUID  /mnt/drms-uploads  ext4  defaults,noatime,_netdev  0  2" | sudo tee -a /etc/fstab

# Set permissions
sudo chown -R drms:drms /mnt/drms-uploads
sudo chmod 750 /mnt/drms-uploads

# Create subdirectories
sudo -u drms mkdir -p /mnt/drms-uploads/documents
sudo -u drms mkdir -p /mnt/drms-uploads/attachments
sudo -u drms mkdir -p /mnt/drms-uploads/templates
sudo -u drms mkdir -p /mnt/drms-uploads/temp

# Symlink from app directory
sudo rm -rf /opt/drms/uploads
sudo ln -sf /mnt/drms-uploads /opt/drms/uploads
```

> **Note:** The `_netdev` fstab option tells the OS to wait for network before mounting. This is required for OCI block volumes.

---

## 12. Scaling for 100+ Users

### 12.1 PM2 Cluster Mode

The app runs in cluster mode across all available CPUs:

| VM OCPUs | PM2 Workers | Est. Concurrent Users |
|----------|-------------|----------------------|
| 2 | 2 | 50-100 |
| 4 | 4 | 100-200 |
| 8 | 8 | 200-400 |

To change worker count, edit `ecosystem.config.js`:
```js
instances: 4,  // Set to your OCPU count
```

Restart after changes:
```bash
sudo -u drms pm2 restart drms
```

### 12.2 MySQL Connection Pool

Prisma manages a connection pool per PM2 worker. For 4 workers with default pool of 5 connections = 20 total DB connections.

Set MySQL `max_connections` to at least **2x** total pool connections:
```
max_connections = 200  (in mysqld.cnf)
```

### 12.3 Memory Planning

For 100+ users with 16 GB RAM:

| Component | Memory |
|-----------|--------|
| OS + system | ~1 GB |
| MySQL (InnoDB buffer pool) | 4 GB |
| Nginx | ~50 MB |
| PM2 workers (4 x ~400 MB) | ~1.6 GB |
| File system cache | Remaining (~9 GB) |

For 200+ users, upgrade to 32 GB RAM and increase InnoDB buffer to 8 GB.

### 12.4 Node.js Memory per Worker

If workers exceed memory limits, increase in `ecosystem.config.js`:
```js
max_memory_restart: '1G',  // Restart worker if it exceeds 1 GB
```

Or set Node.js max heap:
```js
node_args: '--max-old-space-size=1024',  // 1 GB heap per worker
```

### 12.5 Nginx Connection Limits

For 100+ concurrent connections, edit `/etc/nginx/nginx.conf`:

```nginx
worker_processes auto;       # Matches CPU cores
worker_connections 2048;     # Per worker
```

### 12.6 OS-Level Tuning

```bash
# Increase file descriptor limits
echo "drms soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "drms hard nofile 65535" | sudo tee -a /etc/security/limits.conf

# Increase network backlog
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## 13. Monitoring & Health Checks

### 13.1 Automated Monitoring

Install the cron-based monitoring:

```bash
sudo crontab -u drms /opt/drms/crontab-oci.txt
sudo crontab -u drms -l  # Verify
```

This runs every 5 minutes and checks:
- Application health (`/api/health`)
- Database connectivity
- Disk space
- Memory usage
- PM2 process status
- Nginx status
- SSL certificate expiry

Logs: `/var/log/drms/monitor.log`

### 13.2 Manual Health Check

```bash
# App health
curl -s https://your-domain.com/api/health | jq

# PM2 status
sudo -u drms pm2 status
sudo -u drms pm2 monit     # Live monitoring dashboard

# MySQL status
mysqladmin -u drms_user -p status

# Nginx status
sudo systemctl status nginx

# Disk usage
df -h /mnt/drms-uploads

# Memory
free -h

# Active connections
ss -tuln | grep -E '(:80|:443|:3000)'
```

### 13.3 Log Locations

| Log | Path |
|-----|------|
| Application output | `/var/log/drms/pm2-out.log` |
| Application errors | `/var/log/drms/pm2-error.log` |
| Nginx access | `/var/log/nginx/drms_access.log` |
| Nginx errors | `/var/log/nginx/drms_error.log` |
| MySQL slow queries | `/var/log/mysql/slow.log` |
| Backup logs | `/var/log/drms/backup.log` |
| Monitor logs | `/var/log/drms/monitor.log` |
| Cron job logs | `/var/log/drms/cron.log` |

### 13.4 Setup Logging Infrastructure

```bash
sudo bash /opt/drms/setup-logging.sh
```

This configures:
- Log directories with proper permissions
- Logrotate (14-day retention, daily rotation, compression)
- MySQL slow query logging

---

## 14. Backup & Disaster Recovery

### 14.1 Automated Backups

Backups are scheduled via cron (installed in Step 13.1):

| Schedule | What | Retention |
|----------|------|-----------|
| Daily 2:00 AM | MySQL dump + file archive | 7 days |
| Weekly (Sunday) | Full backup | 4 weeks |
| Monthly (1st) | Full backup | 12 months |

Backup location: `/opt/drms/backups/`

### 14.2 Manual Backup

```bash
sudo -u drms bash /opt/drms/backup-oci.sh
```

### 14.3 Restore from Backup

```bash
# Database restore
gunzip -c /opt/drms/backups/daily/drms_db_20260209_020000.sql.gz | mysql -u drms_user -p drms

# File restore
tar -xzf /opt/drms/backups/daily/drms_files_20260209_020000.tar.gz -C /

# Restart app
sudo -u drms pm2 restart drms
```

### 14.4 OCI Block Volume Backups

Also set up OCI-native block volume backups:

1. **OCI Console > Block Storage > Block Volumes > Your Volume**
2. Click **Block Volume Backups > Create Backup**
3. Schedule automatic backups via **Backup Policies**

---

## 15. Maintenance & Operations

### 15.1 Deploying Updates

```bash
# SSH into server
ssh -i ~/.ssh/key ubuntu@YOUR_OCI_IP

# Switch to app user
sudo -u drms bash
cd /opt/drms

# Pull latest code
git pull origin main

# Install any new dependencies
npm ci

# Regenerate Prisma client (if schema changed)
npx prisma generate

# Apply database changes (if schema changed)
npx prisma db push

# Rebuild
npm run build

# Copy static assets
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Restart with zero downtime
pm2 reload drms
```

### 15.2 Role Management

```bash
cd /opt/drms

# Promote user to Admin
node scripts/promote-to-admin.js user@email.com

# Promote to HR
node scripts/promote-to-hr.js user@email.com

# Promote to Department Head
node scripts/promote-to-dept-head.js user@email.com "IT"

# Interactive role manager
node scripts/manage-user-roles.js

# Find a user
node scripts/find-user.js user@email.com
```

### 15.3 Common PM2 Commands

```bash
sudo -u drms pm2 status          # Check status
sudo -u drms pm2 logs drms       # Tail logs
sudo -u drms pm2 restart drms    # Hard restart
sudo -u drms pm2 reload drms     # Zero-downtime reload
sudo -u drms pm2 monit           # Live monitoring
sudo -u drms pm2 flush           # Clear log files
```

### 15.4 Cron Jobs (Installed)

| Schedule | Job |
|----------|-----|
| Daily 8:00 AM | Check overdue assignments, send reminders |
| Daily 2:00 AM | Database + file backup |
| Every 5 min | Health monitoring |
| Daily 3:00 AM | Clean temp upload files |
| Sunday 4:00 AM | Restart PM2 (memory cleanup) |
| Twice daily | SSL certificate renewal check |

---

## 16. Troubleshooting

### App won't start

```bash
# Check PM2 logs
sudo -u drms pm2 logs drms --lines 50

# Check if port is in use
ss -tuln | grep 3000

# Check .env file exists and is readable
sudo -u drms cat /opt/drms/.env | head -5

# Verify database connection
sudo -u drms node -e "
  const {PrismaClient}=require('@prisma/client');
  const p=new PrismaClient();
  p.\$connect().then(()=>{console.log('DB OK');p.\$disconnect()}).catch(e=>console.error('DB FAIL:',e.message));
"
```

### 502 Bad Gateway from Nginx

```bash
# Check if app is running
sudo -u drms pm2 status

# Check Nginx error log
sudo tail -20 /var/log/nginx/drms_error.log

# Verify Nginx config
sudo nginx -t
```

### Azure AD login fails

1. Verify redirect URI matches EXACTLY: `https://your-domain.com/api/auth/callback/azure-ad`
2. Check `NEXTAUTH_URL` in `.env` matches your domain (with `https://`)
3. Verify client secret hasn't expired in Azure Portal
4. Check app logs: `sudo -u drms pm2 logs drms | grep -i auth`

### Database connection refused

```bash
# Check MySQL is running
sudo systemctl status mysql

# Check socket file
ls -la /var/run/mysqld/mysqld.sock

# Test connection
mysql -u drms_user -p -e "SELECT 1"

# Check DATABASE_URL format in .env
# Correct: mysql://drms_user:PASSWORD@localhost:3306/drms
```

### Out of disk space

```bash
# Check disk usage
df -h

# Find large files
du -sh /opt/drms/backups/*
du -sh /mnt/drms-uploads/*
du -sh /var/log/drms/*

# Clean old backups manually
find /opt/drms/backups/daily -type f -mtime +7 -delete

# Force logrotate
sudo logrotate -f /etc/logrotate.d/drms
```

### High memory usage

```bash
# Check per-process memory
sudo -u drms pm2 monit

# Reduce PM2 workers temporarily
sudo -u drms pm2 scale drms 2

# Restart all workers (clears memory)
sudo -u drms pm2 restart drms
```

### Prisma errors after schema changes

```bash
cd /opt/drms

# Regenerate client
npx prisma generate

# If tables are out of sync
npx prisma db push

# If you need to see current DB state vs schema
npx prisma db pull
```

---

## 17. Security Hardening Checklist

- [ ] SSH key-only authentication (disable password login)
- [ ] Restrict SSH in OCI Security List to known IPs
- [ ] UFW firewall enabled (only 22, 80, 443)
- [ ] Fail2ban configured for SSH
- [ ] MySQL bound to localhost only (`bind-address = 127.0.0.1`)
- [ ] MySQL root password set
- [ ] `.env` file permissions set to `600`
- [ ] Nginx security headers enabled (HSTS, CSP, X-Frame-Options)
- [ ] SSL/TLS configured with A+ rating settings
- [ ] Application runs as non-root user (`drms`)
- [ ] Port 3000 not exposed to internet
- [ ] Rate limiting enabled on Nginx
- [ ] Azure AD client secret rotated regularly
- [ ] `NEXTAUTH_SECRET` is a strong random value
- [ ] File upload validation and size limits enforced
- [ ] Automatic backups configured and tested
- [ ] Log rotation configured to prevent disk fill
- [ ] Systemd service hardened (`NoNewPrivileges`, `ProtectSystem`)

---

## 18. Quick Command Reference

```bash
# ===== SSH Into Server =====
ssh -i ~/.ssh/key ubuntu@YOUR_OCI_IP

# ===== App Management =====
sudo -u drms pm2 status                     # Check status
sudo -u drms pm2 restart drms               # Restart
sudo -u drms pm2 reload drms                # Zero-downtime reload
sudo -u drms pm2 logs drms                  # View logs
sudo -u drms pm2 monit                      # Live monitor

# ===== Deploy Update =====
sudo -u drms bash -c 'cd /opt/drms && git pull && npm ci && npx prisma generate && npm run build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/ && pm2 reload drms'

# ===== Health Check =====
curl -s https://your-domain.com/api/health | jq

# ===== Database =====
mysql -u drms_user -p drms                   # Connect to DB
sudo -u drms npx prisma studio               # Visual DB browser (dev only)

# ===== Logs =====
sudo tail -f /var/log/drms/pm2-out.log       # App logs
sudo tail -f /var/log/nginx/drms_error.log   # Nginx errors
sudo tail -f /var/log/drms/monitor.log       # Monitor logs

# ===== Backup =====
sudo -u drms bash /opt/drms/backup-oci.sh    # Manual backup

# ===== SSL =====
sudo certbot renew --dry-run                 # Test renewal
sudo certbot certificates                    # Check expiry

# ===== System =====
sudo systemctl status mysql nginx            # Service status
df -h && free -h                             # Disk and memory
sudo ufw status                              # Firewall rules
```

---

## Automated Deployment (One-Command)

For a completely automated deployment, use the included script:

```bash
# Transfer the project to the server first, then:
sudo bash /opt/drms/deploy-oci.sh
```

This script automates Steps 3-8 (installs all prerequisites, configures Nginx, gets SSL, builds the app, and starts PM2).

**You still need to manually:**
1. Create the OCI instance and attach block volume (Step 2)
2. Point your DNS A record to the OCI public IP
3. Update Azure AD redirect URI (Step 10.2)
4. Create and fill in the `.env` file (Step 6)

---

> **Support:** For issues, check the logs first (`pm2 logs drms`), then consult the Troubleshooting section above.
