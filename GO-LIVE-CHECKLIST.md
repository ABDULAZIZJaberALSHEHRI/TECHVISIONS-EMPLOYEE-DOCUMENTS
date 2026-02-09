# DRMS - Go-Live Checklist

## Before Deployment

### OCI Infrastructure
- [ ] OCI Compute Instance provisioned (VM.Standard.E4.Flex, 2 OCPUs, 16GB RAM)
- [ ] Ubuntu 24.04 LTS image selected
- [ ] SSH key pair configured and tested
- [ ] Block Volume created (50GB+) and attached to VM
- [ ] VCN Security Lists configured (ports 22, 80, 443)
- [ ] Public IP assigned to the VM
- [ ] Domain DNS A record pointing to VM public IP

### External Services
- [ ] Azure AD app registered at https://portal.azure.com
- [ ] Redirect URI set to `https://your-domain.com/api/auth/callback/azure-ad`
- [ ] Azure AD Client ID, Secret, and Tenant ID noted
- [ ] SMTP credentials obtained and tested
- [ ] Domain email configured (noreply@yourcompany.com)

### Credentials Prepared
- [ ] MySQL database password generated (`openssl rand -base64 24`)
- [ ] NextAuth secret generated (`openssl rand -base64 32`)
- [ ] All values ready for `.env` file

## During Deployment

### Server Setup
- [ ] SSH into VM: `ssh -i key ubuntu@<IP>`
- [ ] Upload project files to VM
- [ ] Run `sudo bash deploy-oci.sh` - completes without errors
- [ ] Verify Node.js installed: `node -v` (v20.x)
- [ ] Verify MySQL installed: `mysql --version`
- [ ] Verify Nginx installed: `nginx -v`
- [ ] Verify PM2 installed: `pm2 -v`

### Database
- [ ] Edit `oci-mysql-setup.sql` with secure password
- [ ] Run: `sudo mysql < oci-mysql-setup.sql`
- [ ] Apply MySQL performance settings to `mysqld.cnf`
- [ ] Restart MySQL: `sudo systemctl restart mysql`
- [ ] Verify: `mysql -u drms_user -p -e "SELECT 1" drms`

### Storage
- [ ] Run: `sudo bash setup-storage.sh /dev/sdb`
- [ ] Verify mount: `df -h /mnt/drms-uploads`
- [ ] Verify auto-mount in `/etc/fstab`
- [ ] Verify symlink: `ls -la /opt/drms/uploads`

### Application
- [ ] Copy and fill `.env`: `cp .env.production.example .env`
- [ ] All environment variables populated in `.env`
- [ ] Run Prisma migrations: `npx prisma db push`
- [ ] Build completed: `.next/standalone/server.js` exists
- [ ] Start PM2: `pm2 start ecosystem.config.js`
- [ ] Verify PM2 status: `pm2 status` shows "online"

### SSL & Nginx
- [ ] SSL certificate obtained: `sudo certbot --nginx -d your-domain.com`
- [ ] Nginx config active: `sudo nginx -t` passes
- [ ] HTTPS accessible: `curl -I https://your-domain.com`

### Azure AD Login
- [ ] Navigate to https://your-domain.com
- [ ] Click "Sign in with Microsoft"
- [ ] Successfully redirected to Azure AD
- [ ] Login completes and user is created in DB
- [ ] Correct role assigned (first user should be ADMIN)

### File Upload
- [ ] Create a test document request as HR
- [ ] Upload a test file as employee
- [ ] File saved to `/mnt/drms-uploads/`
- [ ] Download the file - content matches original

### Email
- [ ] Create a request that triggers notification
- [ ] Verify email received by assigned employee
- [ ] Email content renders correctly

### Role Testing
- [ ] Admin: access `/admin/users`, `/admin/categories`, `/admin/settings`
- [ ] HR: access `/hr/dashboard`, `/hr/requests`, create requests
- [ ] Employee: access `/employee/dashboard`, view and submit documents

## Post-Deployment

### Verification
- [ ] Health endpoint: `curl -s https://your-domain.com/api/health | jq` returns `"healthy"`
- [ ] SSL certificate valid: `sudo certbot certificates`
- [ ] No errors in logs: `tail -50 /var/log/drms/pm2-error.log`
- [ ] No Nginx errors: `tail -50 /var/log/nginx/drms_error.log`
- [ ] UFW active: `sudo ufw status`
- [ ] Fail2ban active: `sudo fail2ban-client status sshd`

### Monitoring & Automation
- [ ] Install cron jobs: `sudo crontab -u drms /opt/drms/crontab-oci.txt`
- [ ] Verify cron: `sudo crontab -u drms -l`
- [ ] Run logging setup: `sudo bash setup-logging.sh`
- [ ] Test monitoring: `bash monitor.sh`
- [ ] Test backup: `bash backup-oci.sh`
- [ ] Verify backup file created in `/opt/drms/backups/`

### Security Verification
- [ ] Security headers present: `curl -sI https://your-domain.com | grep -i strict`
- [ ] SSH password auth disabled: `grep PasswordAuthentication /etc/ssh/sshd_config`
- [ ] MySQL bound to localhost: `grep bind-address /etc/mysql/mysql.conf.d/mysqld.cnf`
- [ ] `.env` file permissions: `stat -c '%a' /opt/drms/.env` (should be 600)
- [ ] No default/test accounts in database

### Documentation
- [ ] Production credentials stored securely (not in plain text, not in git)
- [ ] Backup restore procedure tested
- [ ] Team trained on basic operations (see MAINTENANCE.md)
- [ ] Emergency contact information documented

## Sign-Off

| Role             | Name | Date | Signature |
|------------------|------|------|-----------|
| DevOps Engineer  |      |      |           |
| Project Manager  |      |      |           |
| Security Review  |      |      |           |
