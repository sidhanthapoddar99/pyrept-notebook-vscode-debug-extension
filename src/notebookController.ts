// src/notebookController.ts
import * as vscode from 'vscode';

export class DebugNotebookController {
    private _controller: vscode.NotebookController;
    private _currentExecution: vscode.NotebookCellExecution | undefined;
    private _context: vscode.ExtensionContext;
    private _outputBuffer: string = '';
    private _errorBuffer: string = '';
    private _outputResolve?: () => void;

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
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
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
        
        // Reset output buffers
        this._outputBuffer = '';
        this._errorBuffer = '';

        try {
            // First try to use the active debug session
            let session = vscode.debug.activeDebugSession;
            
            if (!session) {
                throw new Error('No active debug session. Please start debugging first.');
            }

            // Log session information for debugging
            console.log(`Using debug session: ${session.name} (${session.type})`);
            
            const code = this._prepareCode(cell.document.getText(), cell.document.languageId);
            
            // Get current stack frame if debugger is paused
            let frameId: number | undefined;
            try {
                // Get threads
                const threadsResponse = await session.customRequest('threads', {});
                console.log('Threads response:', threadsResponse);
                
                if (threadsResponse && threadsResponse.threads && threadsResponse.threads.length > 0) {
                    // Use the first thread (usually the main thread)
                    const threadId = threadsResponse.threads[0].id;
                    
                    // Get stack trace
                    const stackTraceResponse = await session.customRequest('stackTrace', {
                        threadId: threadId,
                        startFrame: 0,
                        levels: 1
                    });
                    console.log('Stack trace response:', stackTraceResponse);
                    
                    if (stackTraceResponse && stackTraceResponse.stackFrames && stackTraceResponse.stackFrames.length > 0) {
                        frameId = stackTraceResponse.stackFrames[0].id;
                        console.log(`Using frame ID: ${frameId}`);
                    }
                }
            } catch (e) {
                console.log('Error getting stack frame:', e);
                // Continue without frameId - will use global scope
            }
            
            // Create a promise to wait for output to complete
            let outputResolve: () => void;
            let outputReject: (reason?: any) => void;
            const outputPromise = new Promise<void>((resolve, reject) => {
                outputResolve = resolve;
                outputReject = reject;
            });
            
            // Set up a timeout to resolve the promise after a short delay
            const outputTimeout = setTimeout(() => {
                console.log('Output timeout reached, resolving...');
                outputResolve();
            }, 500); // Wait up to 500ms for output
            
            // Store the resolve function to be called when output is captured
            this._outputResolve = () => {
                console.log('Output resolved by tracker');
                clearTimeout(outputTimeout);
                outputResolve();
            };
            
            // Execute the code
            console.log(`Evaluating code: ${code}`);
            const response = await session.customRequest('evaluate', {
                expression: code,
                context: 'repl',
                frameId: frameId
            });
            console.log('Evaluate response:', response);

            // Wait for output to complete
            await outputPromise;

            // Handle result - only add if it's not None and not already in output
            if (response && response.result && response.result !== 'None') {
                const hasOutput = this._outputBuffer.length > 0;
                const isPrintStatement = code.trim().startsWith('print(');
                
                // Only add evaluate result if there's no output and it's not a print statement
                if (!hasOutput && !isPrintStatement) {
                    this._outputBuffer = response.result;
                }
            }
            
            // Update final output
            this._updateCellOutput(execution);

            execution.end(true, Date.now());
        } catch (error: any) {
            console.error('Error executing cell:', error);
            const errorMessage = error?.message || String(error);
            
            // Add error to error buffer
            this._errorBuffer += errorMessage;
            
            // Show final output including any stdout and the error
            this._updateCellOutput(execution);
            execution.end(false, Date.now());
        } finally {
            this._currentExecution = undefined;
            this._outputBuffer = '';
            this._errorBuffer = '';
            this._outputResolve = undefined;
        }
    }

    private _prepareCode(code: string, language: string): string {
        const lines = code.split('\n');
        
        if (language === 'python' && lines.length > 1) {
            // For multi-line Python code, use exec()
            const escapedCode = code.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
            return `exec("${escapedCode}")`;
        }
        
        // For single-line Python or JavaScript, return as-is
        return code;
    }

    private _updateCellOutput(execution: vscode.NotebookCellExecution) {
        const outputs: vscode.NotebookCellOutputItem[] = [];
        
        if (this._outputBuffer) {
            outputs.push(vscode.NotebookCellOutputItem.text(this._outputBuffer));
        }
        
        if (this._errorBuffer) {
            outputs.push(vscode.NotebookCellOutputItem.error({ 
                name: 'Error', 
                message: this._errorBuffer 
            }));
        }
        
        if (outputs.length > 0) {
            const output = new vscode.NotebookCellOutput(outputs);
            execution.replaceOutput(output);
        }
    }

    getCurrentExecution(): vscode.NotebookCellExecution | undefined {
        return this._currentExecution;
    }

    appendOutput(text: string, isError: boolean = false) {
        if (this._currentExecution) {
            console.log(`Appending output: ${text} (error: ${isError})`);
            
            if (isError) {
                this._errorBuffer += text;
            } else {
                this._outputBuffer += text;
            }
            
            // Update the output with the accumulated text
            this._updateCellOutput(this._currentExecution);
            
            // Resolve the output promise if it exists
            if (this._outputResolve && this._outputBuffer.length > 0) {
                this._outputResolve();
                this._outputResolve = undefined;
            }
        }
    }
}