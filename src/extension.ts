import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { WebviewManager } from './ui/WebviewManager';
import { ForgePilotAgent } from './agent/ForgePilotAgent';

export function activate(context: vscode.ExtensionContext) {
    // Load .env from the extension root directory
    dotenv.config({ path: path.join(context.extensionPath, '.env') });
    console.log('ForgePilot is now active!');

    let disposable = vscode.commands.registerCommand('forgepilot.start', () => {
        WebviewManager.createOrShow(context.extensionUri);

        const currentPanel = WebviewManager.currentPanel;
        if (currentPanel) {
            currentPanel._panel.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case 'action':
                        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                        if (!workspaceRoot) {
                            currentPanel.sendMessage({ command: 'log', text: '! No workspace opened.', level: 'error' });
                            return;
                        }

                        // We can instantiate or reuse the agent. 
                        // In a real app we'd reuse the agent to keep state.
                        if (!(global as any).forgePilotAgent) {
                            (global as any).forgePilotAgent = new ForgePilotAgent(workspaceRoot, (msg: string, level: string, data?: any) => {
                                if (data?.type === 'repoUpdate') {
                                    currentPanel!.sendMessage({ command: 'repoUpdate', data: data.payload });
                                } else if (data?.type === 'statusUpdate') {
                                    currentPanel!.sendMessage({ command: 'statusUpdate', status: data.status });
                                } else {
                                    currentPanel!.sendMessage({ command: 'log', text: msg, level });
                                }
                            });
                        }
                        
                        const agent = (global as any).forgePilotAgent as ForgePilotAgent;
                        
                        try {
                            if (message.action === 'scan') await agent.scan();
                            else if (message.action === 'test') await agent.test();
                            else if (message.action === 'fix') await agent.fix(message.text);
                            else if (message.action === 'enhance') await agent.enhance(message.text);
                        } catch(e: any) {
                            currentPanel.sendMessage({ command: 'log', text: `Error: ${e.message}`, level: 'error' });
                        }
                        break;
                }
            }, undefined, context.subscriptions);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
