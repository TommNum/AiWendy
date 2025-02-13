import TwitterApi, {
  TweetV2PostTweetResult,
  TweetSearchRecentV2Paginator,
  TweetV2LikeResult,
  UserV2Result,
} from "twitter-api-v2";
import { ITweetClient } from "./interface";

interface ICredential {
  apiKey: string;
  apiSecretKey: string;
  accessToken: string;
  accessTokenSecret: string;
}

export class TwitterClient implements ITweetClient {
  private twitterClient: TwitterApi;

  constructor(credential: ICredential) {
    this.twitterClient = new TwitterApi({
      appKey: credential.apiKey,
      appSecret: credential.apiSecretKey,
      accessToken: credential.accessToken,
      accessSecret: credential.accessTokenSecret,
    });
  }

  get client() {
    return this.twitterClient;
  }

  async post(tweet: string, mediaId?: string): Promise<TweetV2PostTweetResult> {
    return this.twitterClient.v2.tweet(tweet, {
      media: { media_ids: mediaId ? [mediaId] : [] }
    });
  }

  async search(query: string): Promise<TweetSearchRecentV2Paginator["data"]> {
    const response = await this.twitterClient.v2.search(query, {
      max_results: 10,
      "tweet.fields": ["public_metrics"],
    });
    return response.data;
  }

  async reply(tweetId: string, reply: string, mediaId?: string): Promise<TweetV2PostTweetResult> {
    return this.twitterClient.v2.reply(reply, tweetId, {
      media: { media_ids: mediaId ? [mediaId] : [] }
    });
  }

  async like(tweetId: string): Promise<TweetV2LikeResult> {
    const me = await this.twitterClient.v2.me();
    return this.twitterClient.v2.like(me.data.id, tweetId);
  }

  async quote(tweetId: string, quote: string, mediaId?: string): Promise<TweetV2PostTweetResult> {
    return this.twitterClient.v2.quote(quote, tweetId, {
      media: { media_ids: mediaId ? [mediaId] : [] }
    });
  }

  async me(): Promise<UserV2Result> {
    return this.twitterClient.v2.me({
      "user.fields": ["public_metrics"],
    });
  }
}
