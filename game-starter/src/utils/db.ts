import { Pool } from 'pg';
import { dbLogger } from './dbLogger';
import { withRetry } from './retry';

// Database connection pool
let pool: Pool | null = null;

/**
 * Initialize the database connection pool
 */
export function initDb(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    // Log database connection
    dbLogger.info('Database connection initialized', 'db');
    
    // Handle pool errors
    pool.on('error', (err) => {
      dbLogger.error(`Unexpected database error: ${err.message}`, 'db');
    });
  }
  
  return pool;
}

/**
 * Tweet history record
 */
export interface TweetHistoryRecord {
  id: string;
  content: string;
  userId: string;
  timestamp: Date;
  inReplyTo?: string;
}

/**
 * Save a tweet to the history
 * @param tweetId The ID of the tweet
 * @param content The content of the tweet
 * @param userId The user ID associated with the tweet
 * @param inReplyTo Optional ID of the tweet this is replying to
 * @returns The saved record ID
 */
export async function saveToHistory(
  tweetId: string,
  content: string,
  userId: string,
  inReplyTo?: string
): Promise<string> {
  try {
    const db = initDb();
    
    // Create the table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS tweet_history (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        user_id TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        in_reply_to TEXT
      )
    `);
    
    // Insert the record
    const result = await withRetry(
      () => db.query(
        `INSERT INTO tweet_history (id, content, user_id, in_reply_to) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [tweetId, content, userId, inReplyTo || null]
      ),
      {
        maxRetries: 3,
        loggerTag: 'db:saveToHistory',
      }
    );
    
    dbLogger.info(`Saved tweet ${tweetId} to history`, 'db');
    
    return result.rows[0].id;
  } catch (error) {
    dbLogger.error(`Failed to save tweet to history: ${error.message}`, 'db');
    throw error;
  }
}

/**
 * Get the latest tweets from history
 * @param limit Maximum number of tweets to retrieve (default: 10)
 * @param userId Optional user ID to filter by
 * @returns Array of tweet history records
 */
export async function getLatestTweets(
  limit: number = 10,
  userId?: string
): Promise<TweetHistoryRecord[]> {
  try {
    const db = initDb();
    
    // Build the query
    let query = `
      SELECT id, content, user_id, timestamp, in_reply_to
      FROM tweet_history
    `;
    
    const params: any[] = [];
    
    if (userId) {
      query += ' WHERE user_id = $1';
      params.push(userId);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    
    // Execute the query
    const result = await withRetry(
      () => db.query(query, params),
      {
        maxRetries: 3,
        loggerTag: 'db:getLatestTweets',
      }
    );
    
    // Map the results
    return result.rows.map(row => ({
      id: row.id,
      content: row.content,
      userId: row.user_id,
      timestamp: row.timestamp,
      inReplyTo: row.in_reply_to,
    }));
  } catch (error) {
    dbLogger.error(`Failed to get latest tweets: ${error.message}`, 'db');
    return []; // Return empty array on error
  }
} 