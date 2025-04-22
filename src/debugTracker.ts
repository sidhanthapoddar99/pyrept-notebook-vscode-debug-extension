// src/debugTracker.ts
import * as vscode from 'vscode';
import { DebugNotebookController } from './notebookController';

export class DebugOutputTracker implements vscode.DebugAdapterTrackerFactory {
    constructor(private _controller: DebugNotebookController) {}

    createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
        return new DebugAdapterTracker(this._controller);
    }
}

class DebugAdapterTracker implements vscode.DebugAdapterTracker {
    private _outputBuffer: string = '';

    constructor(private _controller: DebugNotebookController) {}

    onDidSendMessage(message: any): void {
        if (message.type === 'event' && message.event === 'output') {
            const output = message.body?.output || '';
            const category = message.body?.category || 'stdout';
            
            const execution = this._controller.getCurrentExecution();
            if (execution) {
                // Handle different output categories
                if (category === 'stdout' || category === 'console') {
                    this._controller.appendOutput(output, false);
                } else if (category === 'stderr') {
                    this._controller.appendOutput(output, true);
                }
            }
        }
    }

    onWillStartSession(): void {
        // Reset output buffer when session starts
        this._outputBuffer = '';
    }

    onWillStopSession(): void {
        // Cleanup if needed
    }
}