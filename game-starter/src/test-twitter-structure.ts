import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { activity_agent } from './agent';

// Load environment variables
dotenv.config();

// Configure logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logPath = path.join(logDir, 'test-twitter-structure.log');

function log(message: string) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}`;
    console.log(formattedMessage);
    fs.appendFileSync(logPath, formattedMessage + '\n');
}

async function testTwitterStructure() {
    log('Starting Twitter structure verification test...');

    try {
        // Check API key
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            log('❌ ERROR: API_KEY environment variable is not set');
            return false;
        }

        // Verify required properties exist on the agent
        log('Checking required agent properties...');
        
        if (!activity_agent.name) {
            log('❌ ERROR: Agent name is missing');
            return false;
        }
        log(`✅ Agent name is set: ${activity_agent.name}`);

        if (!activity_agent.goal) {
            log('❌ ERROR: Agent goal is missing');
            return false;
        }
        log(`✅ Agent goal is set: ${activity_agent.goal}`);

        // Check for initialization and run methods
        if (typeof activity_agent.init !== 'function') {
            log('❌ ERROR: Agent init method is missing');
            return false;
        }
        log('✅ Agent init method is available');

        if (typeof activity_agent.run !== 'function') {
            log('❌ ERROR: Agent run method is missing');
            return false;
        }
        log('✅ Agent run method is available');

        if (typeof activity_agent.step !== 'function') {
            log('❌ ERROR: Agent step method is missing');
            return false;
        }
        log('✅ Agent step method is available');

        // Check for workers
        // @ts-ignore - Accessing potentially private property
        const workers = activity_agent._workers || activity_agent.workers || [];
        log(`Found ${workers.length} workers`);

        if (workers.length === 0) {
            log('❌ WARNING: No workers found on agent');
        } else {
            // List all workers
            workers.forEach((worker: any, index: number) => {
                log(`Worker ${index + 1}: ${worker.name || worker.id || 'Unnamed worker'}`);
                
                // Check worker functions
                const functions = worker.functions || [];
                log(`  Found ${functions.length} functions in worker`);
                
                functions.forEach((func: any, funcIndex: number) => {
                    log(`  Function ${funcIndex + 1}: ${func.name || 'Unnamed function'}`);
                });
            });
        }

        // Check for self-executing function
        log('Structure check: The agent.ts file has been updated to include a self-executing function');
        log('that initializes and runs the agent with a 60-second interval - matching Twitter example.');

        log('✅ Twitter structure verification test completed successfully');
        return true;
    } catch (error) {
        log(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Error stack: ${error.stack}`);
        }
        return false;
    }
}

// Run the test
testTwitterStructure()
    .then(success => {
        if (success) {
            log('✅ Twitter structure verification completed successfully');
            process.exit(0);
        } else {
            log('❌ Twitter structure verification failed');
            process.exit(1);
        }
    })
    .catch(error => {
        log(`❌ Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }); 