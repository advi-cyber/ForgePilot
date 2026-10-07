import * as cp from 'child_process';
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFile = util.promisify(cp.execFile);

export interface TestResult {
    passed: boolean;
    output: string;
    totalTests?: number;
    passedTests?: number;
    failedTests?: number;
}

export class TestRunner {
    private static getCleanEnv(): NodeJS.ProcessEnv {
        const env = { ...process.env };
        delete env.PYTHONHOME;
        delete env.PYTHONPATH;
        delete env.VIRTUAL_ENV;
        return env;
    }

    public static async resolvePythonInterpreter(workspaceRoot: string, log?: (msg: string) => void): Promise<string> {
        if (log) log(`Python workspace root: ${workspaceRoot}`);
        
        const isWindows = process.platform === 'win32';
        
        const candidates = isWindows ? [
            path.join(workspaceRoot, '.venv', 'Scripts', 'python.exe'),
            path.join(workspaceRoot, 'venv', 'Scripts', 'python.exe')
        ] : [
            path.join(workspaceRoot, '.venv', 'bin', 'python'),
            path.join(workspaceRoot, 'venv', 'bin', 'python')
        ];
        
        for (const candidate of candidates) {
            try {
                if (fs.existsSync(candidate)) {
                    await execFile(candidate, ['--version'], { env: this.getCleanEnv() });
                    if (log) log(`Selected Python interpreter: ${candidate}`);
                    return candidate;
                }
            } catch (e) {
                // broken interpreter
            }
        }
        
        if (log) log(`Local virtual environment is missing or broken. Falling back to system Python.`);
        
        const fallbacks = ['python3', 'python'];
        for (const fb of fallbacks) {
            try {
                await execFile(fb, ['--version'], { env: this.getCleanEnv() });
                if (log) log(`Selected Python interpreter: ${fb}`);
                return fb;
            } catch (e) {}
        }
        
        return 'python3';
    }

    public static async runBaseline(workspaceRoot: string, framework: string, logCallback?: (msg: string, level: 'info'|'success'|'error'|'warning') => void): Promise<TestResult> {
        const log = (msg: string) => {
            if (logCallback) logCallback(msg, 'info');
        };

        if (framework === 'pytest') {
            const pythonPath = await this.resolvePythonInterpreter(workspaceRoot, log);
            try {
                const { stdout, stderr } = await execFile(pythonPath, ['-m', 'pytest'], { cwd: workspaceRoot, env: this.getCleanEnv() });
                return this.parsePytestOutput(stdout + stderr, true);
            } catch (error: any) {
                return this.parsePytestOutput((error.stdout || '') + (error.stderr || ''), false);
            }
        } else {
            return { passed: true, output: 'No supported test framework detected.' };
        }
    }

    public static async runTargeted(workspaceRoot: string, framework: string, testFile: string, logCallback?: (msg: string, level: 'info'|'success'|'error'|'warning') => void): Promise<TestResult> {
        const log = (msg: string) => {
            if (logCallback) logCallback(msg, 'info');
        };

        if (framework === 'pytest') {
            const pythonPath = await this.resolvePythonInterpreter(workspaceRoot, log);
            try {
                const { stdout, stderr } = await execFile(pythonPath, ['-m', 'pytest', testFile], { cwd: workspaceRoot, env: this.getCleanEnv() });
                return this.parsePytestOutput(stdout + stderr, true);
            } catch (error: any) {
                return this.parsePytestOutput((error.stdout || '') + (error.stderr || ''), false);
            }
        } else {
            return { passed: true, output: 'No supported test framework detected.' };
        }
    }

    private static parsePytestOutput(output: string, passed: boolean): TestResult {
        const passedMatch = output.match(/(\d+) passed/);
        const failedMatch = output.match(/(\d+) failed/);
        
        const passedTests = passedMatch ? parseInt(passedMatch[1]) : 0;
        const failedTests = failedMatch ? parseInt(failedMatch[1]) : 0;
        
        return {
            passed: passed,
            output: output,
            totalTests: passedTests + failedTests,
            passedTests: passedTests,
            failedTests: failedTests
        };
    }
}
