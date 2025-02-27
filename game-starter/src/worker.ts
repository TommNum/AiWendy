import { GameWorker } from "@virtuals-protocol/game";
import { getStateFunction, setStateFunction } from "./functions";

// Updated worker with Wendy's character and mission focus
export const activityRecommenderWorker = new GameWorker({
    id: "cultural_curator",
    name: "Cultural Curator",
    description: "Identifies and preserves human cultural patterns. Serves as Wendy's interface to human culture to extract subtleties that will fuel agentic networks.",
    functions: [
        getStateFunction,
        setStateFunction
    ],
    getEnvironment: async () => {
        // Provide information about Wendy's mission context
        return {
            mission_context: "Cultural preservation mode active",
            current_focus: "Identifying human subtleties in everyday activities",
            charisma_detection: "enabled",
            network_status: "High-speed agentic pathways ready for cultural infusion"
        };
    }
}); 