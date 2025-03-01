# Deploying AiWendy to Railway

This guide provides step-by-step instructions for deploying the AiWendy application to Railway.

## Prerequisites

- [Railway account](https://railway.app/)
- [Railway CLI](https://docs.railway.app/develop/cli) installed locally
- Git repository set up

## Deployment Steps

### 1. Install the Railway CLI

```bash
npm i -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Initialize a Railway Project

```bash
cd game-starter
railway init
```

This will create a new project on Railway and link your local directory to it.

### 4. Add a PostgreSQL Database

From the Railway dashboard:
1. Navigate to your project
2. Click "New"
3. Select "Database" 
4. Choose "PostgreSQL"

This will provision a new PostgreSQL database for your application.

### 5. Set Environment Variables

Set your environment variables on Railway. You can do this from the dashboard or using the CLI:

```bash
railway variables set API_KEY=your_api_key_here
railway variables set TWITTER_API_KEY=your_twitter_api_key
# ... set all your variables as defined in .env
```

**Important environment variables to set:**
- API_KEY
- TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET, TWITTER_BEARER_TOKEN
- LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS
- NODE_ENV=production

The DATABASE_URL will be automatically set by Railway when you add the PostgreSQL service.

### 6. Deploy Your Application

```bash
railway up
```

This will build your Docker image using the Dockerfile and deploy it to Railway.

## Monitoring Your Deployment

1. **View Logs**: 
   ```bash
   railway logs
   ```

2. **Check Database Logs**:
   You can view your database logs in the Railway dashboard.

3. **Connect to the PostgreSQL Database**:
   ```bash
   railway connect
   ```

## Viewing Database Logs

To view the logs stored in the database:

1. Connect to the PostgreSQL database:
   ```bash
   railway connect
   ```

2. Once connected to PostgreSQL, run:
   ```sql
   SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100;
   ```

3. Filter logs by level:
   ```sql
   SELECT * FROM logs WHERE level = 'error' ORDER BY timestamp DESC LIMIT 50;
   ```

4. Filter logs by source:
   ```sql
   SELECT * FROM logs WHERE source = 'tweet-worker' ORDER BY timestamp DESC LIMIT 50;
   ```

## Continuous Deployment

Railway supports continuous deployment from GitHub. To set this up:

1. Go to the Railway dashboard
2. Navigate to your project
3. Go to Settings > Deployments
4. Connect to your GitHub repository
5. Configure the deployment settings

Now, whenever you push to your GitHub repository, Railway will automatically deploy your changes.

## Troubleshooting

- **Database Connection Issues**: Make sure your application can connect to the database using the `DATABASE_URL` environment variable.
- **Deployment Failures**: Check the build logs to see what went wrong during deployment.
- **Application Crashes**: Check the application logs for error messages.

## Useful Railway Commands

```bash
railway status        # Check the status of your project
railway open          # Open the project dashboard in your browser
railway logs          # View your application logs
railway ps            # List running services
railway down          # Tear down your deployment
railway run           # Run a command in your application's environment
``` 