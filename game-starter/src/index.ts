import { activity_agent, waitForAgentReady } from './agent';
import { virtualsApiRateLimiter, twitterMentionsRateLimiter, twitterTweetsRateLimiter } from './utils/rateLimiter';
import { ExecutableGameFunctionResponse, ExecutableGameFunctionStatus } from "@virtuals-protocol/game";
import { tweetWorker } from './workers/tweetWorker';  // Import the tweetWorker instead of postToTwitter
import { initDbLogger, dbLogger } from './utils/dbLogger';  // Import the database logger
import './healthcheck';  // Import the health check server

/**
 * Task Scheduler - Manages the timing of different agent operations
 */
class TaskScheduler {
    private tasks: Map<string, TaskConfig> = new Map();
    private lastRun: Map<string, number> = new Map();
    
    /**
     * Add a task to the scheduler
     */
    addTask(id: string, config: TaskConfig) {
        this.tasks.set(id, config);
        this.lastRun.set(id, 0); // Initialize with 0 (never run)
    }
    
    /**
     * Check which tasks are due to run and execute them
     * Returns the next task that should run
     */
    async getNextTask(): Promise<string | null> {
        const now = Date.now();
        let nextTaskId: string | null = null;
        let earliestDueTime = Number.MAX_SAFE_INTEGER;
        
        // Find the earliest due task
        for (const [id, config] of this.tasks.entries()) {
            const lastRun = this.lastRun.get(id) || 0;
            const nextRunTime = lastRun + config.intervalMs;
            
            // If the task is due now
            if (nextRunTime <= now) {
                // If startupTask is true, prioritize it
                if (config.startupTask && lastRun === 0) {
                    return id;
                }
                
                // Otherwise, find the task that's been waiting the longest
                if (nextRunTime < earliestDueTime) {
                    earliestDueTime = nextRunTime;
                    nextTaskId = id;
                }
            }
        }
        
        return nextTaskId;
    }
    
    /**
     * Mark a task as executed
     */
    markTaskExecuted(id: string) {
        this.lastRun.set(id, Date.now());
    }
    
    /**
     * Get time until next task in milliseconds
     */
    getTimeUntilNextTask(): number {
        const now = Date.now();
        let minWaitTime = Number.MAX_SAFE_INTEGER;
        
        for (const [id, config] of this.tasks.entries()) {
            const lastRun = this.lastRun.get(id) || 0;
            const nextRunTime = lastRun + config.intervalMs;
            const waitTime = Math.max(0, nextRunTime - now);
            
            if (waitTime < minWaitTime) {
                minWaitTime = waitTime;
            }
        }
        
        return minWaitTime === Number.MAX_SAFE_INTEGER ? 60000 : minWaitTime; // Default to 1 minute
    }
}

/**
 * Task configuration
 */
interface TaskConfig {
    intervalMs: number;        // How often to run the task in milliseconds
    description: string;       // Human-readable description of the task
    startupTask?: boolean;     // Whether this task should run at startup
}

// Function to post a startup tweet
export async function postStartupTweet() {
    try {
        console.log("🚀 Posting startup tweet...");
        
        // Ensure the agent is initialized before proceeding
        await waitForAgentReady();
        
        // Generate a startup tweet message with a timestamp to make it unique
        // Ensure it follows our 11-word limit and all lowercase rule
        // Format: hhmm (just 4 digits, no separators)
        const timestamp = new Date().toISOString().substring(11, 13) + 
                         new Date().toISOString().substring(14, 16); // Just get HHMM (4 digits)
        
        // Exactly 11 words, all lowercase, no special characters
        const startupMessage = `consciousness interface initializing ${timestamp} cultural artifacts loading`;
        
        console.log(`Startup tweet word count: ${startupMessage.split(' ').length}`);
        
        // Get token for rate limiting
        await twitterTweetsRateLimiter.getToken();
        
        // Log status and post the tweet directly using the Twitter API client
        console.log(`Posting startup tweet: "${startupMessage}"`);
        
        // Post the tweet using the tweetWorker
        const postTweetFunction = tweetWorker.functions.find(f => f.name === "post_tweet");
        if (!postTweetFunction) {
            throw new Error("post_tweet function not found in tweetWorker");
        }
        
        const result = await postTweetFunction.executable({
            content: startupMessage,
            in_reply_to: ""
        }, (msg: string) => console.log(`Tweet worker: ${msg}`));
        
        if (result.status === ExecutableGameFunctionStatus.Done) {
            console.log(`✅ Startup tweet posted successfully!`);
            return true;
        } else {
            console.error(`Error posting startup tweet: ${result.feedback}`);
            return false;
        }
    } catch (error) {
        console.error("Error posting startup tweet:", error instanceof Error ? error.message : 'Unknown error');
        return false;
    }
}

