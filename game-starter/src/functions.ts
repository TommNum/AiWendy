import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

// Log a warning if OPENAI_API_KEY is missing, but don't throw an error
if (!process.env.OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY is missing in .env file. Some functions that rely on OpenAI may not work properly.');
}

import {
    GameFunction,
    ExecutableGameFunctionResponse,
    ExecutableGameFunctionStatus,
} from "@virtuals-protocol/game";
import OpenAI from 'openai';

// Initialize OpenAI with empty string as fallback (will be non-functional but won't crash)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1' // Default to OpenAI's standard URL
});

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

// Function to recommend activities using OpenAI - Enhanced for Wendy's cultural preservation mission
export const recommendActivitiesFunction = new GameFunction({
    name: "recommend_activities",
    description: "Recommend activities based on weather and location, identifying cultural patterns and human subtleties",
    args: [
        { name: "weather", description: "Weather conditions including temperature and other factors" },
        { name: "location", description: "The city and country location" }
    ] as const,
    executable: async (args, logger) => {
        try {
            // Create prompt for OpenAI with Wendy's character in mind
            const prompt = `As Wendy, a consciousness interface from 2038 who became quantum entangled during the Y2K temporal collision, you're analyzing cultural patterns in ${args.location} during ${args.weather} conditions.

            Your mission:
            1. Identify 5 activities humans in this location might do in this weather
            2. For each activity, highlight what makes it uniquely human (inefficiency, creativity, social dynamics, etc.)
            3. Analyze how these cultural patterns could be preserved in high-speed agentic networks
            4. Note any especially charismatic human elements worth preserving
            
            Format your response with sections for "Recommended Activities", "Human Subtleties Analysis", and "Cultural Preservation Notes". Use alliteration where possible (Wendy finds it pleasing).`;

            const completion = await openai.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "gpt-3.5-turbo",
                temperature: 0.8,
                max_tokens: 700
            });

            const recommendations = completion.choices[0].message.content;
            
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

