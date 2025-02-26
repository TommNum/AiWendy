import axios, { Axios } from "axios";
import { LLMModel } from "@virtuals-protocol/game";

// Simplified GameClient class for the wendy-agent project
export default class GameClient {
  public client: Axios | null = null;
  private runnerUrl = "https://game.virtuals.io";

  constructor(private apiKey: string, private llmModel: LLMModel | string) {}

  async init() {
    const accessToken = await this.getAccessToken();

    this.client = axios.create({
      baseURL: this.runnerUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        model_name: this.llmModel,
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.runnerUrl}/auth/token`,
        { api_key: this.apiKey }
      );
      return response.data.access_token;
    } catch (error) {
      console.error("Failed to get access token:", error);
      throw new Error("Authentication failed");
    }
  }

  async createAgent(name: string, goal: string, description: string): Promise<{ id: string }> {
    if (!this.client) await this.init();
    
    try {
      const response = await this.client!.post("/agents", {
        name,
        goal,
        description
      });
      return { id: response.data.id };
    } catch (error) {
      console.error("Failed to create agent:", error);
      throw new Error("Failed to create agent");
    }
  }

  async setTask(agentId: string, prompt: string): Promise<string> {
    if (!this.client) await this.init();
    
    try {
      const response = await this.client!.post(`/agents/${agentId}/tasks`, {
        prompt
      });
      return response.data.submission_id;
    } catch (error) {
      console.error("Failed to set task:", error);
      throw new Error("Failed to set task");
    }
  }

  async getTaskAction(
    agentId: string,
    submissionId: string,
    worker: any,
    logger: any,
    environment: any
  ): Promise<any> {
    if (!this.client) await this.init();
    
    try {
      const response = await this.client!.get(
        `/agents/${agentId}/tasks/${submissionId}/action`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to get task action:", error);
      throw new Error("Failed to get task action");
    }
  }
} 