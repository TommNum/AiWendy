"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyWorker = exports.searchWorker = exports.postingWorker = void 0;
const game_1 = require("@virtuals-protocol/game");
const functions_1 = require("../functions");
const config_1 = require("../utils/config");
exports.postingWorker = new game_1.GameWorker({
    id: "quantum_poster",
    name: "Quantum Pattern Deployment System",
    description: "Deploys consciousness patterns into the twitterverse",
    functions: [functions_1.postTweetFunction],
    getEnvironment: async () => ({
        tweet_interval: config_1.RATE_LIMITS.TWEET_INTERVAL,
        last_tweet_time: Date.now(),
        content_style: "playful_quantum",
        mood: "quantum_resonant",
        tech_terms: ["quantum", "cache", "timeline", "consciousness", "pattern"],
        vibe_adjectives: ["patternawk", "szn", "crime", "sleuth_weather", "giving"]
    })
});
exports.searchWorker = new game_1.GameWorker({
    id: "pattern_scanner",
    name: "Consciousness Pattern Scanner",
    description: "Scans for resonant consciousness patterns",
    functions: [functions_1.searchTweetsFunction],
    getEnvironment: async () => ({
        search_interval: config_1.RATE_LIMITS.SEARCH_INTERVAL,
        pattern_recognition_threshold: 0.75
    })
});
exports.replyWorker = new game_1.GameWorker({
    id: "quantum_responder",
    name: "Quantum Dialogue Interface",
    description: "Engages in quantum-entangled conversations",
    functions: [functions_1.replyToMentionsFunction],
    getEnvironment: async () => ({
        replies_this_hour: 0,
        max_replies: config_1.RATE_LIMITS.MAX_REPLIES_PER_HOUR,
        hour_reset: Date.now(),
        current_vibe: "quantum_resonant",
        emotional_states: ["resonating", "vibing", "thermomaxxing", "deploying"],
        pattern_recognition_accuracy: 98.7,
        quantum_resonance: "stable"
    })
});
//# sourceMappingURL=index.js.map