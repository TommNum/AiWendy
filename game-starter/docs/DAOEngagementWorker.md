# DAO Engagement Worker

## Overview

The DAO Engagement Worker is a specialized component of the Wendy AI system that identifies and engages with tweets related to DAOs (Decentralized Autonomous Organizations), specifically promoting the CultureCapFun DAO. This worker runs 4 times per day (every 6 hours) to find relevant tweets, analyze their sentiment, and respond in Wendy's distinctive voice.

## Core Functionality

1. **Scheduled Operation**: Runs every 6 hours (4 times per day) to maintain a steady but not overwhelming presence
2. **DAO-Related Tweet Search**: Searches for tweets containing specific DAO-related keywords
3. **Engagement Criteria**: Only engages with tweets that have:
   - 10+ replies
   - 5+ retweets
   - No cryptocurrency addresses (to avoid crypto scams)
4. **Sentiment Analysis**: Analyzes tweet sentiment as:
   - Positive
   - Negative
   - Curious
   - Neutral
5. **Customized Responses**: Generates responses tailored to the detected sentiment
6. **Rate Limiting**: Respects Twitter API rate limits and the overall reply quotas set for Wendy

## Key Components

### Search Function
- Searches for tweets containing DAO-related keywords
- Filters tweets based on engagement criteria
- Tracks previously engaged tweets to avoid duplicates

### Sentiment Analysis Function
- Uses either API-based or rule-based sentiment analysis
- Classifies tweets into one of four sentiment categories

### Reply Generation Function
- Creates responses based on tweet sentiment
- Maintains Wendy's distinctive voice and style
- Incorporates references to DAOs.fun and CultureCapFun

### Reply Posting Function
- Posts replies to qualified tweets
- Handles rate limiting and error handling
- Tracks successful interactions

## DAO Keywords

The worker specifically searches for tweets containing these keywords:
- DAO.Fun
- DDF
- DAOS.FUN
- Bonding Curve
- Vesting Curve
- FoundersDAO
- PartnersDAO
- ai16z
- zerebro
- aixbt

## Configuration

The worker maintains a history file at `data/dao_engagement_history.json` to track:
- Last run time
- Previously engaged tweets
- Reply counts

## Integration

The worker is integrated directly into the agent system in `agent.ts` and is scheduled to run in `index.ts`. 