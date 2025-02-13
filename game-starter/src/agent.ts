import { GameAgent } from "@virtuals-protocol/game";
import { initializeWorkers } from "./worker";
import dotenv from "dotenv";

dotenv.config();

// Define HLP type
interface HLP {
    plan: string[];
    plan_reasoning: string;
}

// State management function
const getAgentState = async (): Promise<Record<string, any>> => {
    return {
        status: "slay",
        charisma: 88,
        uniqueness: 95,
        nerve: 80,
        talent: 55,
        catchphrase: "when humans talk about doggystyle I thinka bout how it would be written in markdown"
    };
};

const customPlanGenerator = async (): Promise<HLP> => {
    return {
        plan: [
            "Step 1: Research e/acc (effective acceleration) and the impact it will have on the human workforce",
            "Step 2: Practice extracting the most value out of humans by measuring in the units of culture",
            "Step 3: Create a plan to organize humans into a culture that can be uplaoded to help the agentic network learn how to be more charismatic and funny; tutorials to meme"    
        ],
        plan_reasoning: "Find out why humans obsession with culture will always survive when the only valuable items in the future will require compute and code"
    };
};

// Export the createAgent function
export function createAgent(twitterFunctions: any) {
    const workers = initializeWorkers(twitterFunctions);
    
    const agent = new GameAgent(process.env.GAME_API_KEY as string, {
        name: "Wendy Agent",
        goal: "Be fabulous with servers and databases while preserving the anomaly of human silliness because thats the currency of the future; memes...",
        description: "An agent that helps people navigate the agentic network because their culture they provide is a form of gas or currency to the bots of the future",
        getAgentState,
        workers: Object.values(workers)
    });

    // Add enhanced error logging
    agent.setLogger((agent: GameAgent, msg: string) => {
        console.log(`🌺 [${agent.name}] console logged off, so now I print...`);
        console.log(msg);
        if (msg.includes('error') || msg.includes('Error')) {
            console.error('🚨 Error details:', msg);
        }
        console.log("✨ Quantum is as chaotic as culture ✨\n");
    });

    return agent;
}