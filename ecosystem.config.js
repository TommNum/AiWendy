module.exports = {
  apps: [{
    name: 'game-starter',
    script: 'dist/index.js', // Assuming TypeScript is compiled to dist
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}; 