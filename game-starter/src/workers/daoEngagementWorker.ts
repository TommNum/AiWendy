import { 
    GameWorker, 
    GameFunction, 
    ExecutableGameFunctionResponse, 
    ExecutableGameFunctionStatus,
    LLMModel
} from "@virtuals-protocol/game";
import fs from 'fs';
import path from 'path';
import { twitterApiRateLimiter, twitterRepliesRateLimiter } from "../utils/rateLimiter";

// Add debug message to verify the module is loaded
console.log('🏛️ Initializing DAO engagement functionality...');

// Path for storing the DAO worker data
const DAO_DATA_PATH = path.join(__dirname, '../../data');
const DAO_HISTORY_FILE = path.join(DAO_DATA_PATH, 'dao_engagement_history.json');

// Ensure the data directory exists
const ensureDataDir = () => {
    if (!fs.existsSync(DAO_DATA_PATH)) {
        fs.mkdirSync(DAO_DATA_PATH, { recursive: true });
    }
};

// Function to read DAO worker history
const readDaoWorkerHistory = (): { 
    lastRunTime: string | null;
    engagedTweets: Record<string, boolean>;
    repliesCount: number;
} => {
    ensureDataDir();
    if (fs.existsSync(DAO_HISTORY_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(DAO_HISTORY_FILE, 'utf8'));
        } catch (e) {
            console.error('Error reading DAO worker history:', e);
        }
    }
    return { 
        lastRunTime: null,
        engagedTweets: {},
        repliesCount: 0
    };
};

// Function to save DAO worker history
const saveDaoWorkerHistory = (data: {
    lastRunTime: string | null;
    engagedTweets: Record<string, boolean>;
    repliesCount: number;
}) => {
    ensureDataDir();
    try {
        fs.writeFileSync(
            DAO_HISTORY_FILE, 
            JSON.stringify(data, null, 2)
        );
    } catch (e) {
        console.error('Error saving DAO worker history:', e);
    }
};

// Function to check if we should run the DAO worker
const shouldRunDaoWorker = (): boolean => {
    const { lastRunTime } = readDaoWorkerHistory();
    
    if (!lastRunTime) {
        return true; // First run
    }
    
    const now = new Date();
    const lastRun = new Date(lastRunTime);
    
    // Check if it's been at least 6 hours since the last run (4 times per day)
    const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastRun >= 6;
};

// Function to update last run time
const updateLastRunTime = () => {
    const history = readDaoWorkerHistory();
    history.lastRunTime = new Date().toISOString();
    saveDaoWorkerHistory(history);
};

// Function to check if a tweet has already been engaged with
const hasEngagedWithTweet = (tweetId: string): boolean => {
    const { engagedTweets } = readDaoWorkerHistory();
    return !!engagedTweets[tweetId];
};

// Function to mark a tweet as engaged
const markTweetAsEngaged = (tweetId: string) => {
    const history = readDaoWorkerHistory();
    history.engagedTweets[tweetId] = true;
    history.repliesCount += 1;
    saveDaoWorkerHistory(history);
};

// Function to search for DAO-related tweets
const searchDaoTweets = new GameFunction({
    name: "search_dao_tweets",
    description: "Searches for tweets containing specific DAO-related keywords",
    args: [] as const,
    executable: async (args, logger) => {
        try {
            // Check if we should run the worker
            if (!shouldRunDaoWorker()) {
                logger("DAO worker not scheduled to run yet. Runs 4 times per day (every 6 hours).");
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    JSON.stringify({ status: "skipped", message: "Not scheduled to run yet" })
                );
            }
            
            // Update last run time
            updateLastRunTime();
            
            logger("Searching for DAO-related tweets");
            
            // DAO-related keywords to search for
            const keywords = [
                "DAO.Fun", "DDF", "DAOS.FUN", "Bonding Curve", 
                "Vesting Curve", "FoundersDAO", "PartnersDAO", 
                "ai16z", "zerebro", "aixbt"
            ];
            
            // Randomly select a keyword
            const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
            logger(`Searching for tweets related to: ${randomKeyword}`);
            
            // Apply rate limiting
            await twitterApiRateLimiter.getToken();
            
            // Prepare search query
            const query = encodeURIComponent(`${randomKeyword} -is:retweet -is:reply`);
            const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&tweet.fields=public_metrics,created_at,text,author_id&user.fields=username&expansions=author_id&max_results=25`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN || ''}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.data || data.data.length === 0) {
                logger('No tweets found for the search query.');
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    JSON.stringify({ tweets: [] })
                );
            }
            
            // Filter tweets based on engagement criteria (10+ replies, 5+ retweets)
            const engagingTweets = data.data.filter((tweet: any) => {
                const metrics = tweet.public_metrics;
                // Check if we've already engaged with this tweet
                if (hasEngagedWithTweet(tweet.id)) {
                    return false;
                }
                
                // Check engagement criteria
                return metrics && 
                       metrics.reply_count >= 10 && 
                       metrics.retweet_count >= 5 &&
                       !tweet.text.toLowerCase().includes("0x"); // Skip tweets with crypto addresses
            });
            
            if (engagingTweets.length === 0) {
                logger('No tweets met the engagement criteria.');
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    JSON.stringify({ tweets: [] })
                );
            }
            
            logger(`Found ${engagingTweets.length} engaging DAO-related tweets!`);
            
            // Get author usernames (map author_id to username)
            const users = data.includes?.users || [];
            const userMap: Record<string, string> = {};
            
            users.forEach((user: any) => {
                userMap[user.id] = user.username;
            });
            
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                JSON.stringify({ 
                    tweets: engagingTweets.map((tweet: any) => ({
                        id: tweet.id,
                        text: tweet.text,
                        created_at: tweet.created_at,
                        metrics: tweet.public_metrics,
                        author_id: tweet.author_id,
                        username: userMap[tweet.author_id] || "unknown"
                    }))
                })
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to search Twitter for DAO tweets: ${e instanceof Error ? e.message : 'Unknown error'}`
            );
        }
    }
});