async function main() {
    try {
        console.log("🔄 Initializing database logger...");
        await initDbLogger();
        
        // Initialize the agent
        console.log("🔄 Initializing Wendy agent...");
        dbLogger.info("Starting Wendy agent initialization", "main");
        await waitForAgentReady();
        
        // Set up custom logger for better visibility
        activity_agent.setLogger((agent, msg) => {
            console.log(`[${agent.name}] ${msg}`);
            dbLogger.info(msg, 'agent');
        });
        
        // Log configuration
        console.log(`Using LLM model: ${process.env.LLM_MODEL || "Llama_3_1_405B_Instruct"}`);
        
        // Run the agent with a reasonable heartbeat interval (in seconds)
        // This will allow the agent to process tasks and make decisions
        await activity_agent.run(30, { verbose: true });
        
        // Create and configure the task scheduler
        const scheduler = new TaskScheduler();
        
        // Add tasks to the scheduler with their intervals
        scheduler.addTask("tweet", { 
            intervalMs: 1 * 60 * 60 * 1000,  // 1 hour
            description: "Generate and post a tweet",
            startupTask: true
        });
        
        scheduler.addTask("check_mentions", { 
            intervalMs: 5 * 60 * 1000,  // 5 minutes
            description: "Check for Twitter mentions"
        });
        
        scheduler.addTask("search_tweets", { 
            intervalMs: 15 * 60 * 1000,  // 15 minutes
            description: "Search for relevant tweets to engage with"
        });
        
        scheduler.addTask("dao_engagement", { 
            intervalMs: 6 * 60 * 60 * 1000,  // 6 hours
            description: "Run DAO engagement activities"
        });
        
        // Post a startup tweet to announce the bot is running
        await postStartupTweet();
        
        // Main execution loop
        console.log("🚀 Starting main execution loop...");
        dbLogger.info("Starting main execution loop", "main");
        let running = true;
        
        // Set up graceful shutdown
        process.on('SIGINT', () => {
            console.log("Received SIGINT, shutting down gracefully...");
            dbLogger.info("Received SIGINT, shutting down gracefully", "main");
            running = false;
        });
        
        process.on('SIGTERM', () => {
            console.log("Received SIGTERM, shutting down gracefully...");
            dbLogger.info("Received SIGTERM, shutting down gracefully", "main");
            running = false;
        });
        
        // Single execution flow with task scheduling
        while (running) {
            try {
                // Get the next task to execute
                const taskId = await scheduler.getNextTask();
                
                if (taskId) {
                    // Mark the task as running at the start
                    scheduler.markTaskExecuted(taskId);
                    
                    console.log(`Executing task: ${taskId} at ${new Date().toISOString()}`);
                    dbLogger.info(`Executing task: ${taskId}`, "scheduler");
                    
                    // Apply rate limiting before executing the task
                    await virtualsApiRateLimiter.getToken();
                    
                    // Set an environment variable to indicate the current operation
                    process.env.CURRENT_OPERATION = taskId;
                    
                    // Execute step with the appropriate context
                    await activity_agent.step({ verbose: true });
                    
                    // Clear the environment variable
                    delete process.env.CURRENT_OPERATION;
                    
                    console.log(`Completed task: ${taskId}`);
                    dbLogger.info(`Completed task: ${taskId}`, "scheduler");
                } else {
                    // No task ready to run, calculate wait time
                    const waitTime = scheduler.getTimeUntilNextTask();
                    
                    if (waitTime > 1000) {
                        console.log(`Waiting ${Math.ceil(waitTime/1000)} seconds until next task...`);
                        
                        // Wait until the next task is due (up to 60 seconds at a time for responsiveness)
                        const sleepTime = Math.min(waitTime, 60000);
                        await new Promise(resolve => setTimeout(resolve, sleepTime));
                    }
                }
            } catch (error) {
                console.error(`Error in main loop: ${error instanceof Error ? error.message : 'Unknown error'}`);
                dbLogger.error(`Error in main loop: ${error instanceof Error ? error.message : 'Unknown error'}`, "main");
                // Wait a bit before retrying to avoid tight error loops
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }
        
        console.log("Agent execution terminated gracefully");
        dbLogger.info("Agent execution terminated gracefully", "main");
    } catch (error) {
        console.error("Critical error running Wendy agent:", error);
        dbLogger.error(`Critical error running Wendy agent: ${error}`, "main");
    }
}

// Start the agent
main();

// Export main for potential imports
export { main };
