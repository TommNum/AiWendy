module.exports = {
  apps: [{
    name: 'game-starter',
    script: 'dist/index.js',
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
  }, {
    name: "twitter-dm-agent",
    script: "npm",
    args: "start",
    env: {
      NODE_ENV: "production",
      TWITTER_API_KEY: "hZj3LEUiFha2gEaX4ZTPoZSPv",
      TWITTER_API_SECRET: "6AJgoKT16SGBrYQVZRApujmKAHer15Y78g58URTA1rMoFSq2Qn",
      TWITTER_ACCESS_TOKEN: "1880153652255682561-oLVYAzPAzCmgT7h2gEfRp6TOjwvOKY",
      TWITTER_ACCESS_TOKEN_SECRET: "s95IsIyVNZ0asIsh82chuF0NncbJcGunuUOKHH340Rh58",
      GAME_API_KEY: "apt-8bb5f7c2f5e77ef6847f51624e4a0746"
    }
  }]
}; 