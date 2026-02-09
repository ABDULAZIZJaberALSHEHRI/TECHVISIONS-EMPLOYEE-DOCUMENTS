# DRMS - Security Hardening Checklist for OCI

## Network Security

### OCI Security Lists

Ensure the VCN Security List allows **only** these ingress rules:

| Source     | Protocol | Port | Description         |
|------------|----------|------|---------------------|
| 0.0.0.0/0  | TCP      | 22   | SSH access          |
| 0.0.0.0/0  | TCP      | 80   | HTTP (redirects)    |
| 0.0.0.0/0  | TCP      | 443  | HTTPS               |

All other ports must be blocked. MySQL (3306) should NOT be exposed publicly.

To restrict SSH to specific IPs:
| Source           | Protocol | Port | Description      |
|------------------|----------|------|------------------|
| YOUR_OFFICE_IP/32 | TCP    | 22   | SSH from office  |

### OS Firewall (UFW)

Verify configuration:
```bash
sudo ufw status verbose
```

Expected output:
```
Status: active
Default: deny (incoming), allow (outgoing)

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

## SSH Hardening

### Key-Only Authentication

The deployment script disables password authentication. Verify:
```bash
grep -E "^(PasswordAuthentication|PermitRootLogin)" /etc/ssh/sshd_config
```

Expected:
```
PasswordAuthentication no
PermitRootLogin prohibit-password
```

### Fail2ban for SSH Protection

Verify Fail2ban is active:
```bash
sudo fail2ban-client status sshd
```

Configuration in `/etc/fail2ban/jail.local`:
- Max 3 failed SSH attempts
- 2-hour ban for offenders
- 10-minute detection window

### Additional SSH Hardening

Add to `/etc/ssh/sshd_config`:
```
MaxAuthTries 3
MaxSessions 5
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers ubuntu drms
```

## MySQL Security

### Bind to Localhost Only

Verify in `/etc/mysql/mysql.conf.d/mysqld.cnf`:
```ini
bind-address = 127.0.0.1
```

### No Remote Root Access

```bash
mysql -e "SELECT User, Host FROM mysql.user WHERE User='root';"
# Should only show localhost entries
```

### Application User Privileges

The `drms_user` should only have the minimum required privileges:
```bash
mysql -e "SHOW GRANTS FOR 'drms_user'@'localhost';"
```

### Disable Local File Loading

Verify in MySQL config:
```ini
local-infile = 0
```

## File Upload Security

### Directory Permissions

```bash
# Upload directory: owned by drms user, no world access
ls -la /mnt/drms-uploads/
# Expected: drwxr-x--- drms drms
```

### Nginx: Block Direct Access to Upload Files

The application serves files through authenticated API routes (`/api/documents/[id]/download`), not directly from the filesystem. Nginx does not serve the upload directory directly.

## Nginx Security

### Security Headers (configured in nginx.conf)

- **HSTS**: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- **X-Frame-Options**: `DENY` (prevents clickjacking)
- **X-Content-Type-Options**: `nosniff` (prevents MIME sniffing)
- **X-XSS-Protection**: `1; mode=block`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: Disables camera, microphone, geolocation
- **CSP**: Restricts script/style/image sources

### Rate Limiting

- Authentication endpoints: 5 requests/minute
- File uploads: 10 requests/minute
- General API: 30 requests/second
- Health check: unlimited (internal monitoring)

### SSL/TLS Configuration

Target: SSL Labs A+ rating.

- Protocols: TLS 1.2 and 1.3 only
- Strong cipher suites (ECDHE + AES-GCM + CHACHA20)
- OCSP stapling enabled
- Session tickets disabled
- Session cache enabled

Test your SSL configuration:
```bash
# Using nmap
nmap --script ssl-enum-ciphers -p 443 your-domain.com

# Or use SSL Labs: https://www.ssllabs.com/ssltest/
```

### Hidden Files Protection

Nginx blocks access to dotfiles:
```nginx
location ~ /\. {
    deny all;
}
```

## Application Security

### Environment Variables

- `.env` file is not committed to git (`.gitignore`)
- File permissions: `600` (owner read/write only)
  ```bash
  chmod 600 /opt/drms/.env
  ```

### NextAuth.js

- Session strategy: JWT (8-hour max age)
- CSRF protection: built-in
- `NEXTAUTH_SECRET`: cryptographically random, 32+ bytes

### Input Validation

- Prisma ORM prevents SQL injection
- File upload validation: type, size, and name sanitization
- Zod schema validation on API inputs

### OWASP Top 10 Mitigations

| Vulnerability         | Mitigation                                              |
|-----------------------|--------------------------------------------------------|
| Injection             | Prisma ORM parameterized queries                       |
| Broken Auth           | Azure AD SSO + NextAuth.js session management          |
| Sensitive Data        | HTTPS enforced, env vars not in code                   |
| XXE                   | No XML parsing in the application                      |
| Broken Access Control | Role-based middleware (ADMIN/HR/EMPLOYEE)              |
| Security Misconfig    | Security headers, minimal permissions                   |
| XSS                   | React auto-escaping, CSP headers                       |
| Insecure Deserialization | No custom deserialization                           |
| Known Vulnerabilities | Regular `npm audit` and dependency updates              |
| Insufficient Logging  | Full audit log trail for all actions                   |

## Regular Security Maintenance

### Monthly Tasks

```bash
# Check for dependency vulnerabilities
cd /opt/drms && npm audit

# Update system packages
sudo apt-get update && sudo apt-get upgrade

# Review Fail2ban logs
sudo fail2ban-client status sshd

# Review auth failure logs
sudo grep "Failed" /var/log/auth.log | tail -20

# Check for unauthorized users
cat /etc/passwd | grep -v nologin | grep -v false
```

### Quarterly Tasks

- Review and rotate all credentials (DB password, SMTP, Azure AD secret)
- Review OCI Security List rules
- Run SSL Labs test
- Review Nginx access logs for suspicious patterns
- Update Node.js to latest LTS patch

## Verification Commands

Run these after deployment to verify security:

```bash
# 1. Check firewall
sudo ufw status

# 2. Check SSH config
sudo sshd -T | grep -E "password|root|maxauth"

# 3. Check MySQL binding
sudo grep bind-address /etc/mysql/mysql.conf.d/mysqld.cnf

# 4. Check file permissions
stat -c '%a %U:%G %n' /opt/drms/.env
stat -c '%a %U:%G %n' /mnt/drms-uploads

# 5. Check Nginx headers
curl -sI https://your-domain.com | grep -iE "strict|frame|content-type|xss|referrer|permission"

# 6. Check SSL
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | grep -E "Protocol|Cipher"

# 7. Check Fail2ban
sudo fail2ban-client status
```
