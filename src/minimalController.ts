// src/minimalController.ts
// This is a simplified version for testing debug session connection

import * as vscode from 'vscode';

export class MinimalDebugController {
    private _controller: vscode.NotebookController;

    constructor(context: vscode.ExtensionContext) {
        this._controller = vscode.notebooks.createNotebookController(
            'minimal-debug-controller',
            'debug-notebook',
            'Debug Session Test'
        );

        this._controller.supportedLanguages = ['python'];
        this._controller.executeHandler = this._executeHandler.bind(this);
        context.subscriptions.push(this._controller);
    }

    private async _executeHandler(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): Promise<void> {
        for (const cell of cells) {
            const execution = this._controller.createNotebookCellExecution(cell);
            execution.start(Date.now());
            execution.clearOutput();

            try {
                const session = vscode.debug.activeDebugSession;
                if (!session) {
                    throw new Error('No active debug session');
                }

                // Simple test - evaluate directly
                const code = cell.document.getText();
                const response = await session.customRequest('evaluate', {
                    expression: code,
                    context: 'repl'
                });

                // Show result
                const resultText = response?.result || 'No result';
                const output = new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.text(resultText)
                ]);
                execution.appendOutput(output);

                execution.end(true, Date.now());
            } catch (error: any) {
                const errorOutput = new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.text(`Error: ${error.message}`)
                ]);
                execution.appendOutput(errorOutput);
                execution.end(false, Date.now());
            }
        }
    }
}