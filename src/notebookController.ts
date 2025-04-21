
import * as vscode from "vscode";

export class PyReplNotebookController implements vscode.Disposable {
  readonly controller: vscode.NotebookController;
  private _debugSession: vscode.DebugSession | undefined;

  constructor() {
    this.controller = vscode.notebooks.createNotebookController(
      "pyrepl-notebook-controller",
      "pyrepl-notebook",
      "Python REPL"
    );
    this.controller.supportedLanguages = ["python"];
    this.controller.executeHandler = this._executeCells.bind(this);
  }

  private async _ensureDebugSession(): Promise<vscode.DebugSession> {
    if (this._debugSession) {
      return this._debugSession;
    }

    const wsFolder = vscode.workspace.workspaceFolders?.[0];
    const config: vscode.DebugConfiguration = {
      name: "PyREPL‑inline",
      type: "python",
      request: "launch",
      program: "${file}",
      console: "integratedTerminal"
    };

    this._debugSession = await vscode.debug.startDebugging(wsFolder, config, {
      consoleMode: vscode.DebugConsoleMode.MergeWithParent
    });
    return this._debugSession!;
  }

  private async _executeCells(cells: vscode.NotebookCell[]) {
    const session = await this._ensureDebugSession();

    for (const cell of cells) {
      const execution = this.controller.createNotebookCellExecution(cell);
      execution.start(Date.now());
      try {
        const code = cell.document.getText();
        // Wrap multiline in exec() to preserve context
        const expression = code.includes("\n") ? `exec(\"" + code.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\"/g, "\\\"") + "\")` : code;
        const result = await session.customRequest("evaluate", {
          expression,
          context: "repl"
        });

        const out = result?.result ?? "";
        const outputItem = vscode.NotebookCellOutputItem.text(out, "text/plain");
        execution.replaceOutput(new vscode.NotebookCellOutput([outputItem]));
        execution.end(true, Date.now());
      } catch (err: any) {
        const outputItem = vscode.NotebookCellOutputItem.text(String(err), "text/plain");
        execution.replaceOutput(new vscode.NotebookCellOutput([outputItem]));
        execution.end(false, Date.now());
      }
    }
  }

  /** Allow tracker to attach */
  set debugSession(session: vscode.DebugSession | undefined) {
    this._debugSession = session;
  }

  dispose() {
    this.controller.dispose();
  }
}
