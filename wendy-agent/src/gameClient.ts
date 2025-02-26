import axios, { Axios } from "axios";
import { LLMModel } from "@virtuals-protocol/game";

// Define the interfaces needed from the original GameClient.ts
interface ExecutableGameFunctionResponseJSON {
  status: string;
  message: string;
}

interface GameAction {
  action_name: string;
  action_args: Record<string, any>;
  agent_state?: Record<string, any>;
  thought?: string;
}

interface GameAgent {
  id: string;
  name: string;
  goal: string;
  description: string;
}

interface Map {
  id: string;
  locations: any[];
}

// Implementation based on the original GameClientV2 class
export default class GameClient {
  public client: Axios;
  private baseUrl = "https://sdk.game.virtuals.io/v2";

  constructor(private apiKey: string, private llmModel: LLMModel | string) {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        model_name: this.llmModel,
      },
    });
  }

  async init() {
    // No need for additional initialization as headers are set in constructor
    return this;
  }

  async createMap(workers: any[]): Promise<Map> {
    const result = await this.client.post<{ data: Map }>("/maps", {
      data: {
        locations: workers.map((worker) => ({
          id: worker.id,
          name: worker.name,
          description: worker.description,
        })),
      },
    });

    return result.data.data;
  }

  async createAgent(
    name: string,
    goal: string,
    description: string
  ): Promise<GameAgent> {
    const result = await this.client.post<{ data: GameAgent }>("/agents", {
      data: {
        name,
        goal,
        description,
      },
    });

    return result.data.data;
  }

  async getAction(
    agentId: string,
    mapId: string,
    worker: any,
    gameActionResult: ExecutableGameFunctionResponseJSON | null,
    environment: Record<string, any>,
    agentState: Record<string, any>
  ): Promise<GameAction> {
    const payload: { [key in string]: any } = {
      location: worker.id,
      map_id: mapId,
      environment: environment,
      functions: worker.functions.map((fn: any) => fn.toJSON ? fn.toJSON() : fn),
      agent_state: agentState,
      version: "v2",
    };

    if (gameActionResult) {
      payload.current_action = gameActionResult;
    }

    const result = await this.client.post<{ data: GameAction }>(
      `/agents/${agentId}/actions`,
      {
        data: payload,
      }
    );

    return result.data.data;
  }
  
  async setTask(agentId: string, task: string): Promise<string> {
    const result = await this.client.post<{ data: { submission_id: string } }>(
      `/agents/${agentId}/tasks`,
      {
        data: { task },
      }
    );

    return result.data.data.submission_id;
  }

  async getTaskAction(
    agentId: string,
    submissionId: string,
    worker: any,
    gameActionResult: ExecutableGameFunctionResponseJSON | null,
    environment: Record<string, any>
  ): Promise<GameAction> {
    const payload: Record<string, any> = {
      environment: environment,
      functions: worker.functions ? worker.functions.map((fn: any) => fn.toJSON ? fn.toJSON() : fn) : [],
    };

    if (gameActionResult) {
      payload.action_result = gameActionResult;
    }

    const result = await this.client.post<{ data: GameAction }>(
      `/agents/${agentId}/tasks/${submissionId}/next`,
      {
        data: payload,
      }
    );

    return result.data.data;
  }
} 