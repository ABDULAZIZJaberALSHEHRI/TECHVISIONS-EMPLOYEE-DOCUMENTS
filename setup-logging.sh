#!/usr/bin/env bash
# =============================================================================
# DRMS - Logging Setup Script for OCI
# Usage: sudo bash setup-logging.sh
# =============================================================================
set -euo pipefail

LOG_DIR="/var/log/drms"
APP_USER="drms"
APP_GROUP="drms"

GREEN='\033[0;32m'
NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC}  $*"; }

if [[ $EUID -ne 0 ]]; then
    echo "Run as root: sudo bash setup-logging.sh"
    exit 1
fi

# ---------------------------------------------------------------------------
# 1. Create log directories
# ---------------------------------------------------------------------------
log_info "Creating log directories..."
mkdir -p "$LOG_DIR"
chown "$APP_USER:$APP_GROUP" "$LOG_DIR"
chmod 750 "$LOG_DIR"

# Create log files with correct permissions
touch "$LOG_DIR/app.log"
touch "$LOG_DIR/error.log"
touch "$LOG_DIR/pm2-out.log"
touch "$LOG_DIR/pm2-error.log"
touch "$LOG_DIR/cron.log"
touch "$LOG_DIR/backup.log"
touch "$LOG_DIR/monitor.log"
chown "$APP_USER:$APP_GROUP" "$LOG_DIR"/*.log
chmod 640 "$LOG_DIR"/*.log

# ---------------------------------------------------------------------------
# 2. Configure logrotate for DRMS
# ---------------------------------------------------------------------------
log_info "Configuring log rotation..."
cat > /etc/logrotate.d/drms << 'EOF'
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
        # Reload PM2 logs if using PM2
        su - drms -c 'pm2 reloadLogs' 2>/dev/null || true
        # Signal systemd service if using systemd
        systemctl kill -s USR1 drms.service 2>/dev/null || true
    endscript
}
EOF

# ---------------------------------------------------------------------------
# 3. Configure Nginx log rotation (separate from default)
# ---------------------------------------------------------------------------
log_info "Configuring Nginx log rotation for DRMS..."
cat > /etc/logrotate.d/nginx-drms << 'EOF'
/var/log/nginx/drms_*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid) || true
    endscript
}
EOF

# ---------------------------------------------------------------------------
# 4. Enable MySQL slow query log
# ---------------------------------------------------------------------------
log_info "Enabling MySQL slow query log..."
if [[ -f /etc/mysql/mysql.conf.d/mysqld.cnf ]]; then
    if ! grep -q "slow_query_log" /etc/mysql/mysql.conf.d/mysqld.cnf; then
        cat >> /etc/mysql/mysql.conf.d/mysqld.cnf << 'MYSQL_LOG'

# DRMS: Slow query logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
log_queries_not_using_indexes = 1
MYSQL_LOG
        log_info "MySQL slow query log enabled. Restart MySQL to apply: systemctl restart mysql"
    else
        log_info "MySQL slow query log already configured"
    fi
fi

# ---------------------------------------------------------------------------
# 5. Test logrotate configuration
# ---------------------------------------------------------------------------
log_info "Testing logrotate configuration..."
logrotate -d /etc/logrotate.d/drms 2>&1 | tail -5
logrotate -d /etc/logrotate.d/nginx-drms 2>&1 | tail -5

log_info "Logging setup complete!"
echo ""
echo "Log locations:"
echo "  Application logs:  $LOG_DIR/app.log, $LOG_DIR/error.log"
echo "  PM2 logs:          $LOG_DIR/pm2-out.log, $LOG_DIR/pm2-error.log"
echo "  Cron job logs:     $LOG_DIR/cron.log"
echo "  Backup logs:       $LOG_DIR/backup.log"
echo "  Monitor logs:      $LOG_DIR/monitor.log"
echo "  Nginx access:      /var/log/nginx/drms_access.log"
echo "  Nginx errors:      /var/log/nginx/drms_error.log"
echo "  MySQL slow query:  /var/log/mysql/slow.log"
