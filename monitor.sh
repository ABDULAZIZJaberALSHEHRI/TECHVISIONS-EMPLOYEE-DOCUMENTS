#!/usr/bin/env bash
# =============================================================================
# DRMS - Monitoring Script for OCI
# Checks application health, database, disk, and memory
# Schedule: */5 * * * * /opt/drms/monitor.sh >> /var/log/drms/monitor.log 2>&1
# =============================================================================
set -uo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_URL="http://127.0.0.1:3000/api/health"
DOMAIN_URL=""  # Optional: set to https://your-domain.com/api/health for external check
DB_USER="drms_user"
DB_NAME="drms"
DISK_WARN_PERCENT=85
DISK_CRIT_PERCENT=95
MEM_WARN_PERCENT=85
LOG_DIR="/var/log/drms"

# Email alerts (optional - requires mailutils or sendmail)
ALERT_EMAIL=""  # Set to receive email alerts, e.g., admin@yourcompany.com
SMTP_FROM="drms-monitor@localhost"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
ALERT_MESSAGES=()

log_info()  { echo "[$TIMESTAMP] [OK]    $*"; }
log_warn()  { echo "[$TIMESTAMP] [WARN]  $*"; ALERT_MESSAGES+=("WARN: $*"); }
log_error() { echo "[$TIMESTAMP] [ERROR] $*"; ALERT_MESSAGES+=("ERROR: $*"); }

# ---------------------------------------------------------------------------
# 1. Application health check
# ---------------------------------------------------------------------------
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$APP_URL" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" == "200" ]]; then
    HEALTH_BODY=$(curl -s --max-time 10 "$APP_URL" 2>/dev/null)
    STATUS=$(echo "$HEALTH_BODY" | jq -r '.status' 2>/dev/null || echo "unknown")
    if [[ "$STATUS" == "healthy" ]]; then
        log_info "Application health: healthy (HTTP $HTTP_CODE)"
    else
        log_warn "Application health: $STATUS (HTTP $HTTP_CODE)"
    fi
elif [[ "$HTTP_CODE" == "503" ]]; then
    log_warn "Application health: degraded (HTTP 503)"
else
    log_error "Application unreachable (HTTP $HTTP_CODE)"
fi

# ---------------------------------------------------------------------------
# 2. Database connection check
# ---------------------------------------------------------------------------
if mysql -u "$DB_USER" -e "SELECT 1" "$DB_NAME" &>/dev/null; then
    log_info "Database connection: OK"
else
    log_error "Database connection: FAILED"
fi

# ---------------------------------------------------------------------------
# 3. Disk space monitoring
# ---------------------------------------------------------------------------
check_disk() {
    local mount_point="$1"
    local label="$2"
    local usage
    usage=$(df "$mount_point" 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')

    if [[ -z "$usage" ]]; then
        log_warn "Disk check failed for $label ($mount_point)"
        return
    fi

    if [[ "$usage" -ge "$DISK_CRIT_PERCENT" ]]; then
        log_error "Disk $label: ${usage}% used (CRITICAL)"
    elif [[ "$usage" -ge "$DISK_WARN_PERCENT" ]]; then
        log_warn "Disk $label: ${usage}% used"
    else
        log_info "Disk $label: ${usage}% used"
    fi
}

check_disk "/" "root"
check_disk "/mnt/drms-uploads" "uploads" 2>/dev/null || true

# ---------------------------------------------------------------------------
# 4. Memory usage
# ---------------------------------------------------------------------------
MEM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
MEM_USED=$(free -m | awk '/^Mem:/{print $3}')
MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))

if [[ "$MEM_PERCENT" -ge "$MEM_WARN_PERCENT" ]]; then
    log_warn "Memory: ${MEM_PERCENT}% used (${MEM_USED}MB / ${MEM_TOTAL}MB)"
else
    log_info "Memory: ${MEM_PERCENT}% used (${MEM_USED}MB / ${MEM_TOTAL}MB)"
fi

# ---------------------------------------------------------------------------
# 5. PM2 process check
# ---------------------------------------------------------------------------
if command -v pm2 &>/dev/null; then
    PM2_STATUS=$(su - drms -c 'pm2 jlist' 2>/dev/null | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")
    if [[ "$PM2_STATUS" == "online" ]]; then
        PM2_RESTARTS=$(su - drms -c 'pm2 jlist' 2>/dev/null | jq -r '.[0].pm2_env.restart_time' 2>/dev/null || echo "?")
        log_info "PM2 process: $PM2_STATUS (restarts: $PM2_RESTARTS)"
    else
        log_error "PM2 process: $PM2_STATUS"
    fi
fi

# ---------------------------------------------------------------------------
# 6. Nginx status
# ---------------------------------------------------------------------------
if systemctl is-active --quiet nginx; then
    log_info "Nginx: running"
else
    log_error "Nginx: not running"
fi

# ---------------------------------------------------------------------------
# 7. SSL certificate expiry check (once daily at midnight)
# ---------------------------------------------------------------------------
HOUR=$(date +%H)
if [[ "$HOUR" == "00" ]] && [[ -n "$DOMAIN_URL" ]]; then
    DOMAIN=$(echo "$DOMAIN_URL" | sed 's|https://||' | sed 's|/.*||')
    CERT_EXPIRY=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [[ -n "$CERT_EXPIRY" ]]; then
        EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || echo 0)
        NOW_EPOCH=$(date +%s)
        DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
        if [[ "$DAYS_LEFT" -le 7 ]]; then
            log_error "SSL certificate expires in $DAYS_LEFT days!"
        elif [[ "$DAYS_LEFT" -le 30 ]]; then
            log_warn "SSL certificate expires in $DAYS_LEFT days"
        else
            log_info "SSL certificate: valid for $DAYS_LEFT days"
        fi
    fi
fi

# ---------------------------------------------------------------------------
# 8. Send email alerts if issues found
# ---------------------------------------------------------------------------
if [[ ${#ALERT_MESSAGES[@]} -gt 0 ]] && [[ -n "$ALERT_EMAIL" ]]; then
    ALERT_BODY="DRMS Monitoring Alert - $TIMESTAMP\n\n"
    for msg in "${ALERT_MESSAGES[@]}"; do
        ALERT_BODY+="$msg\n"
    done

    echo -e "$ALERT_BODY" | mail -s "DRMS Alert: ${#ALERT_MESSAGES[@]} issue(s) detected" \
        -r "$SMTP_FROM" "$ALERT_EMAIL" 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
if [[ ${#ALERT_MESSAGES[@]} -eq 0 ]]; then
    log_info "All checks passed"
else
    echo "[$TIMESTAMP] [SUMMARY] ${#ALERT_MESSAGES[@]} issue(s) detected"
fi
