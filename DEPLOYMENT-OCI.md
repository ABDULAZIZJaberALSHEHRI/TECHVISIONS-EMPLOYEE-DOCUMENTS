# DRMS - OCI Deployment Guide

Complete step-by-step guide for deploying DRMS to Oracle Cloud Infrastructure.

## Prerequisites

- OCI account with a provisioned Compute Instance (recommended: VM.Standard.E4.Flex, 2 OCPUs, 16GB RAM)
- Ubuntu 24.04 LTS image on the VM
- A registered domain name with DNS access
- Azure AD app registration (for SSO)
- SMTP credentials (for email notifications)
- SSH key pair for VM access

## 1. OCI VM Setup and Access

### 1.1 Provision the Compute Instance

1. Navigate to **OCI Console > Compute > Instances > Create Instance**
2. Select **Ubuntu 24.04** as the image
3. Choose shape: **VM.Standard.E4.Flex** (2 OCPUs, 16GB RAM recommended)
4. Configure networking:
   - Place in a public subnet within your VCN
   - Assign a public IP address
5. Upload your SSH public key
6. Add a **Block Volume** (50GB minimum) for file storage under **Block Storage > Block Volumes**
7. Attach the block volume to your compute instance (iSCSI or paravirtualized)

### 1.2 Connect via SSH

```bash
ssh -i ~/.ssh/your-key ubuntu@<VM_PUBLIC_IP>
```

### 1.3 Note the Block Volume Device

After attaching, identify the device:
```bash
sudo lsblk
# Look for the unformatted disk (e.g., /dev/sdb or /dev/oracleoci/oraclevdb)
```

## 2. Firewall and Security Configuration

### 2.1 OCI Security Lists

In the OCI Console, navigate to **Networking > VCN > Security Lists** and add ingress rules:

| Stateless | Source    | Protocol | Dest Port | Description |
|-----------|-----------|----------|-----------|-------------|
| No        | 0.0.0.0/0 | TCP      | 22        | SSH         |
| No        | 0.0.0.0/0 | TCP      | 80        | HTTP        |
| No        | 0.0.0.0/0 | TCP      | 443       | HTTPS       |

### 2.2 OS Firewall (configured by deploy script)

The `deploy-oci.sh` script configures UFW automatically. To verify:
```bash
sudo ufw status verbose
```

## 3. Upload Project Files

Transfer the project to the server:

```bash
# Option A: From local machine via rsync
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
    ./ ubuntu@<VM_IP>:/tmp/drms-source/

# Option B: From git repository
ssh ubuntu@<VM_IP>
git clone <YOUR_REPO_URL> /tmp/drms-source
```

## 4. Run the Deployment Script

```bash
ssh ubuntu@<VM_IP>
cd /tmp/drms-source
sudo bash deploy-oci.sh
```

The script will:
- Install Node.js 20, MySQL 8.0, Nginx, PM2, Certbot
- Create the `drms` system user
- Configure UFW firewall and Fail2ban
- Set up Nginx with SSL
- Deploy the application to `/opt/drms`
- Build the Next.js application
- Configure log rotation

## 5. Database Setup

### 5.1 Self-Hosted MySQL (on the VM)

```bash
# Edit the SQL file and change the password
sudo nano /opt/drms/oci-mysql-setup.sql
# Change: CHANGE_THIS_PASSWORD -> your secure password

# Run the setup
sudo mysql < /opt/drms/oci-mysql-setup.sql

# Apply recommended MySQL settings
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
# Add the settings from the comments in oci-mysql-setup.sql

sudo systemctl restart mysql
```

### 5.2 OCI MySQL Database Service (managed)

If using OCI's managed MySQL service:

1. Create a MySQL DB System in the OCI Console
2. Note the endpoint IP (private IP within your VCN)
3. Update `DATABASE_URL` in `.env` to point to the managed instance:
   ```
   DATABASE_URL="mysql://drms_user:PASSWORD@10.0.1.xxx:3306/drms"
   ```
