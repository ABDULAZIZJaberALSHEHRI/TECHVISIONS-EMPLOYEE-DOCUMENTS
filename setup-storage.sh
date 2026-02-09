#!/usr/bin/env bash
# =============================================================================
# DRMS - OCI Block Volume Setup Script
# Mounts OCI block volume for persistent file storage
# Usage: sudo bash setup-storage.sh [DEVICE]
# Example: sudo bash setup-storage.sh /dev/sdb
# =============================================================================
set -euo pipefail

# Configuration
MOUNT_POINT="/mnt/drms-uploads"
APP_USER="drms"
APP_GROUP="drms"
APP_DIR="/opt/drms"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

if [[ $EUID -ne 0 ]]; then
    log_error "Run as root: sudo bash setup-storage.sh"
    exit 1
fi

# ---------------------------------------------------------------------------
# Detect or accept block volume device
# ---------------------------------------------------------------------------
DEVICE="${1:-}"

if [[ -z "$DEVICE" ]]; then
    log_info "Detecting available block volumes..."
    echo ""
    lsblk -d -o NAME,SIZE,TYPE,MOUNTPOINT | grep -v "loop\|sr0"
    echo ""

    # On OCI, attached block volumes usually appear as /dev/sdb or /dev/oracleoci/oraclevd*
    if [[ -b /dev/sdb ]] && ! mount | grep -q /dev/sdb; then
        DEVICE="/dev/sdb"
        log_info "Auto-detected unformatted block volume: $DEVICE"
    elif ls /dev/oracleoci/oraclevd* 2>/dev/null | head -1 | grep -q .; then
        DEVICE=$(ls /dev/oracleoci/oraclevd* 2>/dev/null | head -1)
        log_info "Auto-detected OCI block volume: $DEVICE"
    else
        read -rp "Enter block volume device path (e.g., /dev/sdb): " DEVICE
    fi
fi

if [[ ! -b "$DEVICE" ]]; then
    log_error "Device $DEVICE does not exist or is not a block device"
    exit 1
fi

# Check if already mounted
if mount | grep -q "$DEVICE"; then
    log_warn "$DEVICE is already mounted:"
    mount | grep "$DEVICE"
    read -rp "Continue anyway? (y/N): " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || exit 0
fi

# ---------------------------------------------------------------------------
# Format the volume (only if not already formatted)
# ---------------------------------------------------------------------------
FSTYPE=$(blkid -o value -s TYPE "$DEVICE" 2>/dev/null || echo "")
if [[ -z "$FSTYPE" ]]; then
    log_info "Formatting $DEVICE with ext4..."
    mkfs.ext4 -L drms-uploads "$DEVICE"
    log_info "Volume formatted"
else
    log_info "Volume already formatted as $FSTYPE"
fi

# ---------------------------------------------------------------------------
# Create mount point and mount
# ---------------------------------------------------------------------------
mkdir -p "$MOUNT_POINT"

log_info "Mounting $DEVICE to $MOUNT_POINT..."
mount "$DEVICE" "$MOUNT_POINT"

# ---------------------------------------------------------------------------
# Add to fstab for auto-mount on reboot
# ---------------------------------------------------------------------------
UUID=$(blkid -o value -s UUID "$DEVICE")
if ! grep -q "$UUID" /etc/fstab; then
    log_info "Adding to /etc/fstab for auto-mount..."
    echo "UUID=$UUID  $MOUNT_POINT  ext4  defaults,noatime,_netdev  0  2" >> /etc/fstab
    log_info "Added to fstab (UUID=$UUID)"
else
    log_info "Already in /etc/fstab"
fi

# ---------------------------------------------------------------------------
# Set permissions
# ---------------------------------------------------------------------------
log_info "Setting permissions..."

# Create subdirectories for organized storage
mkdir -p "$MOUNT_POINT/documents"
mkdir -p "$MOUNT_POINT/attachments"
mkdir -p "$MOUNT_POINT/temp"

chown -R "$APP_USER:$APP_GROUP" "$MOUNT_POINT"
chmod 750 "$MOUNT_POINT"
chmod 750 "$MOUNT_POINT/documents"
chmod 750 "$MOUNT_POINT/attachments"
chmod 750 "$MOUNT_POINT/temp"

# ---------------------------------------------------------------------------
# Symlink from application directory
# ---------------------------------------------------------------------------
if [[ -d "$APP_DIR" ]]; then
    rm -rf "$APP_DIR/uploads"
    ln -sf "$MOUNT_POINT" "$APP_DIR/uploads"
    log_info "Created symlink: $APP_DIR/uploads -> $MOUNT_POINT"
fi

# ---------------------------------------------------------------------------
# Verify
# ---------------------------------------------------------------------------
log_info "Verification:"
echo "  Mount:       $(df -h "$MOUNT_POINT" | tail -1)"
echo "  Owner:       $(stat -c '%U:%G' "$MOUNT_POINT")"
echo "  Permissions: $(stat -c '%a' "$MOUNT_POINT")"
echo "  Symlink:     $(ls -la "$APP_DIR/uploads" 2>/dev/null || echo 'N/A')"

echo ""
log_info "Block volume setup complete!"
log_warn "Update your .env file: UPLOAD_DIR=$MOUNT_POINT"
