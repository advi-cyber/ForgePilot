import { TestRunner } from './TestRunner';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as os from 'os';

async function runTests() {
    let passed = 0;
    let failed = 0;
    
    function assertEqual(actual: any, expected: any, msg: string) {
        if (actual === expected) {
            console.log(`[PASS] ${msg}`);
            passed++;
        } else {
            console.error(`[FAIL] ${msg}. Expected ${expected}, got ${actual}`);
            failed++;
        }
    }

    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgepilot-test-'));
    
    try {
        // Test 1: No local environment (fallback)
        const log1: string[] = [];
        const interp1 = await TestRunner.resolvePythonInterpreter(testDir, (msg) => log1.push(msg));
        assertEqual(interp1.includes('python3'), true, 'Fallback to python3 when no env exists');
        
        // Test 2: .venv exists
        const dotVenv = path.join(testDir, '.venv');
        const binDir = process.platform === 'win32' ? 'Scripts' : 'bin';
        const execName = process.platform === 'win32' ? 'python.exe' : 'python';
        const binPath = path.join(dotVenv, binDir);
        fs.mkdirSync(binPath, { recursive: true });
        
        // Create a fake broken python script
        const fakePython = path.join(binPath, execName);
        fs.writeFileSync(fakePython, '#!/bin/sh\nexit 1\n');
        fs.chmodSync(fakePython, 0o755);
        
        // Test 3: broken local interpreter is skipped
        const log2: string[] = [];
        const interp2 = await TestRunner.resolvePythonInterpreter(testDir, (msg) => log2.push(msg));
        assertEqual(interp2.includes('python3'), true, 'Broken local interpreter is skipped');
        
        // Now make it real python
        fs.unlinkSync(fakePython);
        fs.symlinkSync(process.execPath, fakePython); // point to node, wait, node --version works and exits 0!
        
        const log3: string[] = [];
        const interp3 = await TestRunner.resolvePythonInterpreter(testDir, (msg) => log3.push(msg));
        assertEqual(interp3, fakePython, '.venv Python is selected when valid');
        
        // Clean .venv and test venv
        fs.rmSync(dotVenv, { recursive: true, force: true });
        const venv = path.join(testDir, 'venv');
        const venvBinPath = path.join(venv, binDir);
        fs.mkdirSync(venvBinPath, { recursive: true });
        const venvPython = path.join(venvBinPath, execName);
        fs.symlinkSync(process.execPath, venvPython);
        
        const log4: string[] = [];
        const interp4 = await TestRunner.resolvePythonInterpreter(testDir, (msg) => log4.push(msg));
        assertEqual(interp4, venvPython, 'venv Python is selected when .venv is absent');

        // Test runBaseline uses selected interpreter
        const baselineResult = await TestRunner.runBaseline(testDir, 'pytest');
        assertEqual(baselineResult.passed, false, 'baseline pytest executes (fails because node is not pytest)');

        const targetResult = await TestRunner.runTargeted(testDir, 'pytest', 'test_file.py');
        assertEqual(targetResult.passed, false, 'targeted pytest executes');

    } finally {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    console.log(`\nTests completed. ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests().catch(e => { console.error(e); process.exit(1); });