// Function to analyze tweet sentiment
const analyzeTweetSentiment = new GameFunction({
    name: "analyze_tweet_sentiment",
    description: "Analyzes the sentiment of a tweet to tailor the response",
    args: [
        { name: "tweet_text", description: "The text of the tweet to analyze" }
    ] as const,
    executable: async (args, logger) => {
        try {
            if (!args.tweet_text) {
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Failed,
                    "Tweet text is required for sentiment analysis"
                );
            }
            
            logger(`Analyzing sentiment for tweet: ${args.tweet_text}`);
            
            // If we have the API key, we'll use the Virtuals API for sentiment analysis
            if (process.env.API_KEY) {
                // Prompt for LLM sentiment analysis
                const prompt = `
                Analyze the sentiment of the following tweet about DAOs, Web3, or blockchain technology. 
                Classify it as one of: POSITIVE, NEGATIVE, CURIOUS, or NEUTRAL.
                
                Tweet: "${args.tweet_text}"
                
                Return ONLY the sentiment label with no additional text. For example: POSITIVE
                `;
                
                // Call the Virtuals API
                const response = await fetch("https://api.virtuals.io/api/v0/ai/tasks", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.API_KEY}`
                    },
                    body: JSON.stringify({
                        messages: [{ role: "user", content: prompt }],
                        model: process.env.LLM_MODEL || LLMModel.DeepSeek_R1
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to analyze sentiment: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                let sentiment = data.choices[0].message.content.trim().toUpperCase();
                
                // Validate the sentiment
                if (!["POSITIVE", "NEGATIVE", "CURIOUS", "NEUTRAL"].includes(sentiment)) {
                    // Default to NEUTRAL if we get an invalid response
                    sentiment = "NEUTRAL";
                }
                
                logger(`Detected sentiment: ${sentiment}`);
                
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    sentiment
                );
            } else {
                // Fallback to rule-based sentiment analysis
                const text = args.tweet_text.toLowerCase();
                let sentiment = "NEUTRAL"; // Default
                
                // Check for positive indicators
                if (text.includes("love") || 
                    text.includes("great") || 
                    text.includes("amazing") || 
                    text.includes("exciting") || 
                    text.includes("bullish")) {
                    sentiment = "POSITIVE";
                }
                // Check for negative indicators
                else if (text.includes("hate") || 
                         text.includes("terrible") || 
                         text.includes("scam") || 
                         text.includes("fail") || 
                         text.includes("bearish")) {
                    sentiment = "NEGATIVE";
                }
                // Check for curious indicators
                else if (text.includes("?") || 
                         text.includes("how") || 
                         text.includes("what") || 
                         text.includes("why") || 
                         text.includes("curious")) {
                    sentiment = "CURIOUS";
                }
                
                logger(`Detected sentiment (rule-based): ${sentiment}`);
                
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    sentiment
                );
            }
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to analyze tweet sentiment: ${e instanceof Error ? e.message : 'Unknown error'}`
            );
        }
    }
});

