import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface RepoInfo {
    language: string;
    framework: string;
    testFramework: string;
    files: number;
    directories: string[];
}

export class RepositoryAnalyzer {
    public static async analyze(workspaceRoot: string): Promise<RepoInfo> {
        let language = 'Unknown';
        let framework = 'None';
        let testFramework = 'None';
        let fileCount = 0;
        
        const isPython = fs.existsSync(path.join(workspaceRoot, 'requirements.txt')) || 
                         fs.existsSync(path.join(workspaceRoot, 'setup.py')) ||
                         fs.existsSync(path.join(workspaceRoot, 'pyproject.toml'));
        
        if (isPython) {
            language = 'Python';
            if (fs.existsSync(path.join(workspaceRoot, 'requirements.txt'))) {
                const reqs = fs.readFileSync(path.join(workspaceRoot, 'requirements.txt'), 'utf8');
                if (reqs.includes('FastAPI')) framework = 'FastAPI';
                else if (reqs.includes('Django')) framework = 'Django';
                else if (reqs.includes('Flask')) framework = 'Flask';
                
                if (reqs.includes('pytest')) testFramework = 'pytest';
                else if (reqs.includes('unittest')) testFramework = 'unittest';
            }
        }
        
        // Simple file counter (excluding node_modules, .git, venv)
        const countFiles = (dir: string): number => {
            let count = 0;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'venv' || entry.name === '__pycache__') continue;
                if (entry.isDirectory()) {
                    count += countFiles(path.join(dir, entry.name));
                } else {
                    count++;
                }
            }
            return count;
        };
        
        try {
            fileCount = countFiles(workspaceRoot);
        } catch(e) {
            console.error("Failed to count files", e);
        }

        return {
            language,
            framework,
            testFramework,
            files: fileCount,
            directories: []
        };
    }
}
