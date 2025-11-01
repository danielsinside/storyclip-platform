module.exports = {
  apps: [{
    name: 'storyclip',
    script: 'app.js',
    cwd: '/srv/storyclip',
    instances: 1,
    exec_mode: 'fork',
    env_file: '.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    error_file: '/var/log/pm2/storyclip-error.log',
    out_file: '/var/log/pm2/storyclip-out.log',
    log_file: '/var/log/pm2/storyclip-combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'tmp', 'work']
  }]
};