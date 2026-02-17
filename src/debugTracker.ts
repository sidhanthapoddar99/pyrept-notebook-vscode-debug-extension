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
        // Log all messages for debugging (with better formatting for output events)
        if (message.type === 'event' && message.event === 'output') {
            console.log('Debug adapter output:', JSON.stringify(message.body));
        } else {
            console.log('Debug adapter message:', message);
        }
        
        if (message.type === 'event' && message.event === 'output') {
            const output = message.body?.output;
            const category = message.body?.category || 'stdout';
            
            // Only capture output if we have an active execution
            const execution = this._controller.getCurrentExecution();
            if (execution && output) {
                console.log(`Captured output (${category}): ${JSON.stringify(output)}`);
                
                // Don't filter out empty strings or newlines - they might be important
                // Append output to the buffer
                if (category === 'stdout' || category === 'console') {
                    this._controller.appendOutput(output, false);
                } else if (category === 'stderr' || category === 'important') {
                    this._controller.appendOutput(output, true);
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