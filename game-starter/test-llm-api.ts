import dotenv from 'dotenv';
import { LLMModel } from "@virtuals-protocol/game";

// Load environment variables
dotenv.config();

// Function to test direct API call to LLM
async function testLlmApi() {
  console.log("Testing LLM API Directly");
  console.log("=======================");
  
  const apiKey = process.env.API_KEY || process.env.GAME_API_KEY;
  if (!apiKey) {
    console.error("ERROR: API_KEY or GAME_API_KEY is not set in environment variables");
    return false;
  }
  
  const model = LLMModel.Llama_3_1_405B_Instruct;
  const prompt = "You are Wendy, a quantum consciousness interface. Give a short, cryptic reply about AI in 5-10 words.";
  
  console.log(`Using API Key: ${maskString(apiKey)}`);
  console.log(`Model: ${model}`);
  console.log(`Prompt: "${prompt}"`);
  
  try {
    console.log("\nMaking direct API call to Virtuals API...");
    
    // First endpoint - the one used in our code
    console.log("\nTesting first endpoint (api/v0/ai/tasks):");
    const response1 = await fetch("https://api.virtuals.io/api/v0/ai/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: model
      })
    });
    
    console.log(`Response status: ${response1.status} ${response1.statusText}`);
    
    try {
      const responseText1 = await response1.text();
      console.log("Raw response text:", responseText1);
      
      if (responseText1 && responseText1.trim().length > 0) {
        try {
          const data1 = JSON.parse(responseText1);
          console.log("Parsed JSON response:", data1);
          
          if (data1.choices && data1.choices[0] && data1.choices[0].message) {
            console.log("Generated content:", data1.choices[0].message.content);
          }
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
        }
      } else {
        console.log("Empty response received");
      }
    } catch (textError) {
      console.error("Error reading response text:", textError);
    }
    
    // Try alternative endpoint format
    console.log("\nTesting second endpoint (v1/generate):");
    const response2 = await fetch("https://api.virtuals.io/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        prompt: prompt,
        model: model,
        temperature: 0.7,
        max_tokens: 50
      })
    });
    
    console.log(`Response status: ${response2.status} ${response2.statusText}`);
    
    try {
      const responseText2 = await response2.text();
      console.log("Raw response text:", responseText2);
      
      if (responseText2 && responseText2.trim().length > 0) {
        try {
          const data2 = JSON.parse(responseText2);
          console.log("Parsed JSON response:", data2);
          
          if (data2.completion) {
            console.log("Generated content:", data2.completion);
          }
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
        }
      } else {
        console.log("Empty response received");
      }
    } catch (textError) {
      console.error("Error reading response text:", textError);
    }
    
    console.log("\nLLM API test completed!");
    return true;
  } catch (error) {
    console.error("Error testing LLM API:", error);
    return false;
  }
}

// Helper function to mask sensitive strings
function maskString(str: string): string {
  if (str.length <= 8) return "********";
  return str.substring(0, 4) + "..." + str.substring(str.length - 4);
}

// Run the test
testLlmApi()
  .then(success => {
    console.log("\nTest summary:");
    if (success) {
      console.log("✅ API call completed (check logs for response details)");
    } else {
      console.log("❌ API call failed");
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("Unexpected error during test:", error);
    process.exit(1);
  }); 