"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.twitterClient = exports.RATE_LIMITS = void 0;
exports.validateTwitterCredentials = validateTwitterCredentials;
const twitter_api_v2_1 = require("twitter-api-v2");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
exports.RATE_LIMITS = {
    TWEET_INTERVAL: 2 * 60 * 60,
    MAX_REPLIES_PER_HOUR: 50,
    SEARCH_INTERVAL: 60
};
exports.twitterClient = new twitter_api_v2_1.TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
});
async function validateTwitterCredentials() {
    try {
        const user = await exports.twitterClient.v2.me();
        console.log('✓ Twitter authentication successful');
        return true;
    }
    catch (error) {
        console.error('✗ Twitter authentication failed:', error);
        return false;
    }
}
//# sourceMappingURL=config.js.map