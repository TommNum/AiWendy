# game-starter
### This is a starter project using the core components of the G.A.M.E SDK

To get an API KEY https://console.game.virtuals.io/

Available packages:
Python: https://github.com/game-by-virtuals/game-python
Typescript: https://github.com/game-by-virtuals/game-node
NPM: https://www.npmjs.com/package/@virtuals-protocol/game

## Prerequisites
- nvm
- git
- node

## To run project
1. Start from the game starter directory
   `cd game-starter`
2. Copy the environment file
    `cp .env.example .env`
3. Place your API key in the ".env" file
4. Start the project with `npm install && npm run build && npm start`
5. Or run with docker compose
    `docker compose up -d`
**Note** We recommend using nvm version 23 `nvm use 23`

## To run project in Phala TEE

1. Build the docker image and publish it to the docker hub
    `docker compose build -t <your-dockerhub-username>/virtuals-game-starter`
    `docker push <your-dockerhub-username>/virtuals-game-starter`
2. Deploy to Phala cloud using [tee-cloud-cli](https://github.com/Phala-Network/tee-cloud-cli) or manually with the [Cloud dashboard](https://cloud.phala.network/).
3. Check your agent's TEE proof and verify it on the [TEE Attestation Explorer](https://proof.t16z.com/).

## Rate Limiting

This implementation includes a token bucket rate limiter that ensures the system adheres to the game protocol's rate limiting requirements of 30 calls every 5 minutes (equivalent to one call every 10 seconds on average).

### How Rate Limiting Works

The rate limiter uses a token bucket algorithm:

1. A bucket starts with a maximum number of tokens (30)
2. Each API call consumes one token
3. Tokens are replenished gradually over time
4. If no tokens are available, the system waits until tokens are replenished

This approach provides several advantages:
- Handles variable execution times while maintaining overall rate limits
- Allows for occasional bursts of traffic (up to the bucket capacity)
- Smooths out API call patterns to prevent exceeding rate limits

### Configuration

Rate limiting parameters can be adjusted in `src/index.ts`:

```typescript
// Create rate limiter: 30 calls per 5 minutes
const rateLimiter = new RateLimiter(30, 5);
```

## Tweet Worker

This project includes a Tweet Worker that allows Wendy to post to Twitter using the Twitter API v2. The Tweet Worker generates tweets in Wendy's distinctive style and posts them at regular intervals.

### Wendy's Tweet Style

Wendy's tweets follow specific style guidelines:
- Maximum of 11 words per tweet
- All lowercase text
- No periods at the end
- 10% chance of including a quantum/spiritual/cute emoji
- Content reflects Wendy's unique personality and mission

### Twitter API Integration

To use the Twitter functionality, you need to add the following environment variables to your `.env` file:

```
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_HANDLE=your_twitter_handle
```

### Tweet Rate Limiting

The Tweet Worker includes its own rate limiting to prevent excessive posting:
- Posts an initial tweet when the application starts
- Checks every 30 minutes if it's time for a new tweet
- Only posts a new tweet if at least 2 hours have passed since the last one
- Maintains a persistent record of tweet history in the `data/tweet_history.json` file

### LLM Model Configuration

The tweet generation uses the LLM model specified in the `LLM_MODEL` environment variable. By default, it uses `DeepSeek-R1` if not specified.



