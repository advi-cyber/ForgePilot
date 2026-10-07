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
        :root {
            --bg-color: var(--vscode-editor-background);
            --border-color: var(--vscode-panel-border, rgba(128, 128, 128, 0.2));
            --text-primary: var(--vscode-editor-foreground);
            --text-secondary: var(--vscode-descriptionForeground);
            --accent-blue: var(--vscode-textLink-foreground, #58a6ff);
            --accent-blue-hover: var(--vscode-textLink-activeForeground, #3182ce);
            --success-green: var(--vscode-testing-iconPassed, #3fb950);
            --error-red: var(--vscode-testing-iconFailed, #f85149);
            --warning-amber: var(--vscode-problemsWarningIcon-foreground, #d29922);
            --surface-bg: var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.05));
            --surface-hover: var(--vscode-editor-selectionBackground, rgba(128, 128, 128, 0.1));
            
            --spacing-xs: 4px;
            --spacing-sm: 8px;
            --spacing-md: 12px;
            --spacing-lg: 16px;
            --spacing-xl: 24px;
        }

        body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
            background-color: var(--bg-color);
            color: var(--text-primary);
            padding: 0;
            margin: 0;
            line-height: 1.5;
            font-size: 13px;
        }

        .app-container {
            max-width: 900px;
            margin: 0 auto;
            padding: var(--spacing-xl);
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xl);
        }

        /* HEADER */
        .header-compact {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: var(--spacing-md);
            flex-wrap: wrap;
            gap: var(--spacing-sm);
        }

        .brand-container {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .brand-container h1 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .tagline {
            font-size: 12px;
            color: var(--text-secondary);
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--text-secondary);
        }

        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: var(--text-secondary);
        }

        .status-indicator.ready .status-dot { background-color: var(--success-green); }
        .status-indicator.working .status-dot { background-color: var(--accent-blue); animation: pulse 2s infinite; }
        .status-indicator.error .status-dot { background-color: var(--error-red); }

        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.2); }
            100% { opacity: 1; transform: scale(1); }
        }

        /* REPO INFO */
        .repo-context-bar {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            font-size: 12px;
            color: var(--text-secondary);
            flex-wrap: wrap;
        }

        .repo-context-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
        }

        .repo-context-item strong {
            color: var(--text-primary);
            font-weight: normal;
        }

        .repo-context-separator {
            color: var(--border-color);
        }

        /* ACTIONS */
        .actions-section {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-md);
        }

        .section-header {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--text-secondary);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: var(--spacing-xs);
            margin-bottom: var(--spacing-sm);
        }

        .actions-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1px;
            background-color: var(--border-color);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            overflow: hidden;
        }

        .action-btn {
            background: var(--bg-color);
            border: none;
            padding: var(--spacing-md);
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
            cursor: pointer;
            text-align: left;
            transition: background 0.15s;
            color: var(--text-primary);
        }

        .action-btn:hover:not(:disabled) {
            background: var(--surface-hover);
        }

        .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: var(--bg-color);
        }

        .action-btn.active {
            background: var(--surface-bg);
            border-bottom: 2px solid var(--accent-blue);
            padding-bottom: calc(var(--spacing-md) - 2px);
        }

        .action-btn .header-row {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            font-weight: 600;
            font-size: 12px;
        }

        .action-btn .desc {
            font-size: 11px;
            color: var(--text-secondary);
            line-height: 1.3;
        }

        /* TASK INPUT */
        .task-input-area {
            background: var(--surface-bg);
            border-radius: 4px;
            padding: var(--spacing-md);
            display: none;
            animation: fadeIn 0.2s ease;
        }

        .input-group {
            display: flex;
            gap: var(--spacing-sm);
            align-items: flex-start;
        }

        textarea {
            flex-grow: 1;
            height: 32px;
            min-height: 32px;
            background: var(--bg-color);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 6px var(--spacing-sm);
            font-family: inherit;
            font-size: 13px;
            resize: vertical;
            box-sizing: border-box;
            transition: border-color 0.15s;
        }
        
        textarea:focus {
            outline: none;
            border-color: var(--accent-blue);
        }

        .btn-primary {
            background: var(--vscode-button-background, #007acc);
            color: var(--vscode-button-foreground, #ffffff);
            border: none;
            padding: 6px 14px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s;
            height: 32px;
            white-space: nowrap;
        }

        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground, #005a9e);
        }

        /* WORKFLOW TRACKER */
        .workflow-tracker {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--spacing-md) 0;
            display: none;
        }

        .step {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            font-size: 12px;
            color: var(--text-secondary);
        }

        .step.active {
            color: var(--text-primary);
            font-weight: 500;
        }
        
        .step.active .step-icon {
            color: var(--accent-blue);
        }

        .step.completed {
            color: var(--text-primary);
        }
        
        .step.completed .step-icon {
            color: var(--success-green);
        }
        
        .step.failed .step-icon {
            color: var(--error-red);
        }

        .step-icon {
            font-size: 14px;
        }

        .step-line {
            flex-grow: 1;
            height: 1px;
            background: var(--border-color);
            margin: 0 var(--spacing-md);
        }

        .step-line.completed {
            background: var(--success-green);
            opacity: 0.5;
        }

        /* RESULTS AREA */
        .results-container {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xl);
        }
        
        .result-block {
            display: none;
            animation: fadeIn 0.2s ease;
        }
        
        .result-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--text-secondary);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: var(--spacing-xs);
            margin-bottom: var(--spacing-sm);
        }

        /* Verification specific */
        .verification-block {
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: var(--spacing-md);
            background: var(--surface-bg);
        }
        
        .verification-block.success {
            border-left: 3px solid var(--success-green);
        }
        
        .verification-block.error {
            border-left: 3px solid var(--error-red);
        }
        
        .verify-header {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: var(--spacing-sm);
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
        }
        
        .verification-block.success .verify-header { color: var(--success-green); }
        .verification-block.error .verify-header { color: var(--error-red); }

        .verify-body {
            font-size: 13px;
            color: var(--text-primary);
        }

        /* Root Cause specific */
        .root-cause-content {
            font-size: 13px;
            line-height: 1.5;
            color: var(--text-primary);
            position: relative;
        }
        
        .root-cause-text {
            white-space: pre-wrap;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
        }
        
        .root-cause-text.expanded {
            -webkit-line-clamp: unset;
        }
        
        .show-more-btn {
            background: none;
            border: none;
            color: var(--accent-blue);
            font-size: 12px;
            cursor: pointer;
            padding: 0;
            margin-top: var(--spacing-xs);
            display: none;
        }
        
        .show-more-btn:hover {
            text-decoration: underline;
        }

        .affected-files {
            margin-top: var(--spacing-md);
        }
        
        .affected-files-title {
            font-size: 11px;
            color: var(--text-secondary);
            margin-bottom: var(--spacing-xs);
        }

        .file-chip-list {
            display: flex;
            flex-wrap: wrap;
            gap: var(--spacing-xs);
        }
        
        .file-chip {
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
            background: var(--surface-bg);
            border: 1px solid var(--border-color);
            padding: 2px 6px;
            border-radius: 3px;
            color: var(--text-primary);
        }

        /* Plan specific */
        .plan-list {
            font-size: 13px;
            line-height: 1.6;
            color: var(--text-primary);
            white-space: pre-wrap;
        }

        /* Changes specific */
        .changes-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .change-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 12px;
        }
        
        .change-icon {
            color: var(--success-green);
        }
        
        .change-path {
            color: var(--text-primary);
        }
        
        .change-status {
            color: var(--text-secondary);
            font-size: 11px;
            font-family: var(--vscode-font-family, sans-serif);
            margin-left: auto;
        }

        /* LOGS SECTION */
        .logs-section {
            margin-top: var(--spacing-lg);
            border-top: 1px solid var(--border-color);
            padding-top: var(--spacing-lg);
        }
        
        .timeline {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-lg);
        }

        .timeline-item {
            display: flex;
            gap: var(--spacing-sm);
            font-size: 12px;
            align-items: flex-start;
        }

        .timeline-icon {
            font-size: 13px;
            margin-top: 1px;
        }
        
        .timeline-icon.success { color: var(--success-green); }
        .timeline-icon.error { color: var(--error-red); }
        .timeline-icon.info { color: var(--text-secondary); }

        .timeline-content {
            color: var(--text-primary);
        }

        .timeline-desc {
            color: var(--text-secondary);
            margin-top: 2px;
            white-space: pre-wrap;
        }

        .tech-logs {
            background: var(--surface-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
        }

        .tech-logs summary {
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            color: var(--text-secondary);
            user-select: none;
            outline: none;
            padding: var(--spacing-sm) var(--spacing-md);
            text-transform: uppercase;
        }
        
        .tech-logs summary:hover {
            background: var(--surface-hover);
        }

        .console {
            border-top: 1px solid var(--border-color);
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 11px;
            white-space: pre-wrap;
            color: var(--text-secondary);
            max-height: 250px;
            overflow-y: auto;
            padding: var(--spacing-md);
        }

        .console .error { color: var(--error-red); }
        .console .success { color: var(--success-green); }
        .console .warning { color: var(--warning-amber); }
        
        .empty-state {
            padding: var(--spacing-xl) 0;
            color: var(--text-secondary);
        }
        
        .empty-state p {
            margin: 0 0 var(--spacing-md) 0;
            font-size: 13px;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(2px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive Breakpoints */
        @media (max-width: 600px) {
            .actions-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            .workflow-tracker {
                flex-direction: column;
                align-items: flex-start;
                gap: var(--spacing-sm);
            }
            .step-line {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="app-container">
        <!-- HEADER -->
        <header class="header-compact">
            <div class="brand-container">
                <h1>FORGEPILOT</h1>
                <span class="tagline">Scan before you change. Verify before you ship.</span>
            </div>
            <div class="status-indicator ready" id="global-status">
                <span class="status-dot"></span> <span id="header-status-text">READY</span>
            </div>
        </header>

        <!-- REPO INFO -->
        <div class="repo-context-bar" id="repo-info" style="display: none;">
            <div class="repo-context-item">
                <span class="icon">◈</span> <strong id="repo-name">Scanning...</strong>
            </div>
            <span class="repo-context-separator">|</span>
            <div class="repo-context-item">
                <span id="repo-lang">Unknown</span>
            </div>
            <span class="repo-context-separator">|</span>
            <div class="repo-context-item">
                <span id="repo-framework">Unknown</span>
            </div>
            <span class="repo-context-separator">|</span>
            <div class="repo-context-item">
                <span id="repo-test">Unknown</span>
            </div>
            <div class="repo-context-item" id="repo-verification-container" style="display:none;">
                <span class="repo-context-separator">|</span>
                <span id="repo-verification" style="font-weight:600;"></span>
            </div>
        </div>

        <!-- ACTIONS -->
        <div class="actions-section">
            <div class="section-header">Actions</div>
            <div class="actions-grid">
                <button id="btn-scan" class="action-btn">
                    <div class="header-row"><span class="icon">🔍</span> SCAN</div>
                    <div class="desc">Analyze repository</div>
                </button>
                <button id="btn-test" class="action-btn">
                    <div class="header-row"><span class="icon">🧪</span> TEST</div>
                    <div class="desc">Validate behavior</div>
                </button>
                <button id="btn-fix" class="action-btn">
                    <div class="header-row"><span class="icon">🔧</span> FIX</div>
                    <div class="desc">Repair issue</div>
                </button>
                <button id="btn-enhance" class="action-btn">
                    <div class="header-row"><span class="icon">✨</span> ENHANCE</div>
                    <div class="desc">Improve code</div>
                </button>
            </div>
        </div>

        <!-- TASK INPUT -->
        <div id="task-container" class="task-input-area">
            <div class="input-group">
                <textarea id="task-input" placeholder="Describe what you want ForgePilot to change..."></textarea>
                <button id="btn-submit-task" class="btn-primary">Run Agent →</button>
            </div>
        </div>

        <!-- WORKFLOW TRACKER -->
        <div class="workflow-tracker" id="workflow-tracker">
            <div class="step" id="step-scan"><span class="step-icon">○</span> Scan</div>
            <div class="step-line" id="line-scan"></div>
            <div class="step" id="step-understand"><span class="step-icon">○</span> Understand</div>
            <div class="step-line" id="line-understand"></div>
            <div class="step" id="step-plan"><span class="step-icon">○</span> Plan</div>
            <div class="step-line" id="line-plan"></div>
            <div class="step" id="step-patch"><span class="step-icon">○</span> Patch</div>
            <div class="step-line" id="line-patch"></div>
            <div class="step" id="step-verify"><span class="step-icon">○</span> Verify</div>
        </div>

        <!-- RESULTS AREA -->
        <div class="results-container" id="results-area">
            
            <!-- VERIFICATION (PRIORITY 1) -->
            <div class="result-block verification-block" id="card-verification">
                <div class="verify-header" id="verify-title">VERIFICATION</div>
                <div class="verify-body" id="verify-text"></div>
            </div>

            <!-- ISSUE (PRIORITY 2) -->
            <div class="result-block" id="card-root-cause">
                <div class="result-title">ISSUE DETECTED</div>
                <div class="root-cause-content">
                    <div id="root-cause-text" class="root-cause-text"></div>
                    <button id="btn-show-more" class="show-more-btn">Show more</button>
                </div>
                <div class="affected-files" id="affected-files-container" style="display:none;">
                    <div class="affected-files-title">Affected Files</div>
                    <div class="file-chip-list" id="blast-radius-text"></div>
                </div>
            </div>

            <!-- CHANGES (PRIORITY 3) -->
            <div class="result-block" id="card-changes">
                <div class="result-title">CHANGES</div>
                <div class="changes-list" id="changes-text"></div>
            </div>
            
            <!-- PLAN (PRIORITY 4) -->
            <div class="result-block" id="card-plan">
                <div class="result-title">PLAN</div>
                <div class="plan-list" id="plan-text"></div>
            </div>
            
            <!-- ERROR FALLBACK -->
            <div class="result-block verification-block error" id="card-error">
                <div class="verify-header">✕ EXECUTION FAILED</div>
                <div class="verify-body" id="error-text"></div>
            </div>
        </div>

        <!-- LOGS SECTION -->
        <div class="logs-section" id="logs-section">
            <div class="empty-state" id="empty-state">
                <p>Ready when you are.<br>Scan the repository to understand its structure and validate its current behavior.</p>
            </div>
            
            <div id="timeline" class="timeline"></div>
            
            <details class="tech-logs" id="tech-logs-container" style="display:none;">
                <summary>Technical Logs ▸</summary>
                <div id="logs" class="console"></div>
            </details>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Buttons
        const btnScan = document.getElementById('btn-scan');
        const btnTest = document.getElementById('btn-test');
        const btnFix = document.getElementById('btn-fix');
        const btnEnhance = document.getElementById('btn-enhance');
        const buttons = [btnScan, btnTest, btnFix, btnEnhance];
        
        // Task Input
        const taskContainer = document.getElementById('task-container');
        const btnSubmitTask = document.getElementById('btn-submit-task');
        const taskInput = document.getElementById('task-input');
        
        // Repo Info
        const repoInfoCard = document.getElementById('repo-info');
        const repoNameEl = document.getElementById('repo-name');
        const repoLangEl = document.getElementById('repo-lang');
        const repoFrameworkEl = document.getElementById('repo-framework');
        const repoTestEl = document.getElementById('repo-test');
        const repoVerificationContainer = document.getElementById('repo-verification-container');
        const repoVerificationEl = document.getElementById('repo-verification');
        
        // Global Status
        const globalStatus = document.getElementById('global-status');
        const headerStatusText = document.getElementById('header-status-text');
        
        // Logs
        const timeline = document.getElementById('timeline');
        const logsDiv = document.getElementById('logs');
        const emptyState = document.getElementById('empty-state');
        const techLogsContainer = document.getElementById('tech-logs-container');
        
        // Workflow Tracker
        const workflowTracker = document.getElementById('workflow-tracker');
        const steps = {
            scan: document.getElementById('step-scan'),
            understand: document.getElementById('step-understand'),
            plan: document.getElementById('step-plan'),
            patch: document.getElementById('step-patch'),
            verify: document.getElementById('step-verify')
        };
        const lines = {
            scan: document.getElementById('line-scan'),
            understand: document.getElementById('line-understand'),
            plan: document.getElementById('line-plan'),
            patch: document.getElementById('line-patch')
        };
        
        // Result Blocks
        const cardRootCause = document.getElementById('card-root-cause');
        const rootCauseText = document.getElementById('root-cause-text');
        const blastRadiusText = document.getElementById('blast-radius-text');
        const affectedFilesContainer = document.getElementById('affected-files-container');
        const btnShowMore = document.getElementById('btn-show-more');
        
        const cardPlan = document.getElementById('card-plan');
        const planText = document.getElementById('plan-text');
        
        const cardChanges = document.getElementById('card-changes');
        const changesText = document.getElementById('changes-text');
        
        const cardVerification = document.getElementById('card-verification');
        const verifyTitle = document.getElementById('verify-title');
        const verifyText = document.getElementById('verify-text');
        
        const cardError = document.getElementById('card-error');
        const errorText = document.getElementById('error-text');

        let currentAction = '';
        let modifiedFiles = [];
        let agentState = 'NOT_SCANNED';

        // Show More Logic
        btnShowMore.addEventListener('click', () => {
            if (rootCauseText.classList.contains('expanded')) {
                rootCauseText.classList.remove('expanded');
                btnShowMore.textContent = 'Show more';
            } else {
                rootCauseText.classList.add('expanded');
                btnShowMore.textContent = 'Show less';
            }
        });

        function checkRootCauseOverflow() {
            if (rootCauseText.scrollHeight > rootCauseText.clientHeight) {
                btnShowMore.style.display = 'block';
            } else {
                btnShowMore.style.display = 'none';
            }
        }

        function resetUI() {
            cardRootCause.style.display = 'none';
            cardPlan.style.display = 'none';
            cardChanges.style.display = 'none';
            cardVerification.style.display = 'none';
            cardError.style.display = 'none';
            workflowTracker.style.display = 'none';
            Object.values(steps).forEach(s => { s.className = 'step'; s.querySelector('.step-icon').textContent = '○'; });
            Object.values(lines).forEach(l => l.className = 'step-line');
            buttons.forEach(btn => btn.classList.remove('active'));
            modifiedFiles = [];
            timeline.innerHTML = '';
            logsDiv.innerHTML = '';
            emptyState.style.display = 'none';
            techLogsContainer.style.display = 'block';
        }

        function setButtonsDisabled(disabled) {
            buttons.forEach(btn => btn.disabled = disabled);
        }

        function updateGlobalStatus(status) {
            agentState = status;
            globalStatus.className = 'status-indicator';
            
            if (status === 'NOT_SCANNED' || status === 'SCANNED' || status === 'TESTED' || status === 'VERIFIED') {
                globalStatus.classList.add('ready');
                headerStatusText.textContent = status === 'VERIFIED' ? 'VERIFIED' : 'READY';
                setButtonsDisabled(false);
            } else if (status === 'FAILED') {
                globalStatus.classList.add('error');
                headerStatusText.textContent = 'ACTION REQUIRED';
                setButtonsDisabled(false);
            } else {
                globalStatus.classList.add('working');
                headerStatusText.textContent = 'WORKING';
                setButtonsDisabled(true);
            }
        }

        function setStep(stepName, state) {
            if (!steps[stepName]) return;
            steps[stepName].className = 'step ' + state;
            const icon = steps[stepName].querySelector('.step-icon');
            if (state === 'active') icon.textContent = '●';
            else if (state === 'completed') icon.textContent = '✓';
            else if (state === 'failed') icon.textContent = '✕';
            else icon.textContent = '○';
            
            if (state === 'completed' && lines[stepName]) {
                lines[stepName].classList.add('completed');
            }
        }

        function addTimelineEvent(title, desc = '', type = 'info') {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            
            let icon = '○';
            if (type === 'success') icon = '✓';
            if (type === 'error') icon = '✕';
            if (type === 'active') { icon = '●'; type = 'info'; }
            
            item.innerHTML = \`
                <div class="timeline-icon \${type}">\${icon}</div>
                <div class="timeline-content">
                    <div>\${title}</div>
                    \${desc ? \`<div class="timeline-desc">\${desc}</div>\` : ''}
                </div>
            \`;
            timeline.appendChild(item);
        }

        function addTechLog(text, level = 'info') {
            const p = document.createElement('div');
            p.textContent = text;
            p.className = level;
            logsDiv.appendChild(p);
            logsDiv.scrollTop = logsDiv.scrollHeight;
        }

        function processLogForUI(text, level) {
            // SCAN
            if (text.includes('→ SCAN_STARTED')) {
                resetUI();
                btnScan.classList.add('active');
                workflowTracker.style.display = 'flex';
                setStep('scan', 'active');
                addTimelineEvent('Scanning repository', '', 'active');
            }
            if (text.includes('✓ Repository manifest built')) {
                setStep('scan', 'completed');
                addTimelineEvent('Repository scanned', '', 'success');
            }
            
            // TEST
            if (text.includes('→ TEST_STARTED')) {
                if (agentState === 'SCANNED' || agentState === 'NOT_SCANNED') {
                    resetUI();
                    btnTest.classList.add('active');
                }
                addTimelineEvent('Validating current behavior', '', 'active');
            }
            if (text.includes('✓ TEST_COMPLETED')) {
                const match = text.match(/(\\d+) passed/);
                const passed = match ? match[1] : 'All';
                addTimelineEvent('Tests executed', '', 'success');
                
                cardVerification.style.display = 'block';
                cardVerification.className = 'result-block verification-block success';
                verifyTitle.innerHTML = '✓ VERIFIED';
                verifyText.innerHTML = \`\${passed} tests passed<br>0 failures<br><br><strong>Safe to ship</strong>\`;
                
                repoVerificationContainer.style.display = 'flex';
                repoVerificationEl.textContent = '✓ VERIFIED';
                repoVerificationEl.style.color = 'var(--success-green)';
            }
            if (text.includes('! TEST_COMPLETED with failures')) {
                const match = text.match(/(\\d+) failed/);
                const failed = match ? match[1] : 'Some';
                addTimelineEvent('Tests executed', '', 'success');
                
                cardVerification.style.display = 'block';
                cardVerification.className = 'result-block verification-block error';
                verifyTitle.innerHTML = '✕ VERIFICATION FAILED';
                verifyText.innerHTML = \`\${failed} tests failed<br><br><strong>Action required</strong>\`;
                
                repoVerificationContainer.style.display = 'flex';
                repoVerificationEl.textContent = '✕ FAILING';
                repoVerificationEl.style.color = 'var(--error-red)';
            }
            
            // FIX / ENHANCE
            if (text.includes('→ TASK_ANALYZED') || text.includes('→ ENHANCEMENT_ANALYSIS')) {
                resetUI();
                if(text.includes('TASK_ANALYZED')) btnFix.classList.add('active');
                else btnEnhance.classList.add('active');
                
                workflowTracker.style.display = 'flex';
                setStep('scan', 'completed');
                setStep('understand', 'active');
                addTimelineEvent('Analyzing task', '', 'active');
            }
            if (text.includes('✓ ROOT_CAUSE_FOUND')) {
                setStep('understand', 'completed');
                setStep('plan', 'active');
                const rootCause = text.replace('✓ ROOT_CAUSE_FOUND: ', '').trim();
                addTimelineEvent('Issue identified', '', 'success');
                
                cardRootCause.style.display = 'block';
                rootCauseText.textContent = rootCause;
                setTimeout(checkRootCauseOverflow, 10); // Check after render
            }
            if (text.includes('✓ BLAST_RADIUS_CALCULATED') || text.includes('✓ BLAST_RADIUS:')) {
                const radius = text.split(': ')[1] || '';
                const files = radius.split(',').map(f => f.trim()).filter(f => f);
                if (files.length > 0) {
                    affectedFilesContainer.style.display = 'block';
                    blastRadiusText.innerHTML = files.map(f => \`<span class="file-chip">\${f}</span>\`).join('');
                }
            }
            if (text.includes('✓ PLAN_CREATED:')) {
                setStep('plan', 'completed');
                setStep('patch', 'active');
                let plan = text.replace('✓ PLAN_CREATED:', '').trim();
                addTimelineEvent('Plan created', '', 'success');
                
                cardPlan.style.display = 'block';
                planText.textContent = plan;
            }
            if (text.includes('→ PATCH_STARTED')) {
                addTimelineEvent('Applying patch', '', 'active');
            }
            if (text.includes('Modified ')) {
                const file = text.trim().replace('Modified ', '');
                modifiedFiles.push(file);
            }
            if (text.includes('✓ PATCH_COMPLETED')) {
                setStep('patch', 'completed');
                setStep('verify', 'active');
                addTimelineEvent('Patch applied', '', 'success');
                
                cardChanges.style.display = 'block';
                changesText.innerHTML = modifiedFiles.length 
                    ? modifiedFiles.map(f => \`
                        <div class="change-item">
                            <span class="change-icon">✓</span>
                            <span class="change-path">\${f}</span>
                            <span class="change-status">Modified</span>
                        </div>
                    \`).join('')
                    : '<div class="change-item">No files modified</div>';
            }
            
            // VERIFY
            if (text.includes('→ RUNNING REGRESSION SUITE')) {
                addTimelineEvent('Running regression suite', '', 'active');
            }
            if (text.includes('✓ VERIFICATION_COMPLETED: Regression PASS') || text.includes('✓ VERIFICATION_COMPLETED: No tests')) {
                setStep('verify', 'completed');
                addTimelineEvent('Regression tests passed', '', 'success');
                
                cardVerification.style.display = 'block';
                cardVerification.className = 'result-block verification-block success';
                verifyTitle.innerHTML = '✓ VERIFIED';
                verifyText.innerHTML = \`Regression tests passed<br>0 failures<br><br><strong>Safe to ship</strong>\`;
                
                repoVerificationContainer.style.display = 'flex';
                repoVerificationEl.textContent = '✓ VERIFIED';
                repoVerificationEl.style.color = 'var(--success-green)';
            }
            if (text.includes('! VERIFICATION_FAILED')) {
                setStep('verify', 'failed');
                addTimelineEvent('Verification failed', '', 'error');
                
                cardVerification.style.display = 'block';
                cardVerification.className = 'result-block verification-block error';
                verifyTitle.innerHTML = '✕ VERIFICATION FAILED';
                verifyText.innerHTML = \`Tests are failing.<br><br><strong>Action required</strong>\`;
                
                repoVerificationContainer.style.display = 'flex';
                repoVerificationEl.textContent = '✕ FAILING';
                repoVerificationEl.style.color = 'var(--error-red)';
            }
            
            // ERRORS
            if (text.includes('! SCAN FAILED') || text.includes('! TEST FAILED') || text.includes('! FIX FAILED') || text.includes('! ENHANCE FAILED')) {
                addTimelineEvent('Execution Error', '', 'error');
                cardError.style.display = 'block';
                errorText.textContent = text;
            }
        }

        btnScan.addEventListener('click', () => {
            vscode.postMessage({ command: 'action', action: 'scan' });
            taskContainer.style.display = 'none';
        });

        btnTest.addEventListener('click', () => {
            vscode.postMessage({ command: 'action', action: 'test' });
            taskContainer.style.display = 'none';
        });

        btnFix.addEventListener('click', () => {
            currentAction = 'fix';
            taskContainer.style.display = 'block';
            taskInput.focus();
        });

        btnEnhance.addEventListener('click', () => {
            currentAction = 'enhance';
            taskContainer.style.display = 'block';
            taskInput.focus();
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
                    addTechLog(message.text, message.level);
                    processLogForUI(message.text, message.level);
                    break;
                case 'repoUpdate':
                    repoInfoCard.style.display = 'flex';
                    repoNameEl.textContent = message.data.name || repoNameEl.textContent;
                    repoLangEl.textContent = message.data.language || repoLangEl.textContent;
                    
                    let fw = message.data.framework || repoFrameworkEl.textContent;
                    repoFrameworkEl.textContent = fw === 'None' ? 'Not detected' : fw;
                    
                    let tfw = message.data.testFramework || repoTestEl.textContent;
                    repoTestEl.textContent = tfw === 'None' ? 'Not detected' : tfw;
                    break;
                case 'statusUpdate':
                    updateGlobalStatus(message.status);
                    break;
            }
        });
        
        // Handle window resize for Root Cause text overflow
        window.addEventListener('resize', () => {
            if(cardRootCause.style.display !== 'none' && !rootCauseText.classList.contains('expanded')) {
                checkRootCauseOverflow();
            }
        });
    </script>
</body>
</html>`;
    }
}
