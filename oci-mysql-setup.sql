-- =============================================================================
-- DRMS - OCI MySQL Database Setup
-- Run as root: sudo mysql < oci-mysql-setup.sql
-- =============================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS drms
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Create application user (change password before running!)
-- Generate a secure password: openssl rand -base64 24
CREATE USER IF NOT EXISTS 'drms_user'@'localhost'
    IDENTIFIED WITH mysql_native_password
    BY 'CHANGE_THIS_PASSWORD';

-- Grant privileges (least-privilege: only what the app needs)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
    ON drms.*
    TO 'drms_user'@'localhost';

-- Allow Prisma migrations
GRANT CREATE TEMPORARY TABLES ON drms.* TO 'drms_user'@'localhost';

FLUSH PRIVILEGES;

-- ---------------------------------------------------------------------------
-- MySQL Performance Settings for OCI VM (2 OCPU / 16GB RAM)
-- Add these to /etc/mysql/mysql.conf.d/mysqld.cnf under [mysqld]
-- ---------------------------------------------------------------------------
-- Below are recommended settings. Uncomment and add to mysqld.cnf:
--
-- [mysqld]
-- # Character set
-- character-set-server = utf8mb4
-- collation-server = utf8mb4_unicode_ci
--
-- # Timezone
-- default-time-zone = '+00:00'
--
-- # InnoDB settings
-- innodb_buffer_pool_size = 4G
-- innodb_log_file_size = 256M
-- innodb_flush_log_at_trx_commit = 2
-- innodb_flush_method = O_DIRECT
-- innodb_io_capacity = 2000
-- innodb_io_capacity_max = 4000
--
-- # Connection settings
-- max_connections = 100
-- wait_timeout = 600
-- interactive_timeout = 600
--
-- # Query cache (disabled in MySQL 8, use application-level caching)
--
-- # Slow query log
-- slow_query_log = 1
-- slow_query_log_file = /var/log/mysql/slow.log
-- long_query_time = 2
--
-- # Security
-- bind-address = 127.0.0.1
-- skip-name-resolve
-- local-infile = 0
--
-- # Binary logging (for point-in-time recovery)
-- log_bin = /var/log/mysql/mysql-bin
-- expire_logs_days = 7
-- max_binlog_size = 100M
-- server-id = 1

-- ---------------------------------------------------------------------------
-- Verify setup
-- ---------------------------------------------------------------------------
SELECT
    'Database created' AS status,
    SCHEMA_NAME,
    DEFAULT_CHARACTER_SET_NAME,
    DEFAULT_COLLATION_NAME
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = 'drms';

SELECT
    'User created' AS status,
    User,
    Host,
    plugin
FROM mysql.user
WHERE User = 'drms_user';
