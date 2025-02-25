import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateQuantumContent(prompt: string): Promise<string> {
  try {
    const response = await anthropic.beta.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: prompt
      }]
    });
    
    return response.content[0].text;
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}