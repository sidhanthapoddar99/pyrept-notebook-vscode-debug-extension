// src/notebookController.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const PYTHON_SESSION_TYPES = new Set(['python', 'debugpy', 'python-debug']);

interface ActiveExecution {
    cellExecution: vscode.NotebookCellExecution;
    sessionId: string;
    textOutput?: vscode.NotebookCellOutput;
    textBuffer: string;
    textIsError: boolean;
    pendingChunk: string;
}

export class DebugNotebookController {
    private readonly _controller: vscode.NotebookController;
    private readonly _extensionPath: string;
    private _active: ActiveExecution | undefined;
    private _executionOrder = 0;
    private readonly _helperSource: string;
    private readonly _helperInstalledSessions = new Set<string>();

    constructor(context: vscode.ExtensionContext) {
        this._extensionPath = context.extensionPath;
        this._helperSource = this._loadHelperSource();

        this._controller = vscode.notebooks.createNotebookController(
            'debug-notebook-controller',
            'debug-notebook',
            'Debug Console Kernel'
        );
        this._controller.supportedLanguages = ['python', 'javascript'];
        this._controller.supportsExecutionOrder = true;
        this._controller.description = 'Executes cells in the active debug session';
        this._controller.executeHandler = this._executeHandler.bind(this);

        context.subscriptions.push(this._controller);
        context.subscriptions.push(
            vscode.debug.onDidTerminateDebugSession((session: vscode.DebugSession) => {
                this._helperInstalledSessions.delete(session.id);
            })
        );
    }

    private _loadHelperSource(): string {
        const candidates = [
            path.join(this._extensionPath, 'src', 'dnb_helpers.py'),
            path.join(this._extensionPath, 'dnb_helpers.py'),
            path.join(this._extensionPath, 'out', 'dnb_helpers.py'),
        ];
        for (const p of candidates) {
            try {
                return fs.readFileSync(p, 'utf8');
            } catch {
                // try next
            }
        }
        return '';
    }

    private async _executeHandler(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): Promise<void> {
        for (const cell of cells) {
            await this._executeCell(cell);
        }
    }

    private _isDebugStackFrame(item: any): item is vscode.DebugStackFrame {
        return item && 'frameId' in item && 'threadId' in item;
    }

    private _isDebugThread(item: any): item is vscode.DebugThread {
        return item && 'threadId' in item && 'name' in item && !('frameId' in item);
    }

    private async _resolveFrame(session: vscode.DebugSession): Promise<{ threadId?: number; frameId?: number }> {
        try {
            const active = vscode.debug.activeStackItem;
            let threadId: number | undefined;
            let frameId: number | undefined;

            if (active) {
                if (this._isDebugStackFrame(active)) {
                    threadId = active.threadId;
                    frameId = active.frameId;
                } else if (this._isDebugThread(active)) {
                    threadId = active.threadId;
                }
            }

            if (threadId && !frameId) {
                const stack = await session.customRequest('stackTrace', { threadId, startFrame: 0, levels: 1 });
                frameId = stack?.stackFrames?.[0]?.id;
            }

            if (!threadId) {
                const threads = await session.customRequest('threads', {});
                threadId = threads?.threads?.[0]?.id;
                if (threadId) {
                    const stack = await session.customRequest('stackTrace', { threadId, startFrame: 0, levels: 1 });
                    frameId = stack?.stackFrames?.[0]?.id;
                }
            }

            return { threadId, frameId };
        } catch {
            return {};
        }
    }

    private _isPythonSession(session: vscode.DebugSession): boolean {
        return PYTHON_SESSION_TYPES.has(session.type);
    }

    private async _ensureHelpers(session: vscode.DebugSession, frameId: number | undefined): Promise<void> {
        if (!this._isPythonSession(session)) {
            return;
        }
        if (this._helperInstalledSessions.has(session.id)) {
            return;
        }
        if (!this._helperSource) {
            return;
        }
        const b64 = Buffer.from(this._helperSource, 'utf8').toString('base64');
        // Install into builtins so __dnb_run__ is reachable from every frame.
        const installer =
            `exec(__import__('base64').b64decode('${b64}').decode('utf-8'), __import__('builtins').__dict__)`;
        const req: any = { expression: installer, context: 'repl' };
        if (frameId !== undefined) {
            req.frameId = frameId;
        }
        try {
            await session.customRequest('evaluate', req);
            this._helperInstalledSessions.add(session.id);
        } catch {
            // Best-effort: even without helpers the cell still runs as a plain evaluate.
        }
    }

    private _wrapPythonCell(code: string): string {
        const b64 = Buffer.from(code, 'utf8').toString('base64');
        return `__dnb_run__(__import__('base64').b64decode('${b64}').decode('utf-8'), globals(), locals())`;
    }

