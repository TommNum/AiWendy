// Type declarations for modules that are missing types
declare module '@virtuals-protocol/game' {
  export enum LLMModel {
    DeepSeek_R1 = 'DeepSeek-R1',
    Claude_3_Sonnet = 'Claude-3-Sonnet',
    Llama_3_1_405B_Instruct = 'Llama-3.1-405B-Instruct'
  }

  export interface GameAgentOptions {
    name: string;
    goal: string;
    description?: string;
    getAgentState?: () => Promise<any>;
    workers?: GameWorker[];
    llmModel?: LLMModel;
  }

  export interface TextGenerationOptions {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  }

  export class GameAgent {
    name: string;
    goal: string;
    description: string;
    workers: GameWorker[];
    llmModel: LLMModel;

    constructor(apiKey: string, options: GameAgentOptions);
    
    init(): Promise<void>;
    run(heartbeatIntervalSeconds: number, options?: { verbose?: boolean }): Promise<void>;
    step(options?: { verbose?: boolean }): Promise<void>;
    setLogger(loggerFn: (agent: GameAgent, message: string) => void): void;
    generateText(prompt: string, options?: TextGenerationOptions): Promise<string>;
  }

  export enum ExecutableGameFunctionStatus {
    Done = 'done',
    Error = 'error',
    Working = 'working',
    Waiting = 'waiting'
  }

  export interface ExecutableGameFunctionResponse {
    status: ExecutableGameFunctionStatus;
    feedback?: string;
    result?: any;
    output?: string;
  }

  export interface GameFunction {
    name: string;
    description: string;
    parameters: Record<string, any>;
    executable: (params: any, logger?: (message: string) => void) => Promise<ExecutableGameFunctionResponse>;
  }

  export class GameWorker {
    name: string;
    description: string;
    functions: GameFunction[];

    constructor(name: string, description: string, functions: GameFunction[]);
    
    getEnvironment(): Promise<any>;
    execute(params: any): Promise<any>;
  }
}

// Twitter module type declarations
declare module './workers/tweetWorker' {
  import { GameWorker } from '@virtuals-protocol/game';
  export const tweetWorker: GameWorker;
  export function postToTwitter(content: string, options?: any): Promise<any>;
}

declare module './workers/twitterReplyWorker' {
  import { GameWorker } from '@virtuals-protocol/game';
  export const twitterReplyWorker: GameWorker;
}

declare module './workers/twitterSearchWorker' {
  import { GameWorker } from '@virtuals-protocol/game';
  export const twitterSearchWorker: GameWorker;
}

declare module './workers/daoEngagementWorker' {
  import { GameWorker } from '@virtuals-protocol/game';
  export const daoEngagementWorker: GameWorker;
}

// Add declarations for missing modules from plugins
declare module 'viem/accounts' {
  export function privateKeyToAccount(privateKey: string): any;
}

declare module '@goat-sdk/core' {
  export class GoatSDK {
    constructor(options: any);
  }
}

declare module 'ajv' {
  export default class Ajv {
    constructor(options?: any);
    compile(schema: any): any;
    validate(schema: any, data: any): boolean;
  }
}

declare module 'zod-to-json-schema' {
  export default function zodToJsonSchema(schema: any): any;
}

declare module '@rss3/sdk' {
  export class RSS3 {
    constructor(options?: any);
  }
}

declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(options: any);
  }
  export class PutObjectCommand {
    constructor(params: any);
  }
  export class GetObjectCommand {
    constructor(params: any);
  }
}

declare module '@aws-sdk/s3-request-presigner' {
  export function getSignedUrl(client: any, command: any, options?: any): Promise<string>;
}

declare module 'node-telegram-bot-api' {
  export default class TelegramBot {
    constructor(token: string, options?: any);
    on(event: string, listener: Function): this;
    sendMessage(chatId: string | number, text: string, options?: any): Promise<any>;
  }
}

declare module 'open' {
  export default function open(target: string, options?: any): Promise<any>;
}

// Add this module declaration
declare module '../../utils/twitter' {
  export interface Tweet {
    id: string;
    text: string;
    author?: string;
    createdAt?: Date;
  }
  
  export function getMentions(userId: number, count?: number): Promise<Tweet[]>;
  export function postTweet(content: string, inReplyTo?: string | null): Promise<Tweet>;
  export function replyToTweet(tweetId: string, content: string): Promise<Tweet>;
} 