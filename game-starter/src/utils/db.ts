import { Pool } from 'pg';
import { dbLogger } from './dbLogger';
import { withRetry } from './retry';
import fs from 'fs';

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
    const err = error as Error;
    dbLogger.error(`Failed to save tweet to history: ${err.message}`, 'db');
    throw err;
  }
}

/**
 * Get the latest tweets from the database
 * @deprecated Use the getLatestTweets constant function instead
 */
// export async function getLatestTweets(
//   limit: number = 10,
//   userId?: string
// ): Promise<TweetHistoryRecord[]> {
//   try {
//     const pool = initDb();
//     const query = userId
//       ? 'SELECT * FROM tweets WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2'
//       : 'SELECT * FROM tweets ORDER BY timestamp DESC LIMIT $1';
//     const values = userId ? [userId, limit] : [limit];
    
//     const result = await withRetry(
//       async () => await pool.query(query, values),
//       {
//         retries: 3,
//         minDelay: 100,
//         maxDelay: 1000,
//         onRetry: (err, attempt) => {
//           dbLogger.warn(`Retry ${attempt} getting latest tweets: ${err.message}`, 'db');
//         }
//       }
//     );
    
//     return result.rows.map((row: any) => ({
//       id: row.tweet_id,
//       content: row.content,
//       userId: row.user_id,
//       timestamp: row.timestamp,
//       inReplyTo: row.in_reply_to
//     }));
//   } catch (error) {
//     dbLogger.error(`Failed to get latest tweets: ${error}`, 'db');
//     return [];
//   }
// }

// Define the Tweet interface
export interface Tweet {
  id: string;
  text: string;
  created_at: string;
  in_reply_to_status_id?: string;
}

// Define the path for data storage
const DATA_PATH = './data';

// Define the getHistoryItems function
export async function getHistoryItems(): Promise<any[]> {
  try {
    if (!fs.existsSync(`${DATA_PATH}/history.json`)) {
      return [];
    }
    const data = fs.readFileSync(`${DATA_PATH}/history.json`, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    dbLogger.error(`Failed to read history: ${error}`, 'db');
    return [];
  }
}

// Remove the duplicate getLatestTweets function
export const getLatestTweets = async (limit: number = 10): Promise<Tweet[]> => {
  const history = await getHistoryItems();
  return history.slice(0, limit);
};

// Add proper error handling for the saveTweetToHistory function
export const saveTweetToHistory = async (tweet: Tweet): Promise<void> => {
  try {
    // Get existing history
    const history = await getHistoryItems();
    
    // Add tweet to history
    history.push({
      id: tweet.id,
      text: tweet.text,
      createdAt: new Date().toISOString()
    });
    
    // Sort by created date (newest first)
    history.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    
    // Keep only the latest 1000 tweets
    const prunedHistory = history.slice(0, 1000);
    
    // Save back to file
    fs.writeFileSync(
      DATA_PATH,
      JSON.stringify(prunedHistory, null, 2)
    );
    
    dbLogger.info(`Saved tweet ${tweet.id} to history`, 'db');
  } catch (error) {
    const err = error as Error;
    dbLogger.error(`Failed to save tweet to history: ${err.message}`, 'db');
  }
}; 