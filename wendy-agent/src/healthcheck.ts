import fs from 'fs';
import path from 'path';

// Function to check if logs indicate the agent is working
function checkLogs() {
  try {
    const logFile = path.join(__dirname, '../logs/wendy.log');
    
    // Check if log file exists
    if (!fs.existsSync(logFile)) {
      console.error('Log file does not exist');
      process.exit(1);
    }
    
    // Read the last 100 lines of logs
    const logs = fs.readFileSync(logFile, 'utf8').split('\n').slice(-100);
    
    // Check for recent activity (within last hour)
    const recentLogs = logs.filter(log => {
      const match = log.match(/^(.+?) -/);
      if (match) {
        const logTime = new Date(match[1]);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return logTime > oneHourAgo;
      }
      return false;
    });
    
    if (recentLogs.length === 0) {
      console.error('No recent log activity');
      process.exit(1);
    }
    
    // Check for successful tweet posts
    const successfulTweets = recentLogs.filter(log => 
      log.includes('Successfully posted tweet')
    );
    
    // Check for successful tweet searches
    const successfulSearches = recentLogs.filter(log => 
      log.includes('Successfully processed tweet')
    );
    
    // Check for successful replies
    const successfulReplies = recentLogs.filter(log => 
      log.includes('Successfully replied to')
    );
    
    // If none of these activities are found in logs, the agent might be stuck
    if (successfulTweets.length === 0 && successfulSearches.length === 0 && successfulReplies.length === 0) {
      console.error('No successful Twitter activities found in recent logs');
      process.exit(1);
    }
    
    console.log('Health check passed: Agent is active');
    process.exit(0);
  } catch (error) {
    console.error('Health check failed:', error);
    process.exit(1);
  }
}

// Run the health check
checkLogs(); 