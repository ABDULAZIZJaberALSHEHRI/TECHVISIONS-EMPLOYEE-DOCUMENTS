#!/usr/bin/env bash
# =============================================================================
# DRMS - OCI Deployment Script
# Target: Ubuntu 24.04 LTS on Oracle Cloud Infrastructure
# Usage:  sudo bash deploy-oci.sh
# =============================================================================
set -euo pipefail
IFS=$'\n\t'

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_NAME="drms"
APP_DIR="/opt/drms"
APP_USER="drms"
APP_GROUP="drms"
UPLOAD_DIR="/mnt/drms-uploads"
LOG_DIR="/var/log/drms"
NODE_VERSION="20"
REPO_URL=""  # Set if deploying from git, otherwise deploy from local archive
DOMAIN=""    # Set before running, e.g., drms.yourcompany.com

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

if [[ -z "$DOMAIN" ]]; then
    read -rp "Enter the domain name for DRMS (e.g., drms.yourcompany.com): " DOMAIN
    if [[ -z "$DOMAIN" ]]; then
        log_error "Domain name is required"
        exit 1
    fi
fi

log_info "Starting DRMS deployment on OCI for domain: $DOMAIN"

# ---------------------------------------------------------------------------
# 1. System Update
# ---------------------------------------------------------------------------
log_info "Updating system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget gnupg2 software-properties-common \
    apt-transport-https ca-certificates lsb-release \
    git build-essential ufw fail2ban logrotate unzip jq

# ---------------------------------------------------------------------------
# 2. Create application user
# ---------------------------------------------------------------------------
if ! id "$APP_USER" &>/dev/null; then
    log_info "Creating application user: $APP_USER"
    useradd --system --shell /bin/bash --home-dir "$APP_DIR" --create-home "$APP_USER"
else
    log_info "User $APP_USER already exists"
fi

# ---------------------------------------------------------------------------
# 3. Install Node.js 20 LTS
# ---------------------------------------------------------------------------
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt $NODE_VERSION ]]; then
    log_info "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    log_info "Node.js $(node -v) installed"
else
    log_info "Node.js $(node -v) already installed"
fi

# ---------------------------------------------------------------------------
# 4. Install PM2
# ---------------------------------------------------------------------------
if ! command -v pm2 &>/dev/null; then
    log_info "Installing PM2..."
    npm install -g pm2
    pm2 startup systemd -u "$APP_USER" --hp "$APP_DIR"
else
    log_info "PM2 already installed"
fi

# ---------------------------------------------------------------------------
# 5. Install MySQL 8.0
# ---------------------------------------------------------------------------
if ! command -v mysql &>/dev/null; then
    log_info "Installing MySQL 8.0..."
    apt-get install -y mysql-server mysql-client

    # Start and enable MySQL
    systemctl start mysql
    systemctl enable mysql

    # Secure MySQL installation (non-interactive)
    log_info "Securing MySQL installation..."
    mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$(openssl rand -base64 24)';" 2>/dev/null || true
    mysql -e "DELETE FROM mysql.user WHERE User='';" 2>/dev/null || true
    mysql -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');" 2>/dev/null || true
    mysql -e "DROP DATABASE IF EXISTS test;" 2>/dev/null || true
    mysql -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';" 2>/dev/null || true
    mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true

    log_info "MySQL installed and secured"
    log_warn "Run 'bash oci-mysql-setup.sql' separately to create the DRMS database and user"
else
    log_info "MySQL already installed"
fi

# ---------------------------------------------------------------------------
# 6. Install Nginx
# ---------------------------------------------------------------------------
if ! command -v nginx &>/dev/null; then
    log_info "Installing Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
else
    log_info "Nginx already installed"
fi

# ---------------------------------------------------------------------------
# 7. Install Certbot for SSL
# ---------------------------------------------------------------------------
if ! command -v certbot &>/dev/null; then
    log_info "Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx
else
    log_info "Certbot already installed"
fi

# ---------------------------------------------------------------------------
# 8. Create directory structure
# ---------------------------------------------------------------------------
log_info "Creating directory structure..."
mkdir -p "$APP_DIR"
mkdir -p "$UPLOAD_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$APP_DIR/backups"

chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
chown -R "$APP_USER:$APP_GROUP" "$UPLOAD_DIR"
chown -R "$APP_USER:$APP_GROUP" "$LOG_DIR"

chmod 750 "$APP_DIR"
chmod 750 "$UPLOAD_DIR"
chmod 750 "$LOG_DIR"

