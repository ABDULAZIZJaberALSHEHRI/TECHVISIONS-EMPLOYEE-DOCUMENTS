# DRMS - Maintenance & Operations Guide

## Application Updates

### Deploy a New Version

```bash
# 1. Backup current deployment
sudo -u drms cp -r /opt/drms/.next /opt/drms/backups/next-$(date +%Y%m%d)

# 2. Upload new code
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
    --exclude='uploads' --exclude='logs' --exclude='.env' \
    ./ drms@<VM_IP>:/opt/drms/

# 3. Install dependencies and rebuild
cd /opt/drms
sudo -u drms npm ci --production=false
sudo -u drms npx prisma generate
sudo -u drms npm run build

# 4. Copy standalone assets
sudo -u drms cp -r public .next/standalone/
sudo -u drms cp -r .next/static .next/standalone/.next/

# 5. Run database migrations (if schema changed)
sudo -u drms npx prisma db push

# 6. Restart with zero downtime
sudo -u drms pm2 reload drms
```

### Rollback to Previous Version

```bash
# Restore previous build
sudo -u drms cp -r /opt/drms/backups/next-YYYYMMDD /opt/drms/.next
sudo -u drms pm2 restart drms
```

## Scaling

### Add More PM2 Instances

Edit `ecosystem.config.js`:
```js
instances: 4,  // Set to number of OCPUs
```

Apply:
```bash
sudo -u drms pm2 reload ecosystem.config.js
```

### Scale the OCI VM

1. Stop the instance in OCI Console
2. Change shape to a larger flex shape (more OCPUs/RAM)
3. Start the instance
4. Update PM2 instance count to match new OCPU count
5. Restart: `sudo -u drms pm2 restart drms`

## Backup & Restore

### Manual Database Backup

```bash
sudo -u drms mysqldump -u drms_user -p --single-transaction drms | gzip > /opt/drms/backups/manual-$(date +%Y%m%d).sql.gz
```

### Restore from Backup

```bash
# Stop the application
sudo -u drms pm2 stop drms

# Restore database
gunzip < /opt/drms/backups/daily/drms_db_YYYYMMDD_HHMMSS.sql.gz | mysql -u drms_user -p drms

# Restore files (if needed)
tar -xzf /opt/drms/backups/daily/drms_files_YYYYMMDD_HHMMSS.tar.gz -C /mnt/

# Restart
sudo -u drms pm2 start drms
```

### Check Backup Status

```bash
# List recent backups
ls -lht /opt/drms/backups/daily/ | head -10

# Check backup log
tail -30 /var/log/drms/backup.log
```

## Log Management

### View Application Logs

```bash
# Real-time PM2 logs
sudo -u drms pm2 logs drms

# Error logs
tail -f /var/log/drms/pm2-error.log

# Nginx access logs
tail -f /var/log/nginx/drms_access.log

# Cron job output
tail -f /var/log/drms/cron.log

# Monitoring logs
tail -f /var/log/drms/monitor.log
```

### Manual Log Rotation

```bash
sudo logrotate -f /etc/logrotate.d/drms
```

### Clear Old Logs

```bash
# PM2 log flush
sudo -u drms pm2 flush

# Clear all DRMS logs (use with caution)
sudo truncate -s 0 /var/log/drms/*.log
```

## SSL Certificate Management

### Check Certificate Expiry

```bash
sudo certbot certificates
```

### Manual Renewal

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Replace with Custom Certificate

```bash
# Place your cert files
sudo cp fullchain.pem /etc/ssl/certs/drms-fullchain.pem
sudo cp privkey.pem /etc/ssl/private/drms-privkey.pem

# Update nginx.conf SSL paths
sudo nano /etc/nginx/sites-available/drms

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

## Database Maintenance

### Check Database Size

```bash
mysql -u drms_user -p -e "
SELECT table_name AS 'Table',
    ROUND(data_length / 1024 / 1024, 2) AS 'Data (MB)',
    ROUND(index_length / 1024 / 1024, 2) AS 'Index (MB)',
    ROUND((data_length + index_length) / 1024 / 1024, 2) AS 'Total (MB)'
FROM information_schema.tables
WHERE table_schema = 'drms'
ORDER BY (data_length + index_length) DESC;
"
```

### Optimize Tables

```bash
mysql -u drms_user -p -e "
USE drms;
OPTIMIZE TABLE notifications;
OPTIMIZE TABLE audit_logs;
OPTIMIZE TABLE documents;
"
```

### Clean Up Old Data

```bash
# Remove read notifications older than 90 days
mysql -u drms_user -p -e "
DELETE FROM drms.notifications
WHERE is_read = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
"

# Remove audit logs older than 1 year
mysql -u drms_user -p -e "
DELETE FROM drms.audit_logs
WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);
"
```

### Review Slow Queries

```bash
sudo tail -50 /var/log/mysql/slow.log
```

## Disk Space Management

### Check Disk Usage

```bash
# Overall
df -h

# Upload directory
du -sh /mnt/drms-uploads/
du -sh /mnt/drms-uploads/documents/
du -sh /mnt/drms-uploads/attachments/

# Backups
du -sh /opt/drms/backups/

# Logs
du -sh /var/log/drms/
```

### Expand Block Volume

1. In OCI Console, resize the Block Volume
2. On the VM:
```bash
# Rescan the device
sudo dd iflag=direct if=/dev/sdb of=/dev/null count=1 2>/dev/null
# Resize the filesystem
sudo resize2fs /dev/sdb
# Verify
df -h /mnt/drms-uploads
```

## Monitoring

### Health Check

```bash
curl -s http://127.0.0.1:3000/api/health | jq
```

### PM2 Monitoring Dashboard

```bash
sudo -u drms pm2 monit
```

### System Resources

```bash
# CPU and memory
htop

# Disk I/O
iostat -x 1 5

# Network connections
ss -tlnp
```

## Emergency Procedures

### Application Crash Loop

```bash
# Stop PM2
sudo -u drms pm2 stop drms

# Check for issues
sudo -u drms pm2 logs drms --lines 100

# If .env is missing or corrupt
sudo -u drms cat /opt/drms/.env

# Clear PM2 state and restart
sudo -u drms pm2 delete drms
sudo -u drms pm2 start /opt/drms/ecosystem.config.js
```

### Server Reboot Recovery

After a reboot, services should auto-start. Verify:
```bash
sudo systemctl status mysql
sudo systemctl status nginx
sudo -u drms pm2 status

# If PM2 processes aren't running:
sudo -u drms pm2 resurrect
```

### Disk Full Emergency

```bash
# Find large files
sudo du -ah / | sort -rh | head -20

# Quick space recovery
sudo -u drms pm2 flush                          # Clear PM2 logs
sudo truncate -s 0 /var/log/drms/*.log           # Clear app logs
sudo journalctl --vacuum-size=100M               # Trim systemd journal
find /mnt/drms-uploads/temp -mtime +1 -delete    # Clean temp files
```
