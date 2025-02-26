import {
  TweetSearchRecentV2Paginator,
  TweetV2LikeResult,
  TweetV2PostTweetResult,
  UserV2Result,
} from "twitter-api-v2";

export interface ITweetClient {
  post(tweet: string, mediaId?: string): Promise<TweetV2PostTweetResult>;
  search(query: string): Promise<TweetSearchRecentV2Paginator["data"]>;
  reply(
    tweet_id: string,
    reply: string,
    mediaId?: string
  ): Promise<TweetV2PostTweetResult>;
  like(tweet_id: string): Promise<TweetV2LikeResult>;
  quote(
    tweet_id: string,
    quote: string,
    mediaId?: string
  ): Promise<TweetV2PostTweetResult>;
  me(): Promise<UserV2Result>;
}
