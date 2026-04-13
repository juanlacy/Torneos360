module.exports = {
  apps: [
    {
      name: 'torneo360-backend',
      script: 'src/index.js',
      cwd: '/www/wwwroot/torneos360/backend',
      env_production: {
        NODE_ENV: 'production',
        PORT: 7300,
        TZ: 'America/Argentina/Buenos_Aires',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/www/wwwroot/torneos360/logs/pm2-error.log',
      out_file: '/www/wwwroot/torneos360/logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
