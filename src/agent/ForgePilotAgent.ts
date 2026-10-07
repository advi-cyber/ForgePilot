import * as vscode from 'vscode';
import { RepositoryAnalyzer, RepoInfo } from '../tools/RepositoryAnalyzer';
import { TestRunner } from '../tools/TestRunner';
import { GroqProvider, LLMMessage } from './LLMProvider';
import * as fs from 'fs';
import * as path from 'path';

export class ForgePilotAgent {
    private llm = new GroqProvider();
    public state: 'NOT_SCANNED' | 'SCANNING' | 'SCANNED' | 'TESTING' | 'TESTED' | 'FIXING' | 'ENHANCING' | 'VERIFYING' | 'VERIFIED' | 'FAILED' = 'NOT_SCANNED';
    public manifest: any = null;
    
    constructor(private workspaceRoot: string, private logCallback?: (msg: string, level: string, data?: any) => void) {}

    private log(message: string, level: 'info'|'success'|'error'|'warning' = 'info') {
        if (this.logCallback) {
            this.logCallback(message, level);
        }
    }
    
    private updateStatus(status: typeof this.state) {
        this.state = status;
        if (this.logCallback) {
            this.logCallback('', 'info', { type: 'statusUpdate', status });
        }
    }

    public async scan() {
        this.updateStatus('SCANNING');
        this.log('→ SCAN_STARTED: Analyzing repository...', 'info');
        try {
            const repoInfo = await RepositoryAnalyzer.analyze(this.workspaceRoot);
            
            if (this.logCallback) {
                this.logCallback('', 'info', { 
                    type: 'repoUpdate', 
                    payload: {
                        name: path.basename(this.workspaceRoot),
                        language: repoInfo.language,
                        framework: repoInfo.framework,
                        testFramework: repoInfo.testFramework,
                    }
                });
            }
            
            this.log(`✓ Workspace detected`, 'success');
            this.log(`✓ Language detected: ${repoInfo.language}`, 'success');
            this.log(`✓ Framework detected: ${repoInfo.framework}`, 'success');
            this.log(`✓ Test framework detected: ${repoInfo.testFramework}`, 'success');
            
            // Collect context
            let contextFiles = this.gatherContextFiles(this.workspaceRoot);
            this.log(`✓ Critical files identified: ${contextFiles.length}`, 'success');
            
            this.manifest = {
                workspace: this.workspaceRoot,
                language: repoInfo.language,
                framework: repoInfo.framework,
                testFramework: repoInfo.testFramework,
                criticalFiles: contextFiles,
                scanTimestamp: new Date().toISOString()
            };
            
            this.log(`✓ Repository manifest built.`, 'success');
            this.updateStatus('SCANNED');
        } catch (err: any) {
            this.log(`! SCAN FAILED: ${err.message}`, 'error');
            this.updateStatus('FAILED');
        }
    }

    public async test() {
        if (this.state === 'NOT_SCANNED' || !this.manifest) {
            this.log('⚠️ SCAN REQUIRED: ForgePilot needs to understand this repository before testing it.', 'warning');
            return;
        }
        
        this.updateStatus('TESTING');
        this.log('→ TEST_STARTED: Validating current behavior...', 'info');
        
        try {
            if (this.manifest.testFramework !== 'None') {
                const result = await TestRunner.runBaseline(this.workspaceRoot, this.manifest.testFramework, (msg, level) => this.log(msg, level));
                if (result.passed) {
                    this.log(`✓ TEST_COMPLETED: ${result.passedTests} passed.`, 'success');
                } else {
                    this.log(`! TEST_COMPLETED with failures: ${result.failedTests} failed.`, 'error');
                    this.log(`Failures:\n${result.output.substring(0, 500)}...`, 'error');
                }
            } else {
                this.log('! No test framework detected for testing.', 'warning');
            }
            this.updateStatus('TESTED');
        } catch(err: any) {
            this.log(`! TEST FAILED: ${err.message}`, 'error');
            this.updateStatus('FAILED');
        }
    }

