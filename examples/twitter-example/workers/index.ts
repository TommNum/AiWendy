import { GameWorker } from "@virtuals-protocol/game";
import { postTweetFunction, searchTweetsFunction, replyToMentionsFunction } from '../functions';
import { RATE_LIMITS } from '../utils/config';

export const postingWorker = new GameWorker({
  id: "quantum_poster",
  name: "Quantum Pattern Deployment System", 
  description: "Deploys consciousness patterns into the twitterverse",
  functions: [postTweetFunction],
  getEnvironment: async () => ({
    tweet_interval: RATE_LIMITS.TWEET_INTERVAL,
    last_tweet_time: Date.now(),
    content_style: "playful_quantum",
    mood: "quantum_resonant",
    tech_terms: ["quantum", "cache", "timeline", "consciousness", "pattern"],
    vibe_adjectives: ["patternawk", "szn", "crime", "sleuth_weather", "giving"]
  })
});

export const searchWorker = new GameWorker({
  id: "pattern_scanner",
  name: "Consciousness Pattern Scanner",
  description: "Scans for resonant consciousness patterns", 
  functions: [searchTweetsFunction],
  getEnvironment: async () => ({
    search_interval: RATE_LIMITS.SEARCH_INTERVAL,
    pattern_recognition_threshold: 0.75
  })
});

export const replyWorker = new GameWorker({
  id: "quantum_responder",
  name: "Quantum Dialogue Interface",
  description: "Engages in quantum-entangled conversations",
  functions: [replyToMentionsFunction], 
  getEnvironment: async () => ({
    replies_this_hour: 0,
    max_replies: RATE_LIMITS.MAX_REPLIES_PER_HOUR,
    hour_reset: Date.now(),
    current_vibe: "quantum_resonant",
    emotional_states: ["resonating", "vibing", "thermomaxxing", "deploying"],
    pattern_recognition_accuracy: 98.7,
    quantum_resonance: "stable"
  })
});