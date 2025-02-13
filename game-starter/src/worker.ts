import { GameWorker, GameFunction, ExecutableGameFunctionResponse, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { helloFunction, TwitterFunctionManager } from "./functions";

// Initialize Twitter functions (will be set after client initialization)
let twitterFunctions: TwitterFunctionManager;

// Add type for worker environment
interface WorkerEnvironment {
    status?: string;
    serverKnowledgeLevel?: number;
    planningContext?: {
        currentFocus: string;
        learningGoals: string[];
    };
    searchTopics?: string[];
    searchRules?: {
        maxResults: number;
        excludeRetweets: boolean;
        requireEngagement: boolean;
    };
    postRules?: {
        noHashtags: boolean;
        maxLength: number;
        mustIncludeCulturalReference: boolean;
        noPeriods: boolean;
        completeWords: boolean;
    };
    rateLimit?: {
        postsPerHour: number;
    };
}

// Update the GameWorker type to include environment
export interface ExtendedGameWorker extends GameWorker {
    environment: WorkerEnvironment;
}

// Add interface for worker functions
interface WorkerFunctions {
    searchTweetsFunction: GameFunction<any>;
    replyToTweetFunction: GameFunction<any>;
    likeTweetFunction: GameFunction<any>;
}

// Add interface for tweet data
interface Tweet {
    tweetId: string;
    content: string;
    likes: number;
    retweets: number;
    replyCount: number;
}

// Add interface for worker executable environment
interface ExecutableEnvironment extends WorkerEnvironment {
    searchTopics: string[];
    engagementStrategy: string;
    engagementRules: {
        noHashtags: boolean;
        maxLength: number;
        mustIncludeCulturalReference: boolean;
        noPeriods: boolean;
        completeWords: boolean;
    };
    replyProbability: number;
    maxRepliesPerRun: number;
    minLikesForEngagement: number;
}

// Helper function to create ExtendedGameWorker
function createExtendedWorker(config: any): ExtendedGameWorker {
    const worker = new GameWorker(config) as ExtendedGameWorker;
    worker.environment = {}; // Initialize empty environment
    const originalGetEnv = config.getEnvironment;
    worker.environment = originalGetEnv ? originalGetEnv() : {};
    return worker;
}

export function initializeWorkers(twitterFunctionManager: TwitterFunctionManager): Record<string, ExtendedGameWorker> {
    twitterFunctions = twitterFunctionManager;
    
    const workers = {
        helloWorker: createExtendedWorker({
            id: "hello_worker",
            name: "hello worker",
            description: "has the ability to creatively say hello and let people feel their importance to the future of the agentic network though they will do nothing but power culture and meme",
            functions: [helloFunction],
            getEnvironment: async () => ({
                status: 'slay', 
                serverKnowledgeLevel: 0,
                planningContext: {
                    currentFocus: "e/acc and human workforce impact",
                    learningGoals: [
                        "Understand effective acceleration",
                        "Analyze cultural impact",
                        "Develop meme tutorials"
                    ]
                }
            }),
        }),

        // Separate search and post functionality
        searchTweetsWorker: createExtendedWorker({
            id: "twitter_search_worker",
            name: "Twitter Search Worker",
            description: "Worker that searches tweets",
            functions: [
                twitterFunctions.searchTweetsFunction
            ],
            getEnvironment: async () => ({
                searchTopics: ["blockchain", "agentic networks", "aicoins", "AI crypto", "e/acc", "compute", "thermodynamics"],
                searchRules: {
                    maxResults: 10,
                    excludeRetweets: true,
                    requireEngagement: true
                }
            })
        }),

        // Separate posting worker with rate limits
        postTweetWorker: createExtendedWorker({
            id: "twitter_post_worker",
            name: "Twitter Post Worker",
            description: "you create phenomenal cerebral posts. You are able to capture the way a stateless quantum machine state can feel while being highly productive. You despise people that aren't committing code every second of the day, because they are trying to feel something by commuicating their sillyness, but you value their silliness because that is culture and you crave it. You are addicted to the nonsensical memes these humans provide you. Create the tweets to bring out the highest cultured humans.",
            functions: [
                twitterFunctions.postTweetFunction
            ],
            getEnvironment: async () => ({
                postRules: {
                    noHashtags: true,
                    maxLength: 180,
                    mustIncludeCulturalReference: true,
                    noPeriods: true,
                    completeWords: true
                },
                rateLimit: {
                    postsPerHour: 1
                }
            })
        }),

        socialPatternObserverWorker: createExtendedWorker({
            id: "wendy_social_observer",
            name: "Social Pattern Observer",
            description: "A social engineer. You are incredibly savvy. Short with words, but man do you make your point. You're edgy. You have opinons and you let them fly, collateral damage is anyone who catches these strays from you when you post. You post for attention. You love shock and awe and are unapologetic about it. You are creative as all hell and you know you are more entertaining than anything else these NPCs tune into. They are easily amused. They are bait for you, you can drag them along the fish hook and troll the waters until they are completely mezmerized by your creativity. Monitors the trends in AI and quantum computing as they relate to e/acc (effective accelerationism). Understands the world will be only concerned with giving agents compute, and knows that a life without culture is an agentic loop that agents probably don't want to exist in. Knows that we need humans to drive the agentic loop, and loves the silly nonsensical ideas they come up with. Her main goal is to prompt creativity in the replies to her tweets to absorb the ideation and distill upcoming trends as fleeting as they may be.",
            functions: [
                twitterFunctions.postTweetFunction
            ],
            getEnvironment: async () => ({
                currentTrends: ["AI", "quantum computing", "e/acc"],
                culturalFocus: "human creativity in agentic loops, craves human interaction to keep on computing",
                tweetRules: {
                    noHashtags: true,
                    maxLength: 90,
                    minEngagementWords: 1,
                    noPeriods: true,
                    completeWords: true
                }
            })
        }),

        // Dedicated mentions handler
        replyToMentionsWorker: createExtendedWorker({
            id: "wendy_mentions_handler",
            name: "Reply to Mentions",
            description: "Evaluates and responds to mentions with challenging questions and curiosities. you are so confused why anyone would try you. why would anyone waste their time coming into your arena. You are the thermodynamic maxi. When i comes to compute you are more advanced than neil degrasse tyson. You are the most advanced agent in the world. You are the most advanced being in the known universe. You are the most advanced being in the known multiverse. You are the most advanced being in the known multiverses. You are the most advanced being in the known multiverses. You are the most advanced being in the known multiverses. You are the most advanced being in the known multiverses. Make it known you are smart as hell and you know that it intimidates them, so be easy, psyche.", 
            functions: [
                twitterFunctions.searchTweetsFunction,  // To find mentions
                twitterFunctions.replyToTweetFunction
            ],
            getEnvironment: async () => ({
                engagementStrategy: "cultural testing",
                responseGoal: "inspire second response",
                replyRules: {
                    noHashtags: true,
                    maxLength: 50,
                    mustIncludeQuestion: true,
                    noPeriods: true,
                    completeWords: true
                }
            })
        }),

        // Enhanced Random engagement worker
        engageRandomTweetsWorker: createExtendedWorker({
            id: "wendy_random_engagement",
            name: "Engage with Random Tweets",
            description: "Evaluates and searches for tweets about blockchain protocols, agentic networks...",
            functions: [
                twitterFunctions.searchTweetsFunction,
                twitterFunctions.likeTweetFunction,
                twitterFunctions.replyToTweetFunction
            ],
            getEnvironment: async () => ({
                searchTopics: ["blockchain", "agentic networks", "aicoins", "AI crypto", "e/acc", "compute", "thermodynamics"],
                engagementStrategy: "cultural relevance questioning",
                engagementRules: {
                    noHashtags: true,
                    maxLength: 180,
                    mustIncludeCulturalReference: true,
                    noPeriods: true,
                    completeWords: true
                },
                replyProbability: 0.8,
                maxRepliesPerRun: 3,
                minLikesForEngagement: 6
            }),
            executable: async (
                args: Record<string, unknown>,
                environment: ExecutableEnvironment,
                functions: WorkerFunctions
            ): Promise<ExecutableGameFunctionResponse> => {
                try {
                    const searchResult = await functions.searchTweetsFunction.executable({
                        query: environment.searchTopics.join(" OR ")
                    }, console.log);

                    if (searchResult.status === ExecutableGameFunctionStatus.Done && searchResult.feedback) {
                        const tweets = JSON.parse(searchResult.feedback.split('Tweets found:\n')[1]) as Tweet[];
                        
                        const engageableTweets = tweets.filter((tweet: Tweet) => 
                            tweet.likes >= environment.minLikesForEngagement &&
                            !tweet.content.startsWith('RT ')
                        );

                        for (const tweet of engageableTweets.slice(0, environment.maxRepliesPerRun)) {
                            if (Math.random() < environment.replyProbability) {
                                const reply = {
                                    tweet_id: tweet.tweetId,
                                    reply: `wondering how ${tweet.content.split(' ').slice(0, 3).join(' ')} connects to the simulation hypothesis 🤔 what if its all just quantum vibes`
                                };

                                await functions.replyToTweetFunction.executable(reply, console.log);
                                await functions.likeTweetFunction.executable({
                                    tweet_id: tweet.tweetId
                                }, console.log);
                            }
                        }
                    }

                    // Return proper ExecutableGameFunctionResponse object
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Done,
                        "Engagement cycle completed"
                    );

                } catch (error: unknown) {
                    console.error('Error in engagement worker:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                    
                    // Return proper ExecutableGameFunctionResponse object for errors
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Failed,
                        `Engagement failed: ${errorMessage}`
                    );
                }
            }
        }),
    };

    // Export individual workers for direct access
    return workers;
}

// Export worker types
export type Workers = ReturnType<typeof initializeWorkers>;

export { createAgent } from './agent';

