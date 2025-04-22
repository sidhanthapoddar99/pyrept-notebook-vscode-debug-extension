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
    
    // Register debug adapter tracker
    const tracker = new DebugOutputTracker(controller);
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterTrackerFactory('*', tracker)
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

    context.subscriptions.push(
        vscode.commands.registerCommand('debugNotebook.runCell', () => {
            const editor = vscode.window.activeNotebookEditor;
            if (editor) {
                const cell = editor.notebook.cellAt(editor.selections[0].start);
                controller.executeCell(cell);
            }
        })
    );

    // New command to use with existing debug session
    context.subscriptions.push(
        vscode.commands.registerCommand('debugNotebook.openWithActiveSession', async () => {
            if (!vscode.debug.activeDebugSession) {
                vscode.window.showErrorMessage('No active debug session. Start debugging first.');
                return;
            }

            const language = vscode.debug.activeDebugSession.type.includes('python') ? 'python' : 
                            vscode.debug.activeDebugSession.type.includes('node') ? 'javascript' : 
                            'python';

            const notebookData = new vscode.NotebookData([
                new vscode.NotebookCellData(
                    vscode.NotebookCellKind.Code, 
                    `# Debug Notebook connected to active session\n# You can inspect and manipulate variables in the current debug context\n\n# Example: print local variables\nprint(locals())`, 
                    language
                )
            ]);
            
            const document = await vscode.workspace.openNotebookDocument('debug-notebook', notebookData);
            await vscode.window.showNotebookDocument(document);
        })
    );
}

export function deactivate() {
    // Cleanup if needed
}