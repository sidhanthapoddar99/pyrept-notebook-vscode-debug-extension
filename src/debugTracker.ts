// src/debugTracker.ts
import * as vscode from 'vscode';
import { DebugNotebookController } from './notebookController';

export class DebugOutputTracker implements vscode.DebugAdapterTrackerFactory {
    constructor(private _controller: DebugNotebookController) {}

    createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
        return new DebugAdapterTracker(this._controller, session);
    }
}

class DebugAdapterTracker implements vscode.DebugAdapterTracker {
    constructor(
        private _controller: DebugNotebookController,
        private _session: vscode.DebugSession
    ) {}

    onDidSendMessage(message: any): void {
        // Log all messages for debugging
        console.log('Debug adapter message:', JSON.stringify(message, null, 2));
        
        if (message.type === 'event' && message.event === 'output') {
            const output = message.body?.output;
            const category = message.body?.category || 'stdout';
            
            // Only capture output if we have an active execution
            const execution = this._controller.getCurrentExecution();
            if (execution && output) {
                console.log(`Captured output (${category}): ${output}`);
                
                // Check if this is actual output (not empty or just newlines)
                const hasContent = output.trim().length > 0;
                
                if (hasContent) {
                    // Append output to the buffer
                    if (category === 'stdout' || category === 'console') {
                        this._controller.appendOutput(output, false);
                    } else if (category === 'stderr' || category === 'important') {
                        this._controller.appendOutput(output, true);
                    }
                }
            }
        }
        
        // Also capture evaluation results
        if (message.type === 'response' && message.command === 'evaluate') {
            console.log('Evaluate response in tracker:', message);
        }
    }

    onWillStartSession(): void {
        console.log(`Debug session starting: ${this._session.name}`);
    }

    onWillStopSession(): void {
        console.log(`Debug session stopping: ${this._session.name}`);
    }

    onError(error: Error): void {
        console.error('Debug adapter error:', error);
    }

    onExit(code: number | undefined, signal: string | undefined): void {
        console.log(`Debug adapter exited with code ${code}, signal ${signal}`);
    }
}