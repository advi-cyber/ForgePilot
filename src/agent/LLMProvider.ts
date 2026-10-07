import * as vscode from 'vscode';
import * as https from 'https';

export interface LLMMessage {
    role: 'user' | 'model' | 'system';
    content: string;
}

export abstract class LLMProvider {
    abstract generateContent(messages: LLMMessage[]): Promise<string>;
}

export class GroqProvider extends LLMProvider {
    private apiKey: string;
    private model: string;

    constructor() {
        super();
        const config = vscode.workspace.getConfiguration('forgepilot');
        let key = config.get<string>('apiKey');
        if (!key) {
            key = process.env.GROQ_API_KEY;
        }
        if (!key) {
            throw new Error('Groq API key is not configured. Add GROQ_API_KEY to .env.');
        }
        this.apiKey = key;
        this.model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    }

    async generateContent(messages: LLMMessage[]): Promise<string> {
        return this.executeWithRetry(messages, 2, 500);
    }

    private async executeWithRetry(messages: LLMMessage[], retriesLeft: number, backoffMs: number): Promise<string> {
        try {
            return await this.makeRequest(messages);
        } catch (error: any) {
            const isTransient = error.message.includes('429') || 
                                error.message.includes('500') || 
                                error.message.includes('502') || 
                                error.message.includes('503') || 
                                error.message.includes('network');
                                
            if (isTransient && retriesLeft > 0) {
                await new Promise(r => setTimeout(r, backoffMs));
                return this.executeWithRetry(messages, retriesLeft - 1, backoffMs * 2);
            }
            throw error;
        }
    }

    private makeRequest(messages: LLMMessage[]): Promise<string> {
        const groqMessages = messages.map(m => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content
        }));

        const payload = {
            model: this.model,
            messages: groqMessages,
            max_tokens: 800
        };

        return new Promise((resolve, reject) => {
            const data = JSON.stringify(payload);
            const req = https.request({
                hostname: 'api.groq.com',
                port: 443,
                path: '/openai/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Length': Buffer.byteLength(data)
                }
            }, (res: any) => {
                let responseBody = '';
                res.on('data', (chunk: any) => { responseBody += chunk; });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        return reject(new Error(`API Error ${res.statusCode}: ${responseBody}`));
                    }
                    try {
                        const parsed = JSON.parse(responseBody);
                        if (parsed.choices && parsed.choices.length > 0 && parsed.choices[0].message && parsed.choices[0].message.content) {
                            resolve(parsed.choices[0].message.content);
                        } else {
                            reject(new Error(`Empty model response: ${responseBody}`));
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse response: ${responseBody}`));
                    }
                });
            });

            req.on('error', (e: any) => reject(new Error(`network failure: ${e.message}`)));
            req.write(data);
            req.end();
        });
    }
}
