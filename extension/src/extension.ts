// src/extension.ts
import * as vscode from 'vscode';
import { DebugNotebookSerializer } from './notebookSerializer';
import { DebugNotebookController } from './notebookController';
import { DebugOutputTracker } from './debugTracker';

export function activate(context: vscode.ExtensionContext) {
    const serializer = new DebugNotebookSerializer();
    context.subscriptions.push(
        vscode.workspace.registerNotebookSerializer('debug-notebook', serializer, {
            transientOutputs: false,
            transientCellMetadata: { executionOrder: true },
        })
    );

    const controller = new DebugNotebookController(context);
    const tracker = new DebugOutputTracker(controller);

    // Single wildcard registration. The previous code registered python/node/pwa-node/*
    // separately, and DAP fires every matching factory — each output was captured twice.
    context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('*', tracker));

    context.subscriptions.push(
        vscode.commands.registerCommand('debugNotebook.newNotebook', async () => {
            const defaultLanguage = vscode.workspace
                .getConfiguration('debugNotebook')
                .get<string>('defaultLanguage', 'python');
            const notebookData = new vscode.NotebookData([
                new vscode.NotebookCellData(
                    vscode.NotebookCellKind.Code,
                    '# Welcome to Debug Notebook.\n# Start a debug session, pause, then run cells against the live frame.\n',
                    defaultLanguage
                ),
            ]);
            const document = await vscode.workspace.openNotebookDocument('debug-notebook', notebookData);
            await vscode.window.showNotebookDocument(document);
        })
    );
}

export function deactivate(): void {
    // nothing to do; subscriptions handle teardown
}
