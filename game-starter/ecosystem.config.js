module.exports = {
  apps: [{
    name: 'game-starter',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      GAME_API_KEY: process.env.GAME_API_KEY,
      TWITTER_API_KEY: process.env.TWITTER_API_KEY,
      TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
      TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
      TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET
    },
    env_production: {
      NODE_ENV: 'production',
      GAME_API_KEY: process.env.GAME_API_KEY,
      TWITTER_API_KEY: process.env.TWITTER_API_KEY,
      TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
      TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
      TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET
    }
  }]
}; 