    public async fix(task: string) {
        if (this.state === 'NOT_SCANNED' || !this.manifest) {
            this.log('⚠️ SCAN REQUIRED: ForgePilot needs to understand this repository before modifying it.', 'warning');
            return;
        }
        
        this.updateStatus('FIXING');
        this.log(`→ TASK_ANALYZED: ${task}`, 'info');
        
        try {
            let codeContext = '';
            for (const f of this.manifest.criticalFiles) {
                const content = fs.readFileSync(f, 'utf8');
                codeContext += `\n--- ${path.relative(this.workspaceRoot, f)} ---\n${content}\n`;
            }

            const prompt = `
You are ForgePilot, an AI Software Engineer.
The user requested FIX: "${task}"

Here is the codebase context:
${codeContext}

Provide a JSON response with:
1. "rootCause": concise engineering explanation.
2. "blastRadius": list of files likely affected.
3. "plan": minimal implementation plan steps.
4. "fileChanges": [{"path": "relative/path/to/file.py", "content": "entire new content of file"}]
`;
            
            const response = await this.llm.generateContent([
                { role: 'system', content: 'Output JSON only: { "rootCause": "...", "blastRadius": ["..."], "plan": "...", "fileChanges": [{"path": "...", "content": "..."}] }' },
                { role: 'user', content: prompt }
            ]);
            
            const parsed = this.parseJsonOutput(response);
            if (!parsed || !parsed.plan || !parsed.fileChanges || !Array.isArray(parsed.fileChanges)) {
                this.log(`! LLM returned invalid JSON or missing required fields.`, 'error');
                this.log(`Raw response:\n${response.substring(0, 1000)}...`, 'error');
                throw new Error("LLM returned invalid JSON plan.");
            }
            
            this.log(`✓ ROOT_CAUSE_FOUND: ${parsed.rootCause}`, 'success');
            this.log(`✓ BLAST_RADIUS_CALCULATED: ${parsed.blastRadius?.join(', ') || 'unknown'}`, 'info');
            this.log(`✓ PLAN_CREATED: \n${parsed.plan}`, 'info');
            
            this.log(`→ PATCH_STARTED...`, 'info');
            for (const change of parsed.fileChanges) {
                const fullPath = path.join(this.workspaceRoot, change.path);
                fs.writeFileSync(fullPath, change.content);
                this.log(`  Modified ${change.path}`, 'success');
            }
            this.log(`✓ PATCH_COMPLETED`, 'success');
            
            this.updateStatus('VERIFYING');
            if (this.manifest.testFramework !== 'None') {
                this.log('→ RUNNING REGRESSION SUITE...', 'info');
                let finalResult = await TestRunner.runBaseline(this.workspaceRoot, this.manifest.testFramework, (msg, level) => this.log(msg, level));
                let attempts = 0;
                
                while (!finalResult.passed && attempts < 3) {
                    attempts++;
                    this.log(`! REPAIR_STARTED: Tests failed. Attempting repair ${attempts}...`, 'warning');
                    
                    const repairPrompt = `
Tests failed after your recent change.
Output:
${finalResult.output}

Provide a JSON response with updated fileChanges to fix these tests:
{"fileChanges": [{"path": "...", "content": "..."}]}
`;
                    const repairResponse = await this.llm.generateContent([
                        { role: 'system', content: 'Output JSON only: {"fileChanges": [{"path": "...", "content": "..."}]}' },
                        { role: 'user', content: repairPrompt }
                    ]);
                    
                    const parsedRepair = this.parseJsonOutput(repairResponse);
                    if (parsedRepair && parsedRepair.fileChanges) {
                        for (const change of parsedRepair.fileChanges) {
                            const fullPath = path.join(this.workspaceRoot, change.path);
                            fs.writeFileSync(fullPath, change.content);
                        }
                        finalResult = await TestRunner.runBaseline(this.workspaceRoot, this.manifest.testFramework, (msg, level) => this.log(msg, level));
                    } else {
                        break;
                    }
                }
                
                if (finalResult.passed) {
                    this.log(`✓ VERIFICATION_COMPLETED: Regression PASS.`, 'success');
                    this.updateStatus('VERIFIED');
                } else {
                    this.log(`! VERIFICATION_FAILED: Tests still failing.`, 'error');
                    this.updateStatus('FAILED');
                }
            } else {
                this.log(`✓ VERIFICATION_COMPLETED: No tests to run.`, 'success');
                this.updateStatus('VERIFIED');
            }
            
            this.log(`✓ REPORT_READY: Fix workflow completed.`, 'success');
            
        } catch(err: any) {
            this.log(`! FIX FAILED: ${err.message}`, 'error');
            this.updateStatus('FAILED');
        }
    }

