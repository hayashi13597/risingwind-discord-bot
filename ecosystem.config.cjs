module.exports = {
  apps: [
    {
      name: "risingwind-bot",
      script: "dist/src/index.js",
      cwd: "/home/hayashi/risingwind-discord-bot",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      out_file: "~/.pm2/logs/risingwind-bot-out.log",
      error_file: "~/.pm2/logs/risingwind-bot-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
