import { TwitterApi } from 'twitter-api-v2';

// Declare the global variable properly
declare global {
    var __TWITTER_CLIENTS__: TwitterApi[]; // Use var instead of trying to extend NodeJS.Global
}

// Initialize global array to track Twitter clients
if (!global.__TWITTER_CLIENTS__) {
    global.__TWITTER_CLIENTS__ = [];
}

// Add a global teardown
afterAll(async () => {
    // Close all Twitter client connections
    if (global.__TWITTER_CLIENTS__) {
        for (const client of global.__TWITTER_CLIENTS__) {
            // Use proper cleanup method
            try {
                // Close the client's underlying HTTP agent
                const httpAgent = (client as any)._requestMaker?._httpRequestConfig?.httpAgent;
                if (httpAgent?.destroy) {
                    httpAgent.destroy();
                }
            } catch (error) {
                console.warn('Error cleaning up Twitter client:', error);
            }
        }
        // Clear the array
        global.__TWITTER_CLIENTS__ = [];
    }
}); 