    private async _executeCell(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        this._executionOrder += 1;
        execution.executionOrder = this._executionOrder;
        execution.start(Date.now());
        execution.clearOutput();

        const session = vscode.debug.activeDebugSession;
        if (!session) {
            await this._emitError(execution, 'NoDebugSession', 'No active debug session. Start debugging (F5) first.');
            execution.end(false, Date.now());
            return;
        }

        const { frameId } = await this._resolveFrame(session);

        const ctx: ActiveExecution = {
            cellExecution: execution,
            sessionId: session.id,
            textBuffer: '',
            textIsError: false,
            pendingChunk: '',
        };
        this._active = ctx;

        const cancellation = execution.token.onCancellationRequested(() => {
            // DAP evaluate is not generally interruptible mid-flight; we end the cell
            // and stop forwarding output. The underlying evaluate may continue server-side
            // until it naturally completes, but the UI reflects cancellation immediately.
            if (this._active === ctx) {
                this._active = undefined;
            }
            execution.end(false, Date.now());
        });

        try {
            const language = cell.document.languageId;
            const rawCode = cell.document.getText();
            const isPython = language === 'python' && this._isPythonSession(session);

            if (isPython) {
                await this._ensureHelpers(session, frameId);
            }

            const expression = isPython && this._helperInstalledSessions.has(session.id)
                ? this._wrapPythonCell(rawCode)
                : rawCode;

            const req: any = { expression, context: 'repl' };
            if (frameId !== undefined) {
                req.frameId = frameId;
            }

            const response = await session.customRequest('evaluate', req);

            if (execution.token.isCancellationRequested) {
                return;
            }

            // Flush any remaining buffered partial-sentinel text before reading the response.
            this._flushPending(ctx);

            // Only surface the evaluate `result` if helpers didn't run (so we didn't already
            // render the trailing expression) AND there's a meaningful return value.
            const helpersRan = isPython && this._helperInstalledSessions.has(session.id);
            if (!helpersRan && response?.result && response.result !== 'None' && response.result !== 'undefined') {
                this._appendText(ctx, response.result + '\n', false);
            }

            execution.end(true, Date.now());
        } catch (err: any) {
            this._flushPending(ctx);
            const message = err?.message ?? String(err);
            await this._emitError(execution, err?.name ?? 'Error', message);
            execution.end(false, Date.now());
        } finally {
            cancellation.dispose();
            if (this._active === ctx) {
                this._active = undefined;
            }
        }
    }

    private async _emitError(
        execution: vscode.NotebookCellExecution,
        name: string,
        message: string
    ): Promise<void> {
        const output = new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.error({ name, message } as Error),
        ]);
        await execution.appendOutput(output);
    }

    /**
     * Receive a chunk of stdout/stderr from the debug-adapter tracker.
     * Buffers across chunks so a sentinel split across two output events
     * is still parsed correctly.
     */
    public onSessionOutput(sessionId: string, text: string, isError: boolean): void {
        const ctx = this._active;
        if (!ctx || ctx.sessionId !== sessionId) {
            return;
        }
        ctx.pendingChunk += text;
        this._consumeChunk(ctx, isError);
    }

    private _consumeChunk(ctx: ActiveExecution, isError: boolean): void {
        // Pattern: <<<DNB:{mime}:{base64}:DNB>>>
        // mime can contain "/" and "+", base64 uses A-Za-z0-9+/=
        const re = /<<<DNB:([^:<>]+):([A-Za-z0-9+/=]+):DNB>>>/g;
        let cursor = 0;
        let match: RegExpExecArray | null;
        while ((match = re.exec(ctx.pendingChunk)) !== null) {
            if (match.index > cursor) {
                this._appendText(ctx, ctx.pendingChunk.slice(cursor, match.index), isError);
            }
            const mime = match[1];
            const b64 = match[2];
            this._appendRich(ctx, mime, Buffer.from(b64, 'base64'));
            cursor = re.lastIndex;
        }
        const tail = ctx.pendingChunk.slice(cursor);
        const partial = tail.indexOf('<<<DNB:');
        if (partial >= 0) {
            if (partial > 0) {
                this._appendText(ctx, tail.slice(0, partial), isError);
            }
            ctx.pendingChunk = tail.slice(partial);
        } else {
            this._appendText(ctx, tail, isError);
            ctx.pendingChunk = '';
        }
    }

    private _flushPending(ctx: ActiveExecution): void {
        if (ctx.pendingChunk) {
            this._appendText(ctx, ctx.pendingChunk, ctx.textIsError);
            ctx.pendingChunk = '';
        }
    }

    private _appendText(ctx: ActiveExecution, text: string, isError: boolean): void {
        if (!text) {
            return;
        }
        // Start a new output if we don't have a streaming text block, or the stream switched
        // between stdout and stderr, or a rich output split the text stream.
        if (!ctx.textOutput || ctx.textIsError !== isError) {
            const mime = isError
                ? 'application/vnd.code.notebook.stderr'
                : 'application/vnd.code.notebook.stdout';
            ctx.textBuffer = text;
            ctx.textIsError = isError;
            ctx.textOutput = new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text(ctx.textBuffer, mime),
            ]);
            void ctx.cellExecution.appendOutput(ctx.textOutput);
            return;
        }
        ctx.textBuffer += text;
        const mime = isError
            ? 'application/vnd.code.notebook.stderr'
            : 'application/vnd.code.notebook.stdout';
        void ctx.cellExecution.replaceOutputItems(
            [vscode.NotebookCellOutputItem.text(ctx.textBuffer, mime)],
            ctx.textOutput
        );
    }

    private _appendRich(ctx: ActiveExecution, mime: string, data: Buffer): void {
        const item = new vscode.NotebookCellOutputItem(new Uint8Array(data), mime);
        const output = new vscode.NotebookCellOutput([item]);
        void ctx.cellExecution.appendOutput(output);
        // Subsequent text becomes a new streaming block below the rich item.
        ctx.textOutput = undefined;
        ctx.textBuffer = '';
    }
}
