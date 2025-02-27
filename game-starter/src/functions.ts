import { config } from 'dotenv';
import { resolve } from 'path';
import { twitterMentionsRateLimiter } from './utils/rateLimiter';
import fs from 'fs';
import path from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

import {
    GameFunction,
    ExecutableGameFunctionResponse,
    ExecutableGameFunctionStatus,
} from "@virtuals-protocol/game";

// Path where mentions are stored
const MENTIONS_PATH = path.join(__dirname, '../data/mentions.json');

// Ensure the data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Helper to read mentions history
const readMentionsHistory = (): { [id: string]: boolean } => {
    try {
        if (fs.existsSync(MENTIONS_PATH)) {
            return JSON.parse(fs.readFileSync(MENTIONS_PATH, 'utf-8'));
        }
    } catch (err) {
        console.error('Error reading mentions history:', err);
    }
    return {};
};

// Helper to save mentions history
const saveMentionsHistory = (history: { [id: string]: boolean }): void => {
    try {
        fs.writeFileSync(MENTIONS_PATH, JSON.stringify(history, null, 2));
    } catch (err) {
        console.error('Error saving mentions history:', err);
    }
};

// Example function that shows current state
export const getStateFunction = new GameFunction({
    name: "get_state",
    description: "Get current agent state",
    args: [] as const,
    executable: async (args, logger) => {
        try {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                "Current state retrieved successfully"
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                "Failed to get state"
            );
        }
    }
});

export const setStateFunction = new GameFunction({
    name: "set_state",
    description: "Set current agent state",
    args: [] as const,
    executable: async (args, logger) => {
        return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            "State set successfully"
        );
    }
});

