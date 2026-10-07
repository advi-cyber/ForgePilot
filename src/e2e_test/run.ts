// Mock VSCode
const mockVscode = {
    workspace: {
        getConfiguration: () => ({ get: () => undefined })
    }
};

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(request: string) {
    if (request === 'vscode') {
        return mockVscode;
    }
    return originalRequire.apply(this, arguments);
};

import { ForgePilotAgent } from '../agent/ForgePilotAgent';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    console.log('Starting E2E Test...');
    const fixturePath = path.join(__dirname, '../../fixture');
    const task = "Fix password reset so email matching is case-insensitive. Do not break existing authentication behavior. Add regression tests.";
    
    // Require GROQ_API_KEY
    if (!process.env.GROQ_API_KEY) {
        console.error('Please set GROQ_API_KEY to run the test.');
        process.exit(1);
    }
    
    const agent = new ForgePilotAgent(fixturePath, (msg: string, level: string, data?: any) => {
        if (data?.type === 'statusUpdate') {
            console.log(`[STATUS] ${data.status}`);
        } else if (data?.type === 'repoUpdate') {
            console.log(`[REPO] ${JSON.stringify(data.payload)}`);
        } else {
            console.log(`[${level.toUpperCase()}] ${msg}`);
        }
    });
    
    await agent.scan();
    await agent.test();
    await agent.fix(task);
}

main().catch(console.error);
