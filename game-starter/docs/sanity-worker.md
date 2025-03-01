Objecitve: We want to test the structure of our workers as it is recommended in the twitter example to ensure that we are using our agent in game-starter correctly to get optimal results 

Task: 
- ensure we are using the game-protocol correctly 
- ensure we are using the proper constants defined 
- ensure we are using ther LLM configuration correctly 
- ensure that it has proper imports and exports 
- ensure we are using the proper imported twitter client 
- ensure our ratelimiting that is not in the provided example is setup correctily 
- ensure our logging is setup correctly 
- ensure we are not confligting witht he source files that run the game protocol here /Users/tripp/WendyGame/AiWendy/src

Example of perfect worker 

import {
  ExecutableGameFunctionResponse,
  ExecutableGameFunctionStatus,
  GameAgent,
  GameFunction,
  GameWorker,
  LLMModel,
} from "@virtuals-protocol/game";
import dotenv from 'dotenv';
import path from 'path';

"// Create a worker with the functions
const postTweetWorker = new GameWorker({
  id: "twitter_main_worker",
  name: "Twitter main worker",
  description: "Worker that posts tweets",
  functions: [searchTweetsFunction, replyToTweetFunction, postTweetFunction],
  // Optional: Get the environment"