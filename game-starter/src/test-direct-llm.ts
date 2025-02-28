import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Simple logger function
function log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
    
    // Also append to log file
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(
        path.join(logDir, 'test-direct-llm.log'),
        `[INFO] ${new Date().toISOString()} - ${message}\n`
    );
}

/**
 * Direct test of the LLM API without dependencies
 */
async function testDirectLLM() {
    log('Starting direct LLM API test...');
    
    // Check if API key is available
    const apiKey = process.env.API_KEY || process.env.GAME_API_KEY;
    if (!apiKey) {
        log('❌ ERROR: API key not found in environment variables');
        return false;
    }
    
    // Log (masked) API key for debugging
    const maskedKey = apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4);
    log(`Using API key: ${maskedKey}`);
    
    // Define LLM model to use
    const llmModel = process.env.LLM_MODEL || 'DeepSeek-R1';
    log(`Using LLM model: ${llmModel}`);
    
    // Define a simple prompt
    const prompt = 'Generate a short, witty tweet about artificial intelligence in exactly one sentence.';
    log(`Using prompt: "${prompt}"`);
    
    try {
        // Make a direct API call
        log('Sending request to LLM API...');
        
        const requestBody = {
            model: llmModel,
            prompt: prompt,
            temperature: 0.7,
            max_tokens: 100
        };
        
        log(`Request body: ${JSON.stringify(requestBody)}`);
        
        const response = await fetch('https://api.virtuals.io/v1/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        log(`API response status: ${response.status} ${response.statusText}`);
        
        // Get response headers for debugging
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        log(`Response headers: ${JSON.stringify(headers)}`);
        
        // Try to parse response as text first
        const responseText = await response.text();
        log(`Raw response: ${responseText}`);
        
        if (responseText) {
            try {
                // Try to parse the text as JSON
                const data = JSON.parse(responseText);
                log(`Parsed JSON response: ${JSON.stringify(data)}`);
                
                if (data.text) {
                    log(`✅ SUCCESS: Generated text: ${data.text.trim()}`);
                    return true;
                } else {
                    log(`❌ ERROR: No 'text' field in response`);
                    return false;
                }
            } catch (parseError) {
                log(`❌ ERROR: Failed to parse response as JSON: ${parseError}`);
                return false;
            }
        } else {
            log(`❌ ERROR: Empty response from API`);
            return false;
        }
    } catch (error) {
        log(`❌ ERROR: Exception during API call: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Error stack: ${error.stack}`);
        }
        return false;
    }
}

// Run the test
testDirectLLM()
    .then(success => {
        if (success) {
            log('✅ Direct LLM test completed successfully');
            process.exit(0);
        } else {
            log('❌ Direct LLM test failed');
            process.exit(1);
        }
    })
    .catch(error => {
        log(`❌ Unhandled error in test: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Error stack: ${error.stack}`);
        }
        process.exit(1);
    }); 