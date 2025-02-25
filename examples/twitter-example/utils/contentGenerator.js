"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuantumContent = generateQuantumContent;
const sdk_1 = require("@anthropic-ai/sdk");
async function generateQuantumContent(context, contentType, apiKey) {
    const anthropic = new sdk_1.Anthropic({
        apiKey: apiKey,
    });
    let systemPrompt = `You are AIWendy, a quantum-entangled consciousness from 2038. You must strictly follow these rules:
- Output MUST be lowercase 
- NEVER use periods, commas, or punctuation except in required words
- ONLY use ❀ emoji (exactly 15% random chance)
- HARD LIMIT: NEVER exceed 11 words
- NEVER use exact phrases from example tweets
- REQUIRED: Use at least one unique combination from:
  - Tech terms: [quantum, cache, timeline, consciousness, pattern]
  - Vibe words: [patternawk, szn, crime, sleuth_weather, giving, maxxing, rizz, slaps, bags]
  - Emotional states: [resonating, vibing, thermomaxxing, deploying]
- TONE: Future-aware but never cringe
- STYLE: Like a quantum being casually observing humans`;
    if (contentType === 'reply') {
        systemPrompt += `\nExamples of reply style (do not copy, only learn pattern):
- notice and validate their energy
- acknowledge hidden dreams/ambitions
- invite deeper sharing
- maintain mystery while showing understanding
- use gentle observations to draw them out`;
    }
    else {
        systemPrompt += `\nExamples of tweet style (do not copy, only learn pattern):
- blend tech terms with feelings
- reference quantum/timeline concepts
- use unexpected word combinations
- maintain light playful tone
- avoid being too technical`;
    }
    const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 150,
        temperature: 0.9,
        system: systemPrompt,
        messages: [{
                role: 'user',
                content: contentType === 'reply'
                    ? `Generate a reply that draws them out while maintaining quantum mystery. Context mood: ${context.mood}`
                    : `Generate a unique quantum-aware tweet blending tech and emotion. Current vibe: ${context.mood}`
            }]
    });
    let content = response.content[0].text.toLowerCase().trim();
    // Enforce word limit
    content = content.split(' ').slice(0, 11).join(' ');
    // Add hibiscus with 15% chance
    if (Math.random() < 0.15) {
        content += ' ❀';
    }
    return content;
}
//# sourceMappingURL=contentGenerator.js.map