4. Ensure the security list allows port 3306 between the compute subnet and DB subnet

## 6. Block Volume Setup

```bash
# Run the storage setup script (provide the device path)
sudo bash /opt/drms/setup-storage.sh /dev/sdb
```

Verify the mount:
```bash
df -h /mnt/drms-uploads
ls -la /opt/drms/uploads  # Should be a symlink to /mnt/drms-uploads
```

## 7. Configure Environment Variables

```bash
sudo -u drms cp /opt/drms/.env.production.example /opt/drms/.env
sudo -u drms nano /opt/drms/.env
```

Fill in all required values:
- `DATABASE_URL` - MySQL connection string with the password you set
- `NEXTAUTH_URL` - Your domain (https://your-domain.com)
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `AZURE_AD_*` - From Azure portal app registration
- `SMTP_*` - Your email service credentials
- `APP_URL` - Same as NEXTAUTH_URL

## 8. Run Database Migrations

```bash
cd /opt/drms
sudo -u drms npx prisma db push
```

## 9. Start the Application

```bash
cd /opt/drms
sudo -u drms pm2 start ecosystem.config.js
sudo -u drms pm2 save
```

## 10. SSL Certificate Setup

If the deployment script didn't set up SSL (DNS wasn't ready):

```bash
# Ensure DNS A record points to VM's public IP, then:
sudo certbot --nginx -d your-domain.com
```

## 11. Set Up Cron Jobs

```bash
sudo crontab -u drms /opt/drms/crontab-oci.txt
sudo crontab -u drms -l  # Verify
```

## 12. Post-Deployment Verification

```bash
# Health check
curl -s https://your-domain.com/api/health | jq

# Check PM2 status
sudo -u drms pm2 status

# Check Nginx
sudo systemctl status nginx

# Check MySQL
sudo systemctl status mysql

# Check logs for errors
sudo tail -50 /var/log/drms/pm2-error.log
sudo tail -50 /var/log/nginx/drms_error.log
```

## 13. Testing Checklist

- [ ] Access https://your-domain.com - should redirect to login
- [ ] Click "Sign in with Microsoft" - Azure AD SSO works
- [ ] Create a document request as HR
- [ ] Upload a file as an employee
- [ ] Verify email notification received
- [ ] Download the uploaded file
- [ ] Check audit logs in admin panel
- [ ] Verify health endpoint: `curl https://your-domain.com/api/health`

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
sudo -u drms pm2 logs drms --lines 50

# Check if port 3000 is in use
sudo ss -tlnp | grep 3000

# Verify .env file exists and has correct values
sudo -u drms cat /opt/drms/.env
```

### Database connection fails

```bash
# Test MySQL connection
mysql -u drms_user -p -e "SELECT 1" drms

# Check MySQL is running
sudo systemctl status mysql

# Check MySQL logs
sudo tail -50 /var/log/mysql/error.log
```

### SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Check Nginx config
sudo nginx -t
```

### File upload fails

```bash
# Check block volume mount
df -h /mnt/drms-uploads
mount | grep drms-uploads

# Check permissions
ls -la /mnt/drms-uploads/
sudo -u drms touch /mnt/drms-uploads/test-write && rm /mnt/drms-uploads/test-write
echo "Write OK"
```

### 502 Bad Gateway

```bash
# Check if app is running
curl http://127.0.0.1:3000/api/health

# Restart PM2
sudo -u drms pm2 restart drms

# Check Nginx upstream
sudo tail -20 /var/log/nginx/drms_error.log
```

## Rollback Procedure

If a deployment goes wrong:

```bash
# 1. Stop current application
sudo -u drms pm2 stop drms

# 2. Restore previous code (if you kept a backup)
sudo -u drms cp -r /opt/drms/backups/code-previous/* /opt/drms/

# 3. Restore database from backup
gunzip < /opt/drms/backups/daily/drms_db_YYYYMMDD_HHMMSS.sql.gz | mysql -u drms_user -p drms

# 4. Restart
sudo -u drms pm2 restart drms
```
