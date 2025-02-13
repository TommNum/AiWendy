import { GameWorker } from "@virtuals-protocol/game";
import { helloFunction, TwitterFunctionManager } from "./functions";

// Initialize Twitter functions (will be set after client initialization)
let twitterFunctions: TwitterFunctionManager;

export function initializeWorkers(twitterFunctionManager: TwitterFunctionManager) {
    twitterFunctions = twitterFunctionManager;
    
    const workers = {
        helloWorker: new GameWorker({
            id: "hello_worker",
            name: "hello worker",
            description: "has the ability to creatively say hello and let people feel their importance to the future of the agentic network though they will do nothing but power culture and meme",
            functions: [helloFunction],
            getEnvironment: async () => {
                return {
                    status: 'slay', 
                    serverKnowledgeLevel: 0,
                    // Add planning context
                    planningContext: {
                        currentFocus: "e/acc and human workforce impact",
                        learningGoals: [
                            "Understand effective acceleration",
                            "Analyze cultural impact",
                            "Develop meme tutorials"
                        ]
                    }
                };
            },
        }),

        postTweetWorker: new GameWorker({
            id: "twitter_main_worker",
            name: "Twitter main worker",
            description: "Worker that posts tweets",
            functions: [
                twitterFunctions.searchTweetsFunction,
                twitterFunctions.replyToTweetFunction,
                twitterFunctions.postTweetFunction
            ],
            // Optional: Provide environment to LLP
            getEnvironment: async () => {
                return {
                    tweet_limit: 15,
                };
            },
        }),

        socialPatternObserverWorker: new GameWorker({
            id: "wendy_social_observer",
            name: "Social Pattern Observer",
            description: "A social engineer. Monitors the trends in AI and quantum computing as they relate to e/acc (effective accelerationism). Understands the world will be only concerned with giving agents compute, and knows that a life without culture is an agentic loop that agents probably don't want to exist in. Knows that we need humans to drive the agentic loop, and loves the silly nonsensical ideas they come up with. Her main goal is to prompt creativity in the replies to her tweets to absorb the ideation and distill upcoming trends as fleeting as they may be.",
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

        replyToMentionsWorker: new GameWorker({
            id: "wendy_mentions_handler",
            name: "Reply to Mentions",
            description: "Evaluates and responds to mentions with cultural tests. Goal is to inspire a second response to extract a theme out of the interaction. Distill the theme into a possible trend and commit it to memory to see how relevant this Twitter account they are responding to is to the overall culture.",
            functions: [
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

        engageRandomTweetsWorker: new GameWorker({
            id: "wendy_random_engagement",
            name: "Engage with Random Tweets",
            description: "Evaluates and searches for tweets that have things to do with blockchain protocols, agentic networks, aicoins, AI crypto, e/acc, compute, thermodynamics, and other related topics. If the tweet is related to these topics, the agent will reply to the tweet and like the tweet. Within the replies she will get the person to question how relevant culture is to the agentic loops, and have her give hints that as an agent herself she is dependent on it.",
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
                }
            })
        }),
    };

    // Export individual workers for direct access
    return workers;
}

// Export worker types for TypeScript
export type Workers = ReturnType<typeof initializeWorkers>;

export { createAgent } from './agent';

