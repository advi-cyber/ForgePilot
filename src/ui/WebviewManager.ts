import * as vscode from 'vscode';

export class WebviewManager {
    public static currentPanel: WebviewManager | undefined;
    public readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent();
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (WebviewManager.currentPanel) {
            WebviewManager.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'forgePilot',
            'ForgePilot',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        WebviewManager.currentPanel = new WebviewManager(panel, extensionUri);
    }

    public sendMessage(message: any) {
        this._panel.webview.postMessage(message);
    }

    public dispose() {
        WebviewManager.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ForgePilot</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            color: var(--vscode-editor-foreground); 
            padding: 20px; 
        }
        .header { text-align: center; margin-bottom: 20px; }
        .subtitle { font-style: italic; color: var(--vscode-descriptionForeground); margin-top: 5px; }
        .section { margin-bottom: 20px; padding: 10px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; }
        .buttons-container { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
        button { 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            border: none; 
            padding: 10px 20px; 
            cursor: pointer; 
            font-weight: bold;
            border-radius: 2px;
        }
        button:hover { background: var(--vscode-button-hoverBackground); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        textarea { 
            width: 100%; 
            height: 60px; 
            margin-bottom: 10px; 
            background: var(--vscode-input-background); 
            color: var(--vscode-input-foreground); 
            border: 1px solid var(--vscode-input-border); 
            padding: 8px;
            box-sizing: border-box;
        }
        #logs { 
            font-family: monospace; 
            white-space: pre-wrap; 
            background: var(--vscode-editor-background); 
            padding: 10px; 
            border: 1px solid var(--vscode-panel-border); 
            max-height: 300px; 
            overflow-y: auto; 
        }
        .success { color: var(--vscode-testing-iconPassed); }
        .error { color: var(--vscode-testing-iconFailed); }
        .info { color: var(--vscode-textLink-foreground); }
        .warning { color: var(--vscode-editorWarning-foreground); }
    </style>
</head>
<body>
    <div class="header">
        <h2>FORGEPILOT</h2>
        <div>AI Software Engineering Agent</div>
        <div class="subtitle">"Scan before you change. Verify before you ship."</div>
    </div>
    
    <div class="section" id="repo-info">
        <strong>Repository:</strong> <span id="repo-name">Scanning...</span><br/>
        <strong>Language:</strong> <span id="repo-lang">Unknown</span><br/>
        <strong>Framework:</strong> <span id="repo-framework">Unknown</span><br/>
        <strong>Test Framework:</strong> <span id="repo-test">Unknown</span><br/>
        <strong>Status:</strong> <span id="repo-status">NOT_SCANNED</span>
    </div>

    <div class="buttons-container">
        <button id="btn-scan">🔍 SCAN</button>
        <button id="btn-test">🧪 TEST</button>
        <button id="btn-fix">🔧 FIX</button>
        <button id="btn-enhance">✨ ENHANCE</button>
    </div>

    <div id="task-container" style="display:none;" class="section">
        <h3>Provide Task</h3>
        <textarea id="task-input" placeholder="Describe the task..."></textarea>
        <button id="btn-submit-task">Submit</button>
    </div>

    <div class="section">
        <h3>Activity</h3>
        <div id="logs"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        const btnScan = document.getElementById('btn-scan');
        const btnTest = document.getElementById('btn-test');
        const btnFix = document.getElementById('btn-fix');
        const btnEnhance = document.getElementById('btn-enhance');
        
        const taskContainer = document.getElementById('task-container');
        const btnSubmitTask = document.getElementById('btn-submit-task');
        const taskInput = document.getElementById('task-input');
        const logsDiv = document.getElementById('logs');
        
        const repoNameEl = document.getElementById('repo-name');
        const repoLangEl = document.getElementById('repo-lang');
        const repoFrameworkEl = document.getElementById('repo-framework');
        const repoTestEl = document.getElementById('repo-test');
        const repoStatusEl = document.getElementById('repo-status');

        let currentAction = '';

        function addLog(text, level = 'info') {
            const p = document.createElement('div');
            p.textContent = text;
            p.className = level;
            logsDiv.appendChild(p);
            logsDiv.scrollTop = logsDiv.scrollHeight;
        }

        btnScan.addEventListener('click', () => {
            vscode.postMessage({ command: 'action', action: 'scan' });
            addLog('Starting SCAN...', 'info');
        });

        btnTest.addEventListener('click', () => {
            vscode.postMessage({ command: 'action', action: 'test' });
        });

        btnFix.addEventListener('click', () => {
            currentAction = 'fix';
            taskContainer.style.display = 'block';
        });

        btnEnhance.addEventListener('click', () => {
            currentAction = 'enhance';
            taskContainer.style.display = 'block';
        });

        btnSubmitTask.addEventListener('click', () => {
            const task = taskInput.value.trim();
            if (task) {
                vscode.postMessage({ command: 'action', action: currentAction, text: task });
                taskContainer.style.display = 'none';
                taskInput.value = '';
            }
        });

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'log':
                    addLog(message.text, message.level);
                    break;
                case 'repoUpdate':
                    repoNameEl.textContent = message.data.name || repoNameEl.textContent;
                    repoLangEl.textContent = message.data.language || repoLangEl.textContent;
                    repoFrameworkEl.textContent = message.data.framework || repoFrameworkEl.textContent;
                    repoTestEl.textContent = message.data.testFramework || repoTestEl.textContent;
                    break;
                case 'statusUpdate':
                    repoStatusEl.textContent = message.status;
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
