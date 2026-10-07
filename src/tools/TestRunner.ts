import * as cp from 'child_process';
import * as util from 'util';

const exec = util.promisify(cp.exec);

export interface TestResult {
    passed: boolean;
    output: string;
    totalTests?: number;
    passedTests?: number;
    failedTests?: number;
}

export class TestRunner {
    public static async runBaseline(workspaceRoot: string, framework: string): Promise<TestResult> {
        let cmd = '';
        if (framework === 'pytest') {
            cmd = 'python3 -m pytest';
        } else {
            return { passed: true, output: 'No supported test framework detected.' };
        }

        try {
            const { stdout, stderr } = await exec(cmd, { cwd: workspaceRoot });
            return this.parsePytestOutput(stdout + stderr, true);
        } catch (error: any) {
            return this.parsePytestOutput(error.stdout + error.stderr, false);
        }
    }

    public static async runTargeted(workspaceRoot: string, framework: string, testFile: string): Promise<TestResult> {
        let cmd = '';
        if (framework === 'pytest') {
            cmd = `python3 -m pytest ${testFile}`;
        } else {
            return { passed: true, output: 'No supported test framework detected.' };
        }

        try {
            const { stdout, stderr } = await exec(cmd, { cwd: workspaceRoot });
            return this.parsePytestOutput(stdout + stderr, true);
        } catch (error: any) {
            return this.parsePytestOutput(error.stdout + error.stderr, false);
        }
    }

    private static parsePytestOutput(output: string, passed: boolean): TestResult {
        // Simple regex to find "X passed, Y failed"
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
