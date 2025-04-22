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

    private isDebugStackFrame(item: any): item is vscode.DebugStackFrame {
        return item && 'frameId' in item && 'threadId' in item;
    }

    private isDebugThread(item: any): item is vscode.DebugThread {
        return item && 'threadId' in item && 'name' in item && !('frameId' in item);
    }

    private async _getCurrentThreadAndFrame(session: vscode.DebugSession): Promise<{ threadId?: number, frameId?: number }> {
        try {
            // First check if there's an active stack item (thread or stack frame)
            const activeStackItem = vscode.debug.activeStackItem;
            console.log('Active stack item:', activeStackItem);

            let threadId: number | undefined;
            let frameId: number | undefined;

            if (activeStackItem) {
                if (this.isDebugStackFrame(activeStackItem)) {
                    // It's a DebugStackFrame
                    threadId = activeStackItem.threadId;
                    frameId = activeStackItem.frameId;
                    console.log(`Using active stack frame: thread ${threadId}, frame ${frameId}`);
                } else if (this.isDebugThread(activeStackItem)) {
                    // It's a DebugThread
                    threadId = activeStackItem.threadId;
                    console.log(`Using active thread: ${threadId}`);
                }
            }

            // If we have a thread but no frame, get the top frame
            if (threadId && !frameId) {
                const stackTraceResponse = await session.customRequest('stackTrace', {
                    threadId: threadId,
                    startFrame: 0,
                    levels: 1
                });
                
                if (stackTraceResponse && stackTraceResponse.stackFrames && stackTraceResponse.stackFrames.length > 0) {
                    frameId = stackTraceResponse.stackFrames[0].id;
                    console.log(`Got top frame for thread ${threadId}: frame ${frameId}`);
                }
            }

            // Fallback: If no active stack item, use the first thread (traditional behavior)
            if (!threadId) {
                const threadsResponse = await session.customRequest('threads', {});
                console.log('Threads response:', threadsResponse);
                
                if (threadsResponse && threadsResponse.threads && threadsResponse.threads.length > 0) {
                    threadId = threadsResponse.threads[0].id;
                    console.log(`Falling back to first thread: ${threadId}`);
                    
                    // Get the top frame for this thread
                    const stackTraceResponse = await session.customRequest('stackTrace', {
                        threadId: threadId,
                        startFrame: 0,
                        levels: 1
                    });
                    
                    if (stackTraceResponse && stackTraceResponse.stackFrames && stackTraceResponse.stackFrames.length > 0) {
                        frameId = stackTraceResponse.stackFrames[0].id;
                        console.log(`Got top frame for fallback thread: frame ${frameId}`);
                    }
                }
            }

            return { threadId, frameId };
        } catch (e) {
            console.log('Error getting thread/frame:', e);
            return {};
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
            
            // Get current thread and frame context
            const { threadId, frameId } = await this._getCurrentThreadAndFrame(session);
            
            if (threadId) {
                console.log(`Executing in thread ${threadId}, frame ${frameId || 'global'}`);
            } else {
                console.log('No specific thread context available, using global context');
            }
            
            // Create a promise to wait for output to complete
            let outputResolve: () => void;
            let outputReject: (reason?: any) => void;
            const outputPromise = new Promise<void>((resolve, reject) => {
                outputResolve = resolve;
                outputReject = reject;
            });
            
            // Shorter timeout for expressions vs statements
            const isExpression = !code.trim().includes('print(') && !code.trim().includes('=');
            const timeoutDuration = isExpression ? 50 : 200;
            
            // Set up a timeout to resolve the promise after a short delay
            const outputTimeout = setTimeout(() => {
                console.log('Output timeout reached, resolving...');
                outputResolve();
            }, timeoutDuration);
            
            // Store the resolve function to be called when output is captured
            this._outputResolve = () => {
                console.log('Output resolved by tracker');
                clearTimeout(outputTimeout);
                outputResolve();
            };
            
            // Execute the code with thread context
            console.log(`Evaluating code: ${code}`);
            const evaluateRequest: any = {
                expression: code,
                context: 'repl'
            };
            
            // Only add frameId if we have one, otherwise use global context
            if (frameId) {
                evaluateRequest.frameId = frameId;
            }
            
            const response = await session.customRequest('evaluate', evaluateRequest);
            console.log('Evaluate response:', response);

            // If there's a result and no print statement, we don't need to wait
            if (response && response.result && response.result !== 'None' && !code.includes('print(')) {
                clearTimeout(outputTimeout);
                // outputResolve();
            } else {
                // Wait for output to complete
                await outputPromise;
            }

            // Handle result - only add if it's not None and not already in output
            if (response && response.result && response.result !== 'None') {
                const hasOutput = this._outputBuffer.length > 0;
                const isPrintStatement = code.trim().includes('print(');
                
                // Only add evaluate result if there's no output and it's not a print statement
                if (!hasOutput && !isPrintStatement) {
                    // Add newline after result for consistency
                    this._outputBuffer = response.result + '\n';
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
        const lines = code.split('\n').filter(line => line.trim().length > 0);
        
        if (language === 'python' && lines.length > 1) {
            // For multi-line Python code, use exec()
            // Ensure proper escaping of special characters
            const escapedCode = code
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
            return `exec("${escapedCode}")`;
        }
        
        // For single-line Python or JavaScript, return as-is
        return code;
    }

    private _updateCellOutput(execution: vscode.NotebookCellExecution) {
        const outputs: vscode.NotebookCellOutputItem[] = [];
        
        if (this._outputBuffer) {
            // Don't strip newlines - preserve them for proper formatting
            outputs.push(vscode.NotebookCellOutputItem.text(this._outputBuffer, 'text/plain'));
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
            console.log(`Appending output: ${JSON.stringify(text)} (error: ${isError})`);
            
            if (isError) {
                this._errorBuffer += text;
            } else {
                this._outputBuffer += text;
            }
            
            // Update the output with the accumulated text
            this._updateCellOutput(this._currentExecution);
            
            // Resolve the output promise immediately when we get output
            if (this._outputResolve) {
                this._outputResolve();
                this._outputResolve = undefined;
            }
        }
    }
}