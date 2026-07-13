module.exports = {
  apps: [
    {
      name: "risingwind-bot",
      script: "dist/src/index.js",
      cwd: "/home/hayashi/risingwind-bot",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      env_file: ".env",
    },
  ],
};
