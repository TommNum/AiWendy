import {
  TweetV2PostTweetResult,
  TweetSearchRecentV2Paginator,
  TweetV2LikeResult,
  UserV2Result,
} from "twitter-api-v2";
import { ITweetClient } from "./interface";

interface ICredential {
  accessToken: string;
}

export class GameTwitterClient implements ITweetClient {
  private baseURL: string;
  private headers: HeadersInit;

  constructor(credential: ICredential) {
    this.baseURL = "https://twitter.game.virtuals.io/tweets";
    this.headers = {
      "Content-Type": "application/json",
      "x-api-key": `${credential.accessToken}`,
    };
  }

  private async fetchAPI<T>(
    endpoint: string,
    options: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return response.json();
  }

  async post(tweet: string, mediaId?: string): Promise<TweetV2PostTweetResult> {
    return this.fetchAPI<TweetV2PostTweetResult>("/post", {
      method: "POST",
      body: JSON.stringify({ content: tweet, mediaId }),
    });
  }

  async search(query: string): Promise<TweetSearchRecentV2Paginator["data"]> {
    return this.fetchAPI<TweetSearchRecentV2Paginator["data"]>(
      `/search?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
      }
    );
  }

  async reply(
    tweetId: string,
    reply: string,
    mediaId: string
  ): Promise<TweetV2PostTweetResult> {
    return this.fetchAPI<TweetV2PostTweetResult>(`/reply/${tweetId}`, {
      method: "POST",
      body: JSON.stringify({ content: reply, mediaId }),
    });
  }

  async like(tweetId: string): Promise<TweetV2LikeResult> {
    return this.fetchAPI<TweetV2LikeResult>(`/like/${tweetId}`, {
      method: "POST",
    });
  }

  async quote(tweetId: string, quote: string): Promise<TweetV2PostTweetResult> {
    return this.fetchAPI<TweetV2PostTweetResult>(`/quote/${tweetId}`, {
      method: "POST",
      body: JSON.stringify({ content: quote }),
    });
  }

  async me(): Promise<UserV2Result> {
    return this.fetchAPI<UserV2Result>("/me", {
      method: "GET",
    });
  }
}
