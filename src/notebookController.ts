import * as vscode from "vscode";

export class PyReplNotebookController implements vscode.Disposable {
  readonly controller: vscode.NotebookController;
  private _debugSession: vscode.DebugSession | undefined;
  private _currentExecution: vscode.NotebookCellExecution | undefined;

  constructor() {
    this.controller = vscode.notebooks.createNotebookController(
      "pyrepl-notebook-controller",
      "pyrepl-notebook",
      "Python REPL"
    );
    this.controller.supportedLanguages = ["python"];
    this.controller.executeHandler = this._executeCells.bind(this);
  }

  // region — debug session helpers
  private async _ensureDebugSession(): Promise<vscode.DebugSession> {
    if (this._debugSession) {
        return this._debugSession;
    }

    const wsFolder = vscode.workspace.workspaceFolders?.[0];
    const config: vscode.DebugConfiguration = {
      name: "PyREPL‑inline",
      type: "python",
      request: "launch",
      program: "${file}", // placeholder; debugpy only needs a target
      console: "integratedTerminal"
    };

    await vscode.debug.startDebugging(wsFolder, config, {
      consoleMode: vscode.DebugConsoleMode.MergeWithParent
    });

    // grab the newly created session
    this._debugSession = vscode.debug.activeDebugSession!;
    return this._debugSession;
  }
  // endregion

  private async _executeCells(cells: vscode.NotebookCell[]) {
    const session = await this._ensureDebugSession();

    for (const cell of cells) {
      const execution = this.controller.createNotebookCellExecution(cell);
      this._currentExecution = execution; // make tracker append here
      execution.start(Date.now());

      try {
        const code = cell.document.getText();
        const expression = this._wrapForEvaluate(code);
        const evalResult = await session.customRequest("evaluate", {
          expression,
          context: "repl"
        });

        // show the returned repr (if any); stdout/stderr will stream via tracker
        const resultText = evalResult?.result ?? "";
        if (resultText) {
          execution.replaceOutput([new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.text(resultText)])]);
        }
        execution.end(true);
      } catch (err: any) {
        execution.replaceOutput([new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.text(String(err))])]);
        execution.end(false);
      }
    }
  }

  /** Convert multiline Python into a single expression for DAP evaluate */
  private _wrapForEvaluate(code: string): string {
    if (!code.includes("\n")) {
      return code;
    }
    // escape and wrap in exec("…")
    const escaped = code.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\"/g, "\\\"");
    return `exec(\"${escaped}\")`;
  }

  // called by debug tracker
// src/notebookController.ts
    appendStream(data: string) {
        if (!this._currentExecution) {
        return;
        }
    
        // Decode the first output item’s data (if any) to plain text
        let existing = "";
        const firstItem = this._currentExecution.cell.outputs[0]?.items[0];
        if (firstItem) {
        try {
            existing = new TextDecoder().decode(firstItem.data);
        } catch {
            existing = "";
        }
        }
    
        const combined = existing + data;
    
        this._currentExecution.replaceOutput([
        new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(combined)
        ])
        ]);
    }
  

  // picker for tracker
  get debugSession(): vscode.DebugSession | undefined {
    return this._debugSession;
  }
  set debugSession(v: vscode.DebugSession | undefined) {
    this._debugSession = v;
  }

  dispose() {
    this.controller.dispose();
  }
}