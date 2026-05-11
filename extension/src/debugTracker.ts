// src/debugTracker.ts
import * as vscode from 'vscode';
import { DebugNotebookController } from './notebookController';

export class DebugOutputTracker implements vscode.DebugAdapterTrackerFactory {
    constructor(private readonly _controller: DebugNotebookController) {}

    createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
        return new SessionTracker(this._controller, session);
    }
}

class SessionTracker implements vscode.DebugAdapterTracker {
    constructor(
        private readonly _controller: DebugNotebookController,
        private readonly _session: vscode.DebugSession
    ) {}

    onDidSendMessage(message: any): void {
        if (message?.type !== 'event' || message.event !== 'output') {
            return;
        }
        const output: string | undefined = message.body?.output;
        if (!output) {
            return;
        }
        const category: string = message.body?.category ?? 'stdout';
        const isError = category === 'stderr' || category === 'important';
        if (category === 'telemetry') {
            return;
        }
        this._controller.onSessionOutput(this._session.id, output, isError);
    }
}
