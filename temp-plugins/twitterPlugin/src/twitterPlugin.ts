import {
  GameWorker,
  GameFunction,
  ExecutableGameFunctionResponse,
  ExecutableGameFunctionStatus
} from "@virtuals-protocol/game";
import { ITweetClient } from "./interface";

interface ITwitterPluginOptions {
  id?: string;
  name?: string;
  description?: string;
  twitterClient: ITweetClient;
}

// Define type for logger function
type LoggerFunction = (message: string) => void;

// Updated interface definitions with optional properties
interface SearchArgs {
  query?: string;
}

interface ReplyTweetArgs {
  tweet_id?: string;
  reply?: string;
  reply_reasoning?: string;
}

interface PostTweetArgs {
  tweet?: string;
  tweet_reasoning?: string;
}

interface LikeTweetArgs {
  tweet_id?: string;
}

interface QuoteTweetArgs {
  tweet_id?: string;
  quote?: string;
}

class TwitterPlugin {
  private id: string;
  private name: string;
  private description: string;
  private twitterClient: ITweetClient;

  constructor(options: ITwitterPluginOptions) {
    this.id = options.id || "twitter-plugin";
    this.name = options.name || "Twitter Plugin";
    this.description = options.description || "Twitter Plugin for Game";
    this.twitterClient = options.twitterClient;
  }

  public getWorker(data?: {
    functions?: GameFunction<any>[];
    getEnvironment?: () => Promise<Record<string, any>>;
  }): GameWorker {
    return new GameWorker({
      id: this.id,
      name: this.name,
      description: this.description,
      functions: data?.functions || [
        this.searchTweetsFunction,
        this.replyTweetFunction,
        this.postTweetFunction,
        this.likeTweetFunction,
        this.quoteTweetFunction,
      ],
      getEnvironment: data?.getEnvironment || this.getMetrics.bind(this),
    });
  }

  public async getMetrics() {
    const result = await this.twitterClient.me();

    return {
      followers: result.data.public_metrics?.followers_count ?? 0,
      following: result.data.public_metrics?.following_count ?? 0,
      tweets: result.data.public_metrics?.tweet_count ?? 0,
    };
  }

  get searchTweetsFunction() {
    return new GameFunction({
      name: "search_tweets",
      description: "Search tweets",
      args: [{ name: "query", description: "The search query" }] as const,
      executable: async (args: SearchArgs, logger: LoggerFunction) => {
        try {
          if (!args.query) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "Query is required"
            );
          }

          logger(`Searching for: ${args.query}`);

          const tweets = await this.twitterClient.search(args.query);

          const feedbackMessage =
            "Tweets found:\n" +
            JSON.stringify(
              tweets.data.map((tweet) => ({
                tweetId: tweet.id,
                content: tweet.text,
                likes: tweet.public_metrics?.like_count,
                retweets: tweet.public_metrics?.retweet_count,
                replyCount: tweet.public_metrics?.reply_count,
              }))
            );

          logger(feedbackMessage);

          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            feedbackMessage
          );
        } catch (e) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            "Failed to search tweets"
          );
        }
      },
    });
  }

  get replyTweetFunction() {
    return new GameFunction({
      name: "reply_tweet",
      description: "Reply to a tweet where your think is the most interesting",
      args: [
        { name: "tweet_id", description: "The tweet id" },
        { name: "reply", description: "The reply content" },
        {
          name: "reply_reasoning",
          description: "The reasoning behind the reply",
        },
      ] as const,
      executable: async (args: ReplyTweetArgs, logger: LoggerFunction) => {
        try {
          if (!args.tweet_id || !args.reply) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "Tweet ID and Reply are required"
            );
          }

          logger(`Replying [${args.tweet_id}]: ${args.reply}`);

          await this.twitterClient.reply(args.tweet_id, args.reply);

          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            "Replied to tweet"
          );
        } catch (e) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            "Failed to reply to tweet"
          );
        }
      },
    });
  }

  get postTweetFunction() {
    return new GameFunction({
      name: "post_tweet",
      description: "Post a tweet",
      args: [
        { name: "tweet", description: "The tweet content" },
        {
          name: "tweet_reasoning",
          description: "The reasoning behind the tweet",
        },
      ] as const,
      executable: async (args: PostTweetArgs, logger: LoggerFunction) => {
        try {
          if (!args.tweet) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "Tweet content is required"
            );
          }

          logger(`Posting tweet: ${args.tweet}`);

          await this.twitterClient.post(args.tweet);

          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            "Tweet posted"
          );
        } catch (e) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            "Failed to post tweet"
          );
        }
      },
    });
  }

  get likeTweetFunction() {
    return new GameFunction({
      name: "like_tweet",
      description:
        "Like a tweet. Choose this when you want to support a tweet quickly, without needing to comment.",
      args: [{ name: "tweet_id", description: "The tweet id" }] as const,
      executable: async (args: LikeTweetArgs, logger: LoggerFunction) => {
        try {
          if (!args.tweet_id) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "Tweet ID is required"
            );
          }

          logger(`Liking tweet id: ${args.tweet_id}`);

          await this.twitterClient.like(args.tweet_id);

          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            "Tweet liked"
          );
        } catch (e) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            "Failed to like tweet"
          );
        }
      },
    });
  }

  get quoteTweetFunction() {
    return new GameFunction({
      name: "quote_tweet",
      description:
        "Share someone else's tweet while adding your own commentary. Use this when you want to provide your opinion, analysis, or humor on an existing tweet while still promoting the original content. This will help with your social presence.",
      args: [
        { name: "tweet_id", description: "The tweet id" },
        { name: "quote", description: "The quote content" },
      ] as const,
      executable: async (args: QuoteTweetArgs, logger: LoggerFunction) => {
        try {
          if (!args.tweet_id || !args.quote) {
            return new ExecutableGameFunctionResponse(
              ExecutableGameFunctionStatus.Failed,
              "Tweet ID and Quote content are required"
            );
          }

          logger(`Quoting [${args.tweet_id}]: ${args.quote}`);

          await this.twitterClient.quote(args.tweet_id, args.quote);

          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Done,
            "Tweet quoted"
          );
        } catch (e) {
          return new ExecutableGameFunctionResponse(
            ExecutableGameFunctionStatus.Failed,
            "Failed to quote tweet"
          );
        }
      },
    });
  }
}

export default TwitterPlugin;