# ---------------------------------------------------------------------------
# 9. Configure Firewall (UFW)
# ---------------------------------------------------------------------------
log_info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable
log_info "Firewall configured: SSH(22), HTTP(80), HTTPS(443)"

# ---------------------------------------------------------------------------
# 10. Configure Fail2ban
# ---------------------------------------------------------------------------
log_info "Configuring Fail2ban..."
cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
backend  = systemd

[sshd]
enabled = true
port    = ssh
filter  = sshd
maxretry = 3
bantime  = 7200
FAIL2BAN

systemctl enable fail2ban
systemctl restart fail2ban
log_info "Fail2ban configured"

# ---------------------------------------------------------------------------
# 11. Configure Nginx
# ---------------------------------------------------------------------------
log_info "Configuring Nginx for $DOMAIN..."
cat > /etc/nginx/sites-available/drms << NGINX_CONF
# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone \$binary_remote_addr zone=upload:10m rate=10r/m;

# Upstream
upstream drms_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL - paths will be updated by certbot
    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # File upload size limit (match MAX_FILE_SIZE_MB)
    client_max_body_size 26M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/xml
        image/svg+xml
        font/woff2;

    # Next.js static assets (immutable, long cache)
    location /_next/static {
        proxy_pass http://drms_backend;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Public static files
    location /favicon.ico {
        proxy_pass http://drms_backend;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # API rate limiting
    location /api/auth {
        limit_req zone=login burst=10 nodelay;
        proxy_pass http://drms_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/assignments/ {
        limit_req zone=upload burst=5 nodelay;
        proxy_pass http://drms_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location /api/ {
        limit_req zone=api burst=60 nodelay;
        proxy_pass http://drms_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check (no rate limiting)
    location /api/health {
        proxy_pass http://drms_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        access_log off;
    }

    # Main application
    location / {
        proxy_pass http://drms_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
NGINX_CONF

# Enable site
ln -sf /etc/nginx/sites-available/drms /etc/nginx/sites-enabled/drms
rm -f /etc/nginx/sites-enabled/default

# Test config (will fail if SSL cert doesn't exist yet - that's ok)
nginx -t 2>/dev/null && systemctl reload nginx || log_warn "Nginx config test failed - SSL cert may not exist yet. Run certbot first."

# ---------------------------------------------------------------------------
# 12. SSL Certificate
# ---------------------------------------------------------------------------
log_info "Setting up SSL certificate..."
if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    # Temporarily configure nginx without SSL for certbot
    cat > /etc/nginx/sites-available/drms-temp << TEMP_CONF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    root /var/www/html;
    location /.well-known/acme-challenge/ {
        allow all;
    }
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
TEMP_CONF
    ln -sf /etc/nginx/sites-available/drms-temp /etc/nginx/sites-enabled/drms
    nginx -t && systemctl reload nginx

    certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos \
        --email "admin@${DOMAIN#*.}" \
        --redirect || {
        log_warn "Certbot failed. Ensure DNS is pointing to this server."
        log_warn "Run manually: certbot certonly --nginx -d $DOMAIN"
    }

    # Restore full config
    ln -sf /etc/nginx/sites-available/drms /etc/nginx/sites-enabled/drms
    rm -f /etc/nginx/sites-available/drms-temp
    nginx -t && systemctl reload nginx || true

    # Auto-renewal cron
    systemctl enable certbot.timer 2>/dev/null || true
else
    log_info "SSL certificate already exists"
fi

# ---------------------------------------------------------------------------
# 13. Deploy Application
# ---------------------------------------------------------------------------
log_info "Deploying application to $APP_DIR..."

# If deploying from the current directory (local archive)
if [[ -f "package.json" ]]; then
    rsync -a --exclude='node_modules' --exclude='.next' --exclude='.git' \
        --exclude='uploads' --exclude='logs' \
        . "$APP_DIR/"
elif [[ -n "$REPO_URL" ]]; then
    sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR/source" 2>/dev/null || {
        cd "$APP_DIR/source" && sudo -u "$APP_USER" git pull
    }
    rsync -a --exclude='node_modules' --exclude='.next' --exclude='.git' \
        "$APP_DIR/source/" "$APP_DIR/"
else
    log_error "No source found. Place this script in the project root or set REPO_URL."
    exit 1
fi

chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"

# ---------------------------------------------------------------------------
# 14. Install Dependencies & Build
# ---------------------------------------------------------------------------
log_info "Installing dependencies..."
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci --production=false

log_info "Generating Prisma client..."
sudo -u "$APP_USER" npx prisma generate

log_info "Building application..."
sudo -u "$APP_USER" npm run build

# Copy required files for standalone mode
if [[ -d ".next/standalone" ]]; then
    cp -r public .next/standalone/ 2>/dev/null || true
    cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# 15. Database Migration
# ---------------------------------------------------------------------------
if [[ -f ".env" ]] || [[ -f ".env.production" ]]; then
    log_info "Running database migrations..."
    sudo -u "$APP_USER" npx prisma db push --accept-data-loss=false || {
        log_warn "Database migration failed. Check DATABASE_URL in .env"
    }
else
    log_warn "No .env file found. Create .env with DATABASE_URL before running migrations."
    log_warn "Then run: cd $APP_DIR && sudo -u $APP_USER npx prisma db push"
fi

# ---------------------------------------------------------------------------
# 16. Create uploads symlink (if using block volume)
# ---------------------------------------------------------------------------
if [[ -d "$UPLOAD_DIR" ]]; then
    # Remove default uploads dir and link to block volume
    rm -rf "$APP_DIR/uploads"
    ln -sf "$UPLOAD_DIR" "$APP_DIR/uploads"
    log_info "Linked uploads to block volume: $UPLOAD_DIR"
fi

# ---------------------------------------------------------------------------
# 17. Setup logging
# ---------------------------------------------------------------------------
log_info "Setting up logging..."
mkdir -p "$LOG_DIR"
chown -R "$APP_USER:$APP_GROUP" "$LOG_DIR"

cat > /etc/logrotate.d/drms << 'LOGROTATE'
/var/log/drms/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 drms drms
    sharedscripts
    postrotate
        pm2 reloadLogs 2>/dev/null || true
    endscript
}
LOGROTATE

# ---------------------------------------------------------------------------
# 18. Start application with PM2
# ---------------------------------------------------------------------------
log_info "Starting application with PM2..."
cd "$APP_DIR"
sudo -u "$APP_USER" pm2 delete drms 2>/dev/null || true
sudo -u "$APP_USER" pm2 start ecosystem.config.js
sudo -u "$APP_USER" pm2 save

# ---------------------------------------------------------------------------
# 19. Configure SSH hardening
# ---------------------------------------------------------------------------
log_info "Hardening SSH..."
if grep -q "^PasswordAuthentication" /etc/ssh/sshd_config; then
    sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
else
    echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
fi

if grep -q "^PermitRootLogin" /etc/ssh/sshd_config; then
    sed -i 's/^PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
else
    echo "PermitRootLogin prohibit-password" >> /etc/ssh/sshd_config
fi

systemctl reload sshd 2>/dev/null || systemctl reload ssh 2>/dev/null || true

# ---------------------------------------------------------------------------
# 20. Final verification
# ---------------------------------------------------------------------------
log_info "============================================="
log_info "DRMS Deployment Summary"
log_info "============================================="
log_info "App directory:    $APP_DIR"
log_info "Upload storage:   $UPLOAD_DIR"
log_info "Log directory:    $LOG_DIR"
log_info "Domain:           $DOMAIN"
log_info "Node.js:          $(node -v)"
log_info "PM2:              $(pm2 -v 2>/dev/null || echo 'not running')"
log_info "MySQL:            $(mysql --version 2>/dev/null | head -1 || echo 'not found')"
log_info "Nginx:            $(nginx -v 2>&1 | head -1 || echo 'not found')"
log_info "============================================="

echo ""
log_warn "NEXT STEPS:"
log_warn "1. Create .env file:      cp $APP_DIR/.env.production.example $APP_DIR/.env"
log_warn "2. Edit .env with your actual credentials"
log_warn "3. Setup MySQL database:  mysql < $APP_DIR/oci-mysql-setup.sql"
log_warn "4. Run migrations:        cd $APP_DIR && sudo -u $APP_USER npx prisma db push"
log_warn "5. Setup block volume:    bash $APP_DIR/setup-storage.sh"
log_warn "6. Setup cron jobs:       crontab -u $APP_USER $APP_DIR/crontab-oci.txt"
log_warn "7. Restart app:           sudo -u $APP_USER pm2 restart drms"
log_warn "8. Verify:                curl -s https://$DOMAIN/api/health | jq"
echo ""
log_info "Deployment script complete!"
