import dotenv from 'dotenv';
import { LLMModel } from '@virtuals-protocol/game';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Configure logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

function log(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    
    fs.appendFileSync(
        path.join(logDir, 'test-llm.log'),
        `[${timestamp}] ${message}\n`
    );
}

async function testLLM() {
    log("Starting LLM test with updated integration...");
    
    // Check API key
    const apiKey = process.env.API_KEY || process.env.GAME_API_KEY;
    if (!apiKey) {
        log("❌ ERROR: No API key found in environment variables");
        return false;
    }
    
    // Get model from env or use default
    const configuredModel = process.env.LLM_MODEL || 'DeepSeek-R1';
    let modelEnum;
    
    // Match string model name to enum
    switch (configuredModel) {
        case 'DeepSeek-R1':
            modelEnum = LLMModel.DeepSeek_R1;
            break;
        case 'DeepSeek-V3':
            modelEnum = LLMModel.DeepSeek_V3;
            break;
        case 'Llama-3.1-405B-Instruct':
            modelEnum = LLMModel.Llama_3_1_405B_Instruct;
            break;
        case 'Llama-3.3-70B-Instruct':
            modelEnum = LLMModel.Llama_3_3_70B_Instruct;
            break;
        case 'Qwen-2.5-72B-Instruct':
            modelEnum = LLMModel.Qwen_2_5_72B_Instruct;
            break;
        default:
            modelEnum = LLMModel.DeepSeek_R1;
    }
    
    log(`Using LLM model: ${modelEnum}`);
    
    // Create a simple test prompt
    const prompt = "Generate a short, witty tweet about AI in exactly one sentence.";
    
    log(`Using prompt: "${prompt}"`);
    
    // Try the primary endpoint first
    try {
        log("Attempting primary endpoint (v2 API)...");
        const response = await fetch('https://sdk.game.virtuals.io/v2/llm/completion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'model_name': modelEnum
            },
            body: JSON.stringify({
                prompt: prompt,
                max_tokens: 100,
                temperature: 0.7
            })
        });
        
        log(`Primary endpoint response status: ${response.status} ${response.statusText}`);
        
        // Get response headers for debugging
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        log(`Response headers: ${JSON.stringify(headers)}`);
        
        if (response.ok) {
            const responseText = await response.text();
            log(`Raw response: ${responseText}`);
            
            if (responseText) {
                try {
                    // Try to parse the text as JSON
                    const data = JSON.parse(responseText);
                    log(`Parsed JSON response: ${JSON.stringify(data)}`);
                    
                    // Extract the generated text based on the response format
                    let generatedText;
                    if (data.choices && data.choices[0] && data.choices[0].text) {
                        generatedText = data.choices[0].text.trim();
                    } else if (data.text) {
                        generatedText = data.text.trim();
                    } else if (data.completion) {
                        generatedText = data.completion.trim();
                    } else {
                        throw new Error('Unexpected response format from LLM API');
                    }
                    
                    log(`✅ SUCCESS from primary endpoint: ${generatedText}`);
                    return true;
                } catch (parseError) {
                    log(`❌ ERROR: Failed to parse response as JSON: ${parseError}`);
                }
            } else {
                log(`❌ ERROR: Empty response from primary endpoint`);
            }
        } else {
            log(`❌ ERROR: Primary endpoint returned error status ${response.status}`);
            
            // Special handling for rate limits
            if (response.status === 429) {
                const retryAfter = response.headers.get('retry-after');
                log(`Rate limit exceeded. Retry after: ${retryAfter || 'unknown'} seconds`);
            }
            
            log(`Error response body: ${await response.text()}`);
        }
        
        // If we reach here, primary endpoint failed, try backup
        log("Primary endpoint failed. Trying backup endpoint...");
    } catch (error) {
        log(`❌ ERROR with primary endpoint: ${error instanceof Error ? error.message : String(error)}`);
        log("Falling back to backup endpoint...");
    }
    
    // Try the backup endpoint
    try {
        log("Attempting backup endpoint (v1 API)...");
        const backupResponse = await fetch('https://api.game.virtuals.io/v1/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelEnum,
                prompt: prompt,
                max_tokens: 100,
                temperature: 0.7
            })
        });
        
        log(`Backup endpoint response status: ${backupResponse.status} ${backupResponse.statusText}`);
        
        // Get response headers for debugging
        const backupHeaders: Record<string, string> = {};
        backupResponse.headers.forEach((value, key) => {
            backupHeaders[key] = value;
        });
        log(`Backup response headers: ${JSON.stringify(backupHeaders)}`);
        
        if (backupResponse.ok) {
            const responseText = await backupResponse.text();
            log(`Raw backup response: ${responseText}`);
            
            if (responseText) {
                try {
                    // Try to parse the text as JSON
                    const data = JSON.parse(responseText);
                    log(`Parsed backup JSON response: ${JSON.stringify(data)}`);
                    
                    // Extract the generated text based on the response format
                    let generatedText;
                    if (data.choices && data.choices[0] && data.choices[0].text) {
                        generatedText = data.choices[0].text.trim();
                    } else if (data.text) {
                        generatedText = data.text.trim();
                    } else {
                        throw new Error('Unexpected response format from backup LLM API');
                    }
                    
                    log(`✅ SUCCESS from backup endpoint: ${generatedText}`);
                    return true;
                } catch (parseError) {
                    log(`❌ ERROR: Failed to parse backup response as JSON: ${parseError}`);
                }
            } else {
                log(`❌ ERROR: Empty response from backup endpoint`);
            }
        } else {
            log(`❌ ERROR: Backup endpoint returned error status ${backupResponse.status}`);
            log(`Error response body: ${await backupResponse.text()}`);
        }
    } catch (error) {
        log(`❌ ERROR with backup endpoint: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // If we get here, both endpoints failed
    log("Both LLM endpoints failed. Using fallback method would be appropriate in production.");
    return false;
}

// Run the test
testLLM()
    .then(success => {
        if (success) {
            log("✅ LLM test completed successfully");
            process.exit(0);
        } else {
            log("❌ LLM test failed with all endpoints");
            process.exit(1);
        }
    })
    .catch(error => {
        log(`❌ Unhandled error in test: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }); 