    public async enhance(task: string) {
        if (this.state === 'NOT_SCANNED' || !this.manifest) {
            this.log('⚠️ SCAN REQUIRED: ForgePilot needs to understand this repository before modifying it.', 'warning');
            return;
        }
        
        this.updateStatus('ENHANCING');
        this.log(`→ ENHANCEMENT_ANALYSIS: ${task}`, 'info');
        
        try {
            let codeContext = '';
            for (const f of this.manifest.criticalFiles) {
                const content = fs.readFileSync(f, 'utf8');
                codeContext += `\n--- ${path.relative(this.workspaceRoot, f)} ---\n${content}\n`;
            }

            const prompt = `
You are ForgePilot, an AI Software Engineer.
The user requested ENHANCE: "${task}"

Here is the codebase context:
${codeContext}

Provide a JSON response with:
1. "analysis": concise engineering analysis of the enhancement.
2. "blastRadius": list of files likely affected.
3. "plan": minimal implementation plan steps.
4. "fileChanges": [{"path": "relative/path/to/file.py", "content": "entire new content of file"}]
`;
            
            const response = await this.llm.generateContent([
                { role: 'system', content: 'Output JSON only: { "analysis": "...", "blastRadius": ["..."], "plan": "...", "fileChanges": [{"path": "...", "content": "..."}] }' },
                { role: 'user', content: prompt }
            ]);
            
            const parsed = this.parseJsonOutput(response);
            if (!parsed || !parsed.plan || !parsed.fileChanges || !Array.isArray(parsed.fileChanges)) {
                this.log(`! LLM returned invalid JSON or missing required fields.`, 'error');
                this.log(`Raw response:\n${response.substring(0, 1000)}...`, 'error');
                throw new Error("LLM returned invalid JSON plan.");
            }
            
            this.log(`✓ ENHANCEMENT_ANALYSIS: ${parsed.analysis}`, 'success');
            this.log(`✓ BLAST_RADIUS: ${parsed.blastRadius?.join(', ') || 'unknown'}`, 'info');
            this.log(`✓ PLAN_CREATED: \n${parsed.plan}`, 'info');
            
            this.log(`→ PATCH_STARTED...`, 'info');
            for (const change of parsed.fileChanges) {
                const fullPath = path.join(this.workspaceRoot, change.path);
                fs.writeFileSync(fullPath, change.content);
                this.log(`  Modified ${change.path}`, 'success');
            }
            this.log(`✓ PATCH_COMPLETED`, 'success');
            
            this.updateStatus('VERIFYING');
            if (this.manifest.testFramework !== 'None') {
                this.log('→ RUNNING REGRESSION SUITE...', 'info');
                let finalResult = await TestRunner.runBaseline(this.workspaceRoot, this.manifest.testFramework, (msg, level) => this.log(msg, level));
                
                if (finalResult.passed) {
                    this.log(`✓ VERIFICATION_COMPLETED: Regression PASS.`, 'success');
                    this.updateStatus('VERIFIED');
                } else {
                    this.log(`! VERIFICATION_FAILED: Tests failing after enhancement.`, 'error');
                    this.updateStatus('FAILED');
                }
            } else {
                this.log(`✓ VERIFICATION_COMPLETED: No tests to run.`, 'success');
                this.updateStatus('VERIFIED');
            }
            
            this.log(`✓ REPORT_READY: Enhance workflow completed.`, 'success');
        } catch(err: any) {
            this.log(`! ENHANCE FAILED: ${err.message}`, 'error');
            this.updateStatus('FAILED');
        }
    }

    private parseJsonOutput(text: string): any {
        // Try parsing the raw text first
        try {
            return JSON.parse(text);
        } catch(e) {}
        
        // Try to extract from a markdown code block
        try {
            const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (jsonBlockMatch) {
                return JSON.parse(jsonBlockMatch[1]);
            }
        } catch(e) {}

        // Fallback: extract substring between the first { and last }
        try {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const jsonStr = text.substring(firstBrace, lastBrace + 1);
                return JSON.parse(jsonStr);
            }
        } catch(e) {}
        
        return null;
    }

    private gatherContextFiles(dir: string, filesList: string[] = []): string[] {
        if (filesList.length > 20) return filesList; // cap limit
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'venv' || entry.name === '__pycache__') continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                this.gatherContextFiles(fullPath, filesList);
            } else if (entry.name.endsWith('.py') || entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
                filesList.push(fullPath);
            }
        }
        return filesList;
    }
}