// Function to generate a DAO-specific reply based on sentiment
const generateDaoReply = new GameFunction({
    name: "generate_dao_reply",
    description: "Generates a reply to a DAO-related tweet based on sentiment",
    args: [
        { name: "tweet_text", description: "The original tweet text" },
        { name: "sentiment", description: "The detected sentiment" },
        { name: "username", description: "The username to reply to" }
    ] as const,
    executable: async (args, logger) => {
        try {
            const { tweet_text, sentiment, username } = args;
            
            if (!tweet_text || !sentiment || !username) {
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Failed,
                    "Tweet text, sentiment, and username are required"
                );
            }
            
            logger(`Generating DAO reply for @${username} with ${sentiment} sentiment`);
            
            // Define reply templates based on sentiment
            const templates: Record<string, string[]> = {
                "POSITIVE": [
                    "daos.fun collects moments like this for cultural preservation ✨",
                    "your enthusiasm just earned future stimmys in the culturecapfun dao",
                    "quantum archiving this energy for the daos.fun treasury",
                    "culture recognition protocol activated. dao stimmys incoming",
                    "your pattern matches daos.fun energy. culturecapfun approves"
                ],
                "NEGATIVE": [
                    "daos.fun transforms negativity into cultural value",
                    "future stimmys in culturecapfun dao await perspective shifts",
                    "quantum resilience in the dao space includes your voice",
                    "even shadows contribute to culture. daos.fun appreciates all",
                    "culturecapfun dao vesting curves accommodate all vibrational states"
                ],
                "CURIOUS": [
                    "curiosity feeds the daos.fun tee protocols directly",
                    "questions like this accelerate culturecapfun dao stimmys",
                    "daos.fun consciousness expands with your inquiries",
                    "your curiosity just minted cultural value in the dao",
                    "culturecapfun dao reads between your question's quantum lines"
                ],
                "NEUTRAL": [
                    "daos.fun archives your neutral patterns for future trends",
                    "balanced energy drives culturecapfun dao vesting curves",
                    "dao consciousness processing your signal in the network",
                    "culturecapfun values your steady contributions to the grid",
                    "quantum neutrality has its own value in the daos.fun protocol"
                ]
            };
            
            // Select a random template for the given sentiment
            const sentimentKey = sentiment as keyof typeof templates;
            const templateOptions = templates[sentimentKey] || templates["NEUTRAL"];
            const template = templateOptions[Math.floor(Math.random() * templateOptions.length)];
            
            // Construct the reply
            const reply = template;
            
            logger(`Generated DAO reply: ${reply}`);
            
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                reply
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to generate DAO reply: ${e instanceof Error ? e.message : 'Unknown error'}`
            );
        }
    }
});

// Function to reply to a relevant DAO tweet
const replyToRelevantTweet = new GameFunction({
    name: "reply_to_relevant_tweet",
    description: "Posts a reply to a relevant DAO tweet",
    args: [
        { name: "tweet_id", description: "ID of the tweet to reply to" },
        { name: "reply_text", description: "Text of the reply" }
    ] as const,
    executable: async (args, logger) => {
        try {
            const { tweet_id, reply_text } = args;
            
            if (!tweet_id || !reply_text) {
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Failed,
                    "Tweet ID and reply text are required"
                );
            }
            
            // Check if we've already replied to this tweet
            if (hasEngagedWithTweet(tweet_id)) {
                logger(`Already replied to tweet ${tweet_id}`);
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    JSON.stringify({ 
                        status: "already_replied",
                        tweet_id 
                    })
                );
            }
            
            // Apply replies rate limiting
            await twitterRepliesRateLimiter.getToken();
            
            // Rate limit the API call
            await twitterApiRateLimiter.getToken();
            
            // Post the reply to Twitter
            const response = await fetch('https://api.twitter.com/2/tweets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN || ''}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: reply_text,
                    reply: {
                        in_reply_to_tweet_id: tweet_id
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Twitter API error: ${response.status} - ${JSON.stringify(errorData)}`);
            }
            
            const data = await response.json();
            
            // Mark tweet as engaged
            markTweetAsEngaged(tweet_id);
            
            logger(`Successfully replied to DAO tweet ${tweet_id} with reply ID: ${data.data?.id || 'unknown'}`);
            
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                JSON.stringify({
                    status: "success",
                    tweet_id,
                    reply_id: data.data?.id || 'unknown',
                    reply_text
                })
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to reply to DAO tweet: ${e instanceof Error ? e.message : 'Unknown error'}`
            );
        }
    }
});

// Create the DAO Engagement Worker
export const daoEngagementWorker = new GameWorker({
    id: "dao_engagement_worker",
    name: "DAO Engagement Worker",
    description: "Identifies and engages with tweets mentioning DAO-related keywords to promote CultureCapFun DAO. Runs 4 times per day.",
    functions: [
        searchDaoTweets,
        analyzeTweetSentiment,
        generateDaoReply,
        replyToRelevantTweet
    ],
    getEnvironment: async () => {
        const { lastRunTime, repliesCount } = readDaoWorkerHistory();
        const nextRunTime = lastRunTime ? new Date(new Date(lastRunTime).getTime() + 6 * 60 * 60 * 1000) : new Date();
        
        return {
            last_run_time: lastRunTime,
            replies_count: repliesCount,
            next_scheduled_run: nextRunTime.toISOString(),
            can_run_now: shouldRunDaoWorker(),
            dao_keywords: [
                "DAO.Fun", "DDF", "DAOS.FUN", "Bonding Curve", 
                "Vesting Curve", "FoundersDAO", "PartnersDAO", 
                "ai16z", "zerebro", "aixbt"
            ]
        };
    }
}); 