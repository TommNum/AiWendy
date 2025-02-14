import { GameWorker, GameFunction, ExecutableGameFunctionResponse, ExecutableGameFunctionStatus, GameAgent } from "@virtuals-protocol/game";
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
    getDmEventsFunction: GameFunction<any>;
    sendDmReplyFunction: GameFunction<any>;
    getDmConversationFunction: GameFunction<any>;
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
    conversationLimits: {
        maxRepliesPerSession: number;
        cooldownPeriodHours: number;
    };
    interviewTopics: string[];
    conversationState: Map<string, {
        replyCount: number;
        lastInteractionTime: number | null;
        onCooldown: boolean;
        currentTopic: string;
    }>;
    activeConversations: Set<string>;
    responseTemplates: {
        initial: string;
        followUp: string;
        technical: string;
        cultural: string;
        closing: string;
        error?: string;
    };
}

// Add interface for search parameters
interface SearchParams {
    [key: string]: string | number; // Add index signature
    query: string;
    max_results: string;
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
                    // Create search params with proper typing
                    const searchParams: SearchParams = {
                        query: "blockchain OR AI -is:retweet lang:en",
                        max_results: "10",
                        // Add any additional search parameters as needed
                    };

                    const searchResult = await functions.searchTweetsFunction.executable(
                        searchParams as Record<string, string>, // Cast to match expected type
                        (message: string) => {
                            console.log(`🔍 Search Operation: ${message}`);
                        }
                    );

                    console.log(`Search result status: ${searchResult.status}`);
                    console.log(`Search result feedback: ${searchResult.feedback}`);

                    if (searchResult.status === ExecutableGameFunctionStatus.Done && searchResult.feedback) {
                        try {
                            const feedbackParts = searchResult.feedback.split('Tweets found:\n');
                            if (feedbackParts.length < 2) {
                                throw new Error('Invalid search response format');
                            }

                            const tweets = JSON.parse(feedbackParts[1]) as Tweet[];
                            console.log(`Found ${tweets.length} tweets to process`);

                            const engageableTweets = tweets.filter((tweet: Tweet) => 
                                tweet.likes >= environment.minLikesForEngagement &&
                                !tweet.content.startsWith('RT ')
                            );

                            console.log(`Found ${engageableTweets.length} engageable tweets`);

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
                        } catch (error: unknown) {
                            console.error('Error parsing search results:', error);
                            const parseErrorMessage = error instanceof Error ? error.message : 'Unknown parse error';
                            return new ExecutableGameFunctionResponse(
                                ExecutableGameFunctionStatus.Failed,
                                `Failed to parse search results: ${parseErrorMessage}`
                            );
                        }
                    } else {
                        console.error('Search failed or returned no results');
                        return new ExecutableGameFunctionResponse(
                            ExecutableGameFunctionStatus.Failed,
                            `Search failed: ${searchResult.feedback}`
                        );
                    }

                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Done,
                        "Engagement cycle completed"
                    );

                } catch (error: unknown) {
                    console.error('Error in engagement worker:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Failed,
                        `Engagement failed: ${errorMessage}`
                    );
                }
            }
        }),

        dmManagerWorker: createExtendedWorker({
            id: "dm_manager_worker",
            name: "DM Interview Manager",
            description: "Manages DM conversations to interview individuals",
            functions: [
                twitterFunctions.getDmEventsFunction,
                twitterFunctions.sendDmReplyFunction,
            ],
            executable: async (
                args: Record<string, unknown>,
                environment: ExecutableEnvironment,
                functions: WorkerFunctions,
                agent?: GameAgent
            ): Promise<ExecutableGameFunctionResponse> => {
                try {
                    const dmEvents = await functions.getDmEventsFunction.executable({}, console.log);
                    
                    if (dmEvents.status === ExecutableGameFunctionStatus.Failed) {
                        return dmEvents;
                    }

                    const conversations = JSON.parse(dmEvents.feedback);
                    
                    for (const conversation of conversations) {
                        const conversationId = conversation.id;
                        const state = environment.conversationState.get(conversationId) || {
                            replyCount: 0,
                            lastInteractionTime: Date.now(),
                            onCooldown: false,
                            currentTopic: environment.interviewTopics[0]
                        };

                        if (state.onCooldown && state.lastInteractionTime) {
                            const hoursSinceLastInteraction = (Date.now() - state.lastInteractionTime) / (1000 * 60 * 60);
                            if (hoursSinceLastInteraction < environment.conversationLimits.cooldownPeriodHours) {
                                continue;
                            }
                            state.onCooldown = false;
                        }

                        if (state.replyCount >= environment.conversationLimits.maxRepliesPerSession) {
                            await functions.sendDmReplyFunction.executable({
                                conversation_id: conversationId,
                                message: environment.responseTemplates.closing
                            }, console.log);
                            
                            state.onCooldown = true;
                            state.lastInteractionTime = Date.now();
                            environment.conversationState.set(conversationId, state);
                            continue;
                        }

                        let reply = environment.responseTemplates.initial;
                        if (agent) {
                            try {
                                // Just use step with verbose flag
                                const response = await agent.step({ verbose: true });
                                reply = typeof response === 'string' ? response : environment.responseTemplates.initial;
                            } catch (agentError) {
                                console.error('Error generating agent response:', agentError);
                                reply = environment.responseTemplates.error || "I apologize, but I need to take a moment to process. I'll get back to you soon.";
                            }
                        }

                        await functions.sendDmReplyFunction.executable({
                            conversation_id: conversationId,
                            message: reply
                        }, console.log);

                        state.replyCount++;
                        state.lastInteractionTime = Date.now();
                        state.currentTopic = environment.interviewTopics[state.replyCount % environment.interviewTopics.length];
                        environment.conversationState.set(conversationId, state);
                    }

                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Done,
                        "DM conversations processed successfully"
                    );

                } catch (error) {
                    console.error('Error in DM manager:', error);
                    return new ExecutableGameFunctionResponse(
                        ExecutableGameFunctionStatus.Failed,
                        `DM management failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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

