#!/usr/bin/env bash
# =============================================================================
# DRMS - OCI Backup Script
# Backs up MySQL database and uploaded files
# Usage: sudo -u drms bash backup-oci.sh
# Schedule via cron: 0 2 * * * /opt/drms/backup-oci.sh >> /var/log/drms/backup.log 2>&1
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BACKUP_DIR="/opt/drms/backups"
UPLOAD_DIR="/mnt/drms-uploads"
LOG_DIR="/var/log/drms"
DB_NAME="drms"
DB_USER="drms_user"
DB_PASS="${DB_BACKUP_PASSWORD:-}"  # Set in environment or cron
DB_HOST="localhost"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_TODAY=$(date +%Y%m%d)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)

# Retention policy
DAILY_RETENTION=7
WEEKLY_RETENTION=4
MONTHLY_RETENTION=12

# Disk space warning threshold (in percent)
DISK_WARN_THRESHOLD=85

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*"; }
log_warn()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*"; }
log_error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*"; }

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/monthly"
mkdir -p "$LOG_DIR"

# Check disk space
DISK_USAGE=$(df "$BACKUP_DIR" | tail -1 | awk '{print $5}' | tr -d '%')
if [[ "$DISK_USAGE" -gt "$DISK_WARN_THRESHOLD" ]]; then
    log_warn "Disk usage at ${DISK_USAGE}% - consider cleaning up old backups"
fi

# Determine if this is a weekly/monthly backup
BACKUP_TYPE="daily"
if [[ "$DAY_OF_WEEK" == "7" ]]; then
    BACKUP_TYPE="weekly"
fi
if [[ "$DAY_OF_MONTH" == "01" ]]; then
    BACKUP_TYPE="monthly"
fi

BACKUP_SUBDIR="$BACKUP_DIR/$BACKUP_TYPE"
log_info "Starting $BACKUP_TYPE backup..."

# ---------------------------------------------------------------------------
# 1. Database backup
# ---------------------------------------------------------------------------
DB_BACKUP_FILE="$BACKUP_SUBDIR/drms_db_${TIMESTAMP}.sql.gz"

log_info "Backing up MySQL database: $DB_NAME"

if [[ -n "$DB_PASS" ]]; then
    mysqldump -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" \
        --single-transaction \
        --routines \
        --triggers \
        --quick \
        --lock-tables=false \
        "$DB_NAME" | gzip > "$DB_BACKUP_FILE"
else
    # Try without password (socket auth or .my.cnf)
    mysqldump -u "$DB_USER" -h "$DB_HOST" \
        --single-transaction \
        --routines \
        --triggers \
        --quick \
        --lock-tables=false \
        "$DB_NAME" 2>/dev/null | gzip > "$DB_BACKUP_FILE" || {
        log_error "Database backup failed. Set DB_BACKUP_PASSWORD environment variable."
        rm -f "$DB_BACKUP_FILE"
    }
fi

if [[ -f "$DB_BACKUP_FILE" ]] && [[ -s "$DB_BACKUP_FILE" ]]; then
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    log_info "Database backup complete: $DB_BACKUP_FILE ($DB_SIZE)"
else
    log_error "Database backup failed or is empty"
fi

# ---------------------------------------------------------------------------
# 2. File uploads backup
# ---------------------------------------------------------------------------
FILES_BACKUP_FILE="$BACKUP_SUBDIR/drms_files_${TIMESTAMP}.tar.gz"

if [[ -d "$UPLOAD_DIR" ]]; then
    log_info "Backing up uploaded files: $UPLOAD_DIR"
    tar -czf "$FILES_BACKUP_FILE" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")" 2>/dev/null || {
        log_error "File backup failed"
    }

    if [[ -f "$FILES_BACKUP_FILE" ]] && [[ -s "$FILES_BACKUP_FILE" ]]; then
        FILES_SIZE=$(du -h "$FILES_BACKUP_FILE" | cut -f1)
        log_info "File backup complete: $FILES_BACKUP_FILE ($FILES_SIZE)"
    fi
else
    log_warn "Upload directory $UPLOAD_DIR not found, skipping file backup"
fi

# ---------------------------------------------------------------------------
# 3. Backup verification
# ---------------------------------------------------------------------------
log_info "Verifying backups..."

VERIFY_OK=true
if [[ -f "$DB_BACKUP_FILE" ]]; then
    # Test gzip integrity
    if gzip -t "$DB_BACKUP_FILE" 2>/dev/null; then
        log_info "Database backup integrity: OK"
    else
        log_error "Database backup integrity: FAILED"
        VERIFY_OK=false
    fi
fi

if [[ -f "$FILES_BACKUP_FILE" ]]; then
    if tar -tzf "$FILES_BACKUP_FILE" >/dev/null 2>&1; then
        log_info "File backup integrity: OK"
    else
        log_error "File backup integrity: FAILED"
        VERIFY_OK=false
    fi
fi

# ---------------------------------------------------------------------------
# 4. Cleanup old backups (retention policy)
# ---------------------------------------------------------------------------
log_info "Applying retention policy..."

# Daily: keep last N days
find "$BACKUP_DIR/daily" -type f -name "*.gz" -mtime +${DAILY_RETENTION} -delete 2>/dev/null
DAILY_COUNT=$(find "$BACKUP_DIR/daily" -type f -name "*.gz" | wc -l)
log_info "Daily backups retained: $DAILY_COUNT"

# Weekly: keep last N weeks
find "$BACKUP_DIR/weekly" -type f -name "*.gz" -mtime +$((WEEKLY_RETENTION * 7)) -delete 2>/dev/null
WEEKLY_COUNT=$(find "$BACKUP_DIR/weekly" -type f -name "*.gz" | wc -l)
log_info "Weekly backups retained: $WEEKLY_COUNT"

# Monthly: keep last N months
find "$BACKUP_DIR/monthly" -type f -name "*.gz" -mtime +$((MONTHLY_RETENTION * 31)) -delete 2>/dev/null
MONTHLY_COUNT=$(find "$BACKUP_DIR/monthly" -type f -name "*.gz" | wc -l)
log_info "Monthly backups retained: $MONTHLY_COUNT"

# ---------------------------------------------------------------------------
# 5. Summary
# ---------------------------------------------------------------------------
TOTAL_BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log_info "Backup complete. Total backup storage: $TOTAL_BACKUP_SIZE"

if [[ "$VERIFY_OK" == true ]]; then
    log_info "All backup verifications passed"
else
    log_error "Some backup verifications failed - check logs"
    exit 1
fi
