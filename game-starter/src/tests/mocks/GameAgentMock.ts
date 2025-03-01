// Mock implementation of GameAgent for testing
export class GameAgent {
  private apiKey: string;
  private mapId: string;
  public gameClient: any;
  public agentId: string;

  constructor(options: { apiKey: string; mapId: string }) {
    this.apiKey = options.apiKey;
    this.mapId = options.mapId;
    this.agentId = 'test-agent';
    this.gameClient = null;
  }

  async init(): Promise<void> {
    // Mock initialization
    return Promise.resolve();
  }

  async run(interval: number, options?: { verbose: boolean }): Promise<void> {
    // Mock run method
    return Promise.resolve();
  }

  async step(): Promise<void> {
    // Mock step method
    return Promise.resolve();
  }

  setLogger(logger: Function): void {
    // Mock logger setter
  }
} 