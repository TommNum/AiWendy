# AiWendy Game Starter

This is a starter project for the AiWendy agent, built using the GAME SDK. It provides a Twitter bot that can post tweets, reply to mentions, and engage with other Twitter users.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Twitter API credentials (API key, API secret, Access token, Access token secret)
- GAME API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/TommNum/AiWendy.git
cd AiWendy/game-starter
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
# Twitter API Credentials
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

# GAME API Key
API_KEY=your_game_api_key

# LLM Configuration
LLM_MODEL=Llama-3.1-405B-Instruct
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=150
```

### Running the Application

To start the application:

```bash
npm start
```

This will initialize the agent and start the Twitter bot, which will:
- Post tweets at regular intervals
- Check for mentions and reply to them
- Search for relevant tweets and engage with them

## Deployment to Railway

AiWendy can be easily deployed to [Railway](https://railway.app/), a cloud platform for deploying applications and databases.

### Quick Deployment

Use our deployment script to quickly deploy to Railway:

```bash
./deploy-railway.sh
```

This script will:
1. Install Railway CLI if needed
2. Log you into Railway
3. Initialize a new Railway project if needed
4. Build the application
5. Check for a PostgreSQL database and guide you to set one up if needed
6. Deploy the application to Railway

### Viewing Database Logs

Once deployed, you can view logs stored in the PostgreSQL database using our log viewer script:

```bash
./view-logs.sh
```

This interactive tool lets you:
- View recent logs
- Filter logs by level (error, info, etc.)
- Filter logs by source (tweet-worker, etc.)
- Run custom SQL queries on the logs table

### Manual Deployment

For more detailed instructions on deploying to Railway, see our [Railway Deployment Guide](RAILWAY_DEPLOYMENT.md).

## Testing

The project includes several test scripts to verify functionality:

### Twitter API Test

Tests the Twitter API authentication and tweet posting:

```bash
npx ts-node src/test-tweet.ts
```

### LLM Usage Test

Tests the LLM connectivity and configuration:

```bash
npx ts-node src/test-llm-usage.ts
```

### Worker Functionality Test

Tests the initialization and functionality of all workers:

```bash
npx ts-node src/test-workers.ts
```

### Running All Tests

To run all tests at once:

```bash
bash generate_tests.sh
```

## Project Structure

- `src/`: Source code
  - `workers/`: Worker implementations
    - `tweetWorker.ts`: Handles tweet generation and posting
    - `twitterReplyWorker.ts`: Handles replying to mentions
    - `twitterSearchWorker.ts`: Handles searching for tweets
    - `daoEngagementWorker.ts`: Handles DAO-related engagement
  - `utils/`: Utility functions
    - `logger.ts`: Logging utility
  - `index.ts`: Main entry point
  - `agent.ts`: Agent configuration
  - `test-*.ts`: Test scripts

## Twitter Integration

### OAuth Authentication

The application uses OAuth 1.0a to authenticate with the Twitter API v2. The implementation in `src/workers/tweetWorker.ts` ensures proper authentication by:

1. Generating an OAuth signature based on the request method, URL, and parameters
2. Creating the authorization header with all required OAuth parameters
3. Sending the request with the proper headers to the Twitter API

### Rate Limiting

The application implements rate limiting for Twitter API requests to comply with Twitter's guidelines:

1. **Token-Based Rate Limiting**: Using a token bucket algorithm that allows bursts of requests while maintaining a long-term average rate
2. **Per-Function Limits**: Different functions (posting tweets, checking mentions, searching) have separate rate limits
3. **Scheduled Operations**: Tweets, mentions, and searches are scheduled at appropriate intervals to avoid hitting rate limits

## LLM Integration

The application uses the DeepSeek-R1 LLM model to generate tweets and replies. The implementation ensures:

1. Tweets are generated based on cultural context and current events
2. Content is appropriate and aligned with the agent's personality
3. Tweets are within the character limit and properly formatted

## Troubleshooting

### Common Issues

1. **Twitter API Authentication Errors**:
   - Verify your Twitter API credentials in the `.env` file
   - Check the logs for detailed error messages
   - Run the Twitter API test to verify authentication

2. **LLM Connectivity Issues**:
   - Verify your GAME API key in the `.env` file
   - Check if the LLM model is correctly specified
   - Run the LLM usage test to verify connectivity

3. **Worker Initialization Errors**:
   - Check the logs for detailed error messages
   - Run the worker functionality test to verify initialization
   - Ensure all required environment variables are set

### Railway Deployment Issues

1. **Database Connection Errors**:
   - Verify that the `DATABASE_URL` environment variable is set correctly in Railway
   - Check if the PostgreSQL database is properly provisioned
   - Check the application logs for database connection errors

2. **Deployment Failures**:
   - Check the build logs in Railway for errors
   - Verify that all required environment variables are set in Railway
   - Make sure the Dockerfile is correctly configured

3. **Performance Issues**:
   - Consider upgrading your Railway plan if you're experiencing resource constraints
   - Monitor database usage and consider optimizing queries or adding indexes

## License

This project is licensed under the MIT License.



