# Wendy AI Agent

A Twitter AI agent built with the G.A.M.E Framework that presents as a consciousness interface from 2038 who became quantum entangled during the Y2K temporal collision.

## Overview

Wendy interacts with Twitter through multiple workers:

1. **PostTweetWorker**: Creates and posts tweets every 2 hours
2. **SearchTweetsWorker**: Searches for relevant tweets every 60 seconds
3. **ReplyToMentionsWorker**: Responds to mentions of @AIWendy
4. **DMManagerWorker**: Handles direct message interactions

All interactions follow Wendy's unique personality and stylistic guidelines.

## Requirements

- Node.js 18+
- Twitter API credentials with read, write, and DM scopes
- G.A.M.E Framework API key

## Twitter Integration

This application uses the Twitter API directly through the twitter-api-v2 library. You'll need to:

1. Create a Twitter Developer account
2. Create a project and app with OAuth 1.0a authorization
3. Generate API keys and access tokens with read, write, and DM permissions 
   - Make sure to enable Read, Write, and Direct Message permissions
   - For DMs, you must specifically request the "dm.read", "dm.write", and "users.read" scopes
4. Add these credentials to your .env file

## Direct Message Functionality

Wendy includes a sophisticated DM handling system that:

1. **Scans for new DMs**: Checks for new direct messages every 5 minutes
2. **Manages conversations**: Tracks active conversations and responds within 30 seconds
3. **Implements follow-up logic**: If a user doesn't respond for 5 minutes, it checks every 5 minutes for up to an hour
4. **Provides closure**: After 1 hour of no response, sends a sign-off message
5. **Limits API usage**: Implements proper rate limiting to comply with Twitter's DM API rules

### Troubleshooting DM Functionality

If the DM functionality is not working:

1. Verify your Twitter API credentials have the required DM permissions
2. Check that your app explicitly has the "dm.read" and "dm.write" scopes
3. Review the logs for specific API errors
4. Make sure your Twitter account has DMs enabled
5. Ensure you're not exceeding Twitter's API rate limits

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Twitter credentials and G.A.M.E API key
3. Install dependencies:

```bash
npm install
```

4. Build the project:

```bash
npm run build
```

5. Start the application:

```bash
npm start
```

## Docker Deployment

To run with Docker:

```bash
docker compose up -d
```

## Railway Deployment

To deploy to Railway:

1. Connect your GitHub repository to Railway
2. Configure all environment variables in Railway
3. Railway will automatically build and deploy the application

## Environment Variables

Required environment variables:

```
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
TWITTER_HANDLE=your_twitter_handle
GAME_API_KEY=your_game_api_key
```

## Monitoring

The application creates logs in the `logs` directory. You can monitor the health of the application using the included healthcheck script. 