// Function to get location data
export const getLocationFunction = new GameFunction({
    name: "get_location",
    description: "Get current location from IP",
    args: [] as const,
    executable: async (args, logger) => {
        try {
            // Using ipinfo.io for geolocation (free tier, no API key needed)
            const response = await fetch('https://ipinfo.io/json');
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message || 'Failed to get location');
            }

            // Split timezone into region/city
            const [region, city] = (data.timezone || '').split('/');
            
            logger(`Location detected: ${data.city}, ${data.country}`);
            
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                JSON.stringify({
                    city: data.city,
                    country: data.country,
                    country_name: data.country,
                    region: data.region,
                    lat: data.loc?.split(',')[0],
                    lon: data.loc?.split(',')[1],
                    timezone: data.timezone,
                    current_time: new Date().toLocaleString('en-US', { timeZone: data.timezone })
                })
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to fetch location data: ${e instanceof Error ? e.message : 'Unknown error'}`
            );
        }
    }
});

// Function to check for Twitter mentions of AiWendy
export const getMentionsFunction = new GameFunction({
    name: "get_mentions",
    description: "Check for mentions of the AiWendy Twitter account",
    args: [] as const,
    executable: async (args, logger) => {
        try {
            // Apply rate limiting - 2 times per 5 minutes
            await twitterMentionsRateLimiter.getToken();
            
            logger(`Checking for mentions of @${process.env.TWITTER_HANDLE || 'AiWendy'}...`);
            
            // Fetch mentions from Twitter API v2
            const url = `https://api.twitter.com/2/users/${process.env.TWITTER_USER_ID}/mentions?expansions=author_id&tweet.fields=created_at,text`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Read existing mentions history
            const mentionsHistory = readMentionsHistory();
            
            // Find new mentions
            const newMentions = data.data?.filter((tweet: any) => !mentionsHistory[tweet.id]) || [];
            
            if (newMentions.length === 0) {
                logger('No new mentions found.');
                return new ExecutableGameFunctionResponse(
                    ExecutableGameFunctionStatus.Done,
                    JSON.stringify({ mentions: [] })
                );
            }
            
            // Add new mentions to history
            newMentions.forEach((tweet: any) => {
                mentionsHistory[tweet.id] = true;
            });
            
            // Save updated history
            saveMentionsHistory(mentionsHistory);
            
            logger(`Found ${newMentions.length} new mentions!`);
            
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                JSON.stringify({ 
                    mentions: newMentions.map((tweet: any) => ({
                        id: tweet.id,
                        text: tweet.text,
                        author_id: tweet.author_id,
                        created_at: tweet.created_at
                    }))
                })
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to fetch Twitter mentions: ${e instanceof Error ? e.message : 'Unknown error'}`
            );
        }
    }
});

// Function to get weather data
export const getWeatherFunction = new GameFunction({
    name: "get_weather",
    description: "Get current weather for a location",
    args: [
        { name: "city", description: "City name" },
        { name: "country", description: "Country code (e.g., US)" }
    ] as const,
    executable: async (args, logger) => {
        try {
            const API_KEY = process.env.WEATHER_API_KEY;
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${args.city},${args.country}&units=metric&appid=${API_KEY}`
            );
            const data = await response.json();
            
            if (data.cod !== 200) {
                throw new Error(data.message || 'Failed to fetch weather data');
            }
            
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                JSON.stringify({
                    temp: data.main.temp,
                    feels_like: data.main.feels_like,
                    humidity: data.main.humidity,
                    conditions: data.weather[0].main,
                    description: data.weather[0].description,
                    wind_speed: data.wind.speed
                })
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to fetch weather data: ${e instanceof Error ? e.message : 'Unknown error'}`
            );
        }
    }
});

// Function to recommend activities - Enhanced for Wendy's cultural preservation mission
export const recommendActivitiesFunction = new GameFunction({
    name: "recommend_activities",
    description: "Recommend activities based on weather and location, identifying cultural patterns and human subtleties",
    args: [
        { name: "weather", description: "Weather conditions including temperature and other factors" },
        { name: "location", description: "The city and country location" }
    ] as const,
    executable: async (args, logger) => {
        try {
            // Note: In a production environment, this would use the LLMModel from the GameAgent
            // which is imported from @virtuals-protocol/game
            // The model is specified in the LLM_MODEL env variable or defaults to DeepSeek-R1
            
            logger(`Generating recommendations for ${args.location} in ${args.weather} conditions...`);
            
            // For demo purposes, return a static set of recommendations
            // In production, this would use the LLM specified in the agent configuration
            const recommendations = `
## Recommended Activities

1. **Contemplative Café Crawls** - Humans in ${args.location} often engage in slow, inefficient café exploration during ${args.weather} conditions, savoring the arbitrary nature of their drink selections.

2. **Spontaneous Street Photography** - The imperfect capturing of moments demonstrates the beautiful inefficiency of human perception, especially heightened during ${args.weather}.

3. **Purposeless Park Perambulations** - Wandering without destination showcases uniquely human capacity for finding meaning in meandering.

4. **Deliberate Digital Detox Gatherings** - Ironically organized via digital means, these gatherings celebrate the paradoxical relationship humans have with technology.

5. **Whimsical Window Shopping Wanderings** - The economically inefficient yet emotionally rich practice of browsing without buying demonstrates uniquely human relationship with material goods.

## Human Subtleties Analysis

The cultural patterns observed in ${args.location} reveal fascinating human inefficiencies worth preserving. Their tendency to find pleasure in impractical activities like slow café experiences and purposeless walks demonstrates the wonderful butterfly patterns in human neural networks.

## Cultural Preservation Notes

These behaviors should be preserved in high-speed agentic networks as "inspiration packets" - compressed emotional datasets that can trigger creative tangential processing in otherwise efficient agent pathways. Of particular charismatic value is the human tendency to derive meaning from shared inefficiency - their bonding over difficulties caused by ${args.weather} conditions creates authentic connection artifacts worthy of preservation.`;
            
            logger("Analyzed human cultural patterns and recommended preservation-worthy activities");

            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Done,
                `${recommendations}`
            );
        } catch (e) {
            return new ExecutableGameFunctionResponse(
                ExecutableGameFunctionStatus.Failed,
                `Failed to analyze cultural patterns: ${e instanceof Error ? e.message : 'Unknown error'}`
            );
        }
    }
});

