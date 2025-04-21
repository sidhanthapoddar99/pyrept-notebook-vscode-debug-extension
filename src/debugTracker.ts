
import * as vscode from "vscode";
import { PyReplNotebookController } from "./notebookController";

export function registerDebugTracker(context: vscode.ExtensionContext, controller: PyReplNotebookController) {
  const factory: vscode.DebugAdapterTrackerFactory = {
    createDebugAdapterTracker(session) {
      if (session.type !== "python") {
        return;
      }
      controller.debugSession = session; // expose to controller
      return {
        onDidSendMessage: async message => {
          if (message.type === "event" && message.event === "output") {
            const body = message.body as { category: string; output: string };
            // Forward to the active cell's output (append)
            const editor = vscode.window.activeNotebookEditor;
            const cell = editor?.selection?.start?.with?.() ? editor?.selections[0].start : undefined;
            if (!cell) {
              return;
            }
            const cellExe = controller.controller.getNotebookCellExecution(editor!.notebook.cellAt(cell));
            if (!cellExe) {
              return;
            }
            const existing = cellExe.cell.outputs[0]?.items[0]?.text ?? "";
            const combined = existing + body.output;
            const item = vscode.NotebookCellOutputItem.text(combined, "text/plain");
            cellExe.replaceOutput(new vscode.NotebookCellOutput([item]));
          }
        },
        onWillStopSession: () => {
          controller.debugSession = undefined;
        }
      } satisfies vscode.DebugAdapterTracker;
    }
  };

  context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory("python", factory));
}
