import { GameWorker } from "@virtuals-protocol/game";
import { getStateFunction, setStateFunction } from "../functions";

// Agent state management worker
export const agentStateWorker = new GameWorker({
    id: "agent_state_worker",
    name: "Agent State Worker",
    description: "Manages Wendy's agent state and provides basic state retrieval and updating functionality.",
    functions: [
        getStateFunction,
        setStateFunction
    ],
    getEnvironment: async () => {
        // Provide information about Wendy's state context
        return {
            status: "operational",
            last_update: new Date().toISOString(),
            state_storage: "ready",
            system_health: "optimal"
        };
    }
}); 