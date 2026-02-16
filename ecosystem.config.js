module.exports = {
  apps: [{
    name: 'drms',
    script: '.next/standalone/server.js',
    cwd: '/home/opc/TECHVISIONS-EMPLOYEE-DOCUMENTS',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
    },

    // Cluster mode: set to number of OCPUs on your OCI VM
    // For VM.Standard.E4.Flex with 2 OCPUs, use 2
    instances: 'max',
    exec_mode: 'cluster',

    // Auto-restart
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    // Graceful restart
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true,

    // Logging
    error_file: '/home/opc/.pm2/logs/drms-error.log',
    out_file: '/home/opc/.pm2/logs/drms-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true,

    // Restart policy
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    min_uptime: '10s',
  }],
};
