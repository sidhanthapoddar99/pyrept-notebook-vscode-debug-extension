// src/notebookController.ts
import * as vscode from 'vscode';

export class DebugNotebookController {
    private _controller: vscode.NotebookController;
    private _debugSessions: Map<string, vscode.DebugSession> = new Map();
    private _currentExecution: vscode.NotebookCellExecution | undefined;
    private _context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
        this._controller = vscode.notebooks.createNotebookController(
            'debug-notebook-controller',
            'debug-notebook',
            'Debug Console Kernel'
        );

        this._controller.supportedLanguages = ['python', 'javascript'];
        this._controller.supportsExecutionOrder = true;
        this._controller.description = 'Execute code in debug console';
        this._controller.executeHandler = this._executeHandler.bind(this);

        context.subscriptions.push(this._controller);
    }

    private async _executeHandler(
        cells: vscode.NotebookCell[],
        notebook: vscode.NotebookDocument,
        controller: vscode.NotebookController
    ): Promise<void> {
        for (const cell of cells) {
            await this.executeCell(cell);
        }
    }

    async executeCell(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        this._currentExecution = execution;
        execution.start(Date.now());
        execution.clearOutput();

        try {
            const session = await this._ensureDebugSession(cell.document.languageId);
            const code = this._prepareCode(cell.document.getText(), cell.document.languageId);
            
            // Get current stack frame if debugger is paused
            let frameId: number | undefined;
            if (session.type === 'python' || session.type === 'pwa-node') {
                try {
                    const threads = await session.customRequest('threads', {});
                    if (threads.threads && threads.threads.length > 0) {
                        const stackTrace = await session.customRequest('stackTrace', {
                            threadId: threads.threads[0].id
                        });
                        if (stackTrace.stackFrames && stackTrace.stackFrames.length > 0) {
                            frameId = stackTrace.stackFrames[0].id;
                        }
                    }
                } catch (e) {
                    // Ignore errors - use global scope
                }
            }
            
            const response = await session.customRequest('evaluate', {
                expression: code,
                context: 'repl',
                frameId: frameId
            });

            // Handle result
            if (response && response.result && response.result.length > 0) {
                const output = new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.text(response.result)
                ]);
                execution.appendOutput(output);
            }

            execution.end(true, Date.now());
        } catch (error) {
            const errorOutput = new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.error(error as Error)
            ]);
            execution.appendOutput(errorOutput);
            execution.end(false, Date.now());
        } finally {
            this._currentExecution = undefined;
        }
    }

    private async _ensureDebugSession(language: string): Promise<vscode.DebugSession> {
        // First, check if there's an active debug session of the right type
        const activeSession = vscode.debug.activeDebugSession;
        if (activeSession && activeSession.type.includes(language)) {
            return activeSession;
        }

        const notebookUri = vscode.window.activeNotebookEditor?.notebook.uri.toString() || 'default';
        
        let session = this._debugSessions.get(notebookUri);
        if (session && session.type.includes(language)) {
            return session;
        }

        // Start new debug session
        const config = this._getDebugConfig(language);
        const started = await vscode.debug.startDebugging(undefined, config);
        
        if (!started) {
            throw new Error(`Failed to start debug session for ${language}`);
        }

        session = vscode.debug.activeDebugSession!;
        this._debugSessions.set(notebookUri, session);

        // Listen for session termination
        const disposable = vscode.debug.onDidTerminateDebugSession(terminatedSession => {
            if (terminatedSession === session) {
                this._debugSessions.delete(notebookUri);
                disposable.dispose();
            }
        });

        this._context.subscriptions.push(disposable);
        return session;
    }

    private _getDebugConfig(language: string): vscode.DebugConfiguration {
        switch (language) {
            case 'python':
                return {
                    type: 'python',
                    request: 'launch',
                    name: 'Debug Notebook Python',
                    console: 'internalConsole',
                    justMyCode: false,
                    // Use a simple Python REPL approach
                    module: 'code',
                    args: []
                };
            case 'javascript':
                return {
                    type: 'pwa-node',
                    request: 'launch',
                    name: 'Debug Notebook JavaScript',
                    console: 'internalConsole',
                    // Start Node in interactive mode
                    program: 'node',
                    args: ['-i']
                };
            default:
                throw new Error(`Unsupported language: ${language}`);
        }
    }

    private _prepareCode(code: string, language: string): string {
        const lines = code.split('\n');
        
        if (language === 'python' && lines.length > 1) {
            // Wrap multi-line Python code in exec()
            const escapedCode = code.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
            return `exec("${escapedCode}")`;
        }
        
        // For JavaScript or single-line code, return as-is
        return code;
    }

    getCurrentExecution(): vscode.NotebookCellExecution | undefined {
        return this._currentExecution;
    }

    appendOutput(text: string, isError: boolean = false) {
        if (this._currentExecution) {
            const outputItem = isError 
                ? vscode.NotebookCellOutputItem.error(new Error(text))
                : vscode.NotebookCellOutputItem.text(text);
            
            const output = new vscode.NotebookCellOutput([outputItem]);
            this._currentExecution.appendOutput(output);
        }
    }
}