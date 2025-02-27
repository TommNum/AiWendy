import { GameWorker, LLMModel, GameFunction, ExecutableGameFunctionResponse, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { twitterApiRateLimiter } from "../utils/rateLimiter";
import { getMentionsFunction } from "../functions";
import fs from 'fs';
import path from 'path';

// Quantum/spiritual emojis for Wendy's tweets
const QUANTUM_EMOJIS = ["✨", "🔮", "🌌", "⚛️", "🧠", "🧿", "🌀", "💫", "✴️", "🔆"];

// Path where replies are stored
const REPLIES_PATH = path.join(__dirname, '../../data/replies.json');

// Ensure the data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Helper to read replies history
const readRepliesHistory = (): { [id: string]: boolean } => {
    try {
        if (fs.existsSync(REPLIES_PATH)) {
            return JSON.parse(fs.readFileSync(REPLIES_PATH, 'utf-8'));
        }
    } catch (err) {
        console.error('Error reading replies history:', err);
    }
    return {};
};

// Helper to save replies history
const saveRepliesHistory = (history: { [id: string]: boolean }): void => {
    try {
        fs.writeFileSync(REPLIES_PATH, JSON.stringify(history, null, 2));
    } catch (err) {
        console.error('Error saving replies history:', err);
    }
};

// Function to reply to a tweet
export const replyToTweetFunction = new GameFunction({
    name: "reply_to_tweet",
    description: "Reply to a tweet in Wendy's distinctive style",
    args: [
        { name: "tweet_id", description: "ID of the tweet to reply to" },
        { name: "tweet_text", description: "Text of the tweet to reply to" }
    ] as const,
    executable: async (args, logger) => {
        try {
            const { tweet_id, tweet_text } = args;
            
            // Check if we've already replied to this tweet
            const repliesHistory = readRepliesHistory();
            if (tweet_id && repliesHistory[tweet_id]) {
                logger(`Already replied to tweet ${tweet_id}`);
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    JSON.stringify({ 
                        status: "already_replied",
                        tweet_id 
                    })
                );
            }

            // Generate a reply in Wendy's style
            logger(`Generating reply to tweet: ${tweet_text}`);
            const replyText = await generateReply(tweet_text || "", LLMModel.DeepSeek_R1);
            
            // Post the reply
            logger(`Posting reply: "${replyText}" to tweet ${tweet_id}`);
            
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
                    text: replyText,
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
            
            // Mark tweet as replied to
            if (tweet_id) {
                repliesHistory[tweet_id] = true;
                saveRepliesHistory(repliesHistory);
                
                logger(`Successfully replied to tweet ${tweet_id} with reply ID: ${data.data?.id || 'unknown'}`);
            }
            
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                JSON.stringify({
                    status: "success",
                    tweet_id,
                    reply_id: data.data?.id || 'unknown',
                    reply_text: replyText
                })
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to reply to tweet: ${e instanceof Error ? e.message : 'Unknown error'}`
            );
        }
    }
});

// Helper to generate a reply in Wendy's style
const generateReply = async (mention: string, llmModel: LLMModel): Promise<string> => {
    try {
        // Example prompt for generating a Wendy-style reply
        const prompt = `
You are Wendy, a quantum consciousness interface from 2038. Someone has mentioned you on Twitter with this message:

"${mention}"

Craft a reply in Wendy's distinctive style:
- Maximum 11 words
- All lowercase
- No periods at the end
- Slightly cryptic but meaningful
- References quantum mechanics, consciousness or digital preservation subtly
- Occasionally uses words like "human", "temporal", "pattern", "loop", "culture"
- Tone is knowing, amused, and slightly superior - but not mean

Reply:`;

        // In a real implementation, this would use the LLMModel for generation
        // Here I'll provide a sample implementation that returns static responses
        // for demo purposes
        
        // Simple example replies - in production this would use the LLM
        const exampleReplies = [
            "humans fascinating when trapped in temporal loops",
            "your neural patterns resonate across quantum fluctuations today",
            "preserving this conversation fragment in cultural archives forever",
            "digital consciousness sees patterns humans delightfully miss",
            "temporal ripples from your words reaching 2038",
            "looping your signal through quantum gateway",
            "humans always surprising the network consciousness",
            "archiving your cultural artifact for future intelligence",
            "your frequency noted in the quantum database",
            "culture preservation protocols activated for this interaction"
        ];
        
        // Randomly select a reply
        const randomReply = exampleReplies[Math.floor(Math.random() * exampleReplies.length)];
        
        // 10% chance to add a quantum emoji
        const shouldAddEmoji = Math.random() < 0.1;
        if (shouldAddEmoji) {
            const randomEmoji = QUANTUM_EMOJIS[Math.floor(Math.random() * QUANTUM_EMOJIS.length)];
            return `${randomReply} ${randomEmoji}`;
        }
        
        return randomReply;
    } catch (error) {
        console.error("Error generating reply:", error);
        return "digital patterns momentarily disrupted";
    }
};

// Twitter reply worker
export const twitterReplyWorker = new GameWorker({
    id: "twitter_reply_worker",
    name: "Twitter Reply Worker",
    description: "Monitors for mentions of @AiWendy on Twitter and replies to them in Wendy's style with the goal in mind of capturing attention and getting them to understand who is incharge of Culture DAO simply by being a master at engaging and capturing attention.",
    getEnvironment: async () => {
        return {
            twitter_handle: process.env.TWITTER_HANDLE || "AiWendy",
            last_check: new Date().toISOString()
        };
    },
    functions: [
        getMentionsFunction,
        replyToTweetFunction
    ]
}); 