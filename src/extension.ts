// src/extension.ts
import * as vscode from 'vscode';
import { DebugNotebookSerializer } from './notebookSerializer';
import { DebugNotebookController } from './notebookController';
import { DebugOutputTracker } from './debugTracker';

export function activate(context: vscode.ExtensionContext) {
    console.log('Debug Notebook extension is now active!');

    // Register notebook serializer
    const serializer = new DebugNotebookSerializer();
    context.subscriptions.push(
        vscode.workspace.registerNotebookSerializer('debug-notebook', serializer, {
            transientOutputs: true
        })
    );

    // Create and register notebook controller
    const controller = new DebugNotebookController(context);
    
    // Register debug adapter tracker for Python and Node
    const tracker = new DebugOutputTracker(controller);
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterTrackerFactory('python', tracker),
        vscode.debug.registerDebugAdapterTrackerFactory('node', tracker),
        vscode.debug.registerDebugAdapterTrackerFactory('pwa-node', tracker),
        vscode.debug.registerDebugAdapterTrackerFactory('*', tracker)  // Fallback
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('debugNotebook.newNotebook', async () => {
            const defaultLanguage = vscode.workspace.getConfiguration('debugNotebook').get('defaultLanguage', 'python');
            const notebookData = new vscode.NotebookData([
                new vscode.NotebookCellData(vscode.NotebookCellKind.Code, `# Welcome to Debug Notebook\n# Run cells to execute code in the debug console`, defaultLanguage)
            ]);
            
            const document = await vscode.workspace.openNotebookDocument('debug-notebook', notebookData);
            await vscode.window.showNotebookDocument(document);
        })
    );

    // Note: No need for runCell command anymore as Shift+Enter works by default
    // Note: No need for openWithActiveSession anymore as it connects automatically
}

export function deactivate() {
    // Cleanup if needed
}