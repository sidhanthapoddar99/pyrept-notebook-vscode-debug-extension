import * as vscode from "vscode";
import { PyReplSerializer } from "./notebookSerializer";
import { PyReplNotebookController } from "./notebookController";
import { registerDebugTracker } from "./debugTracker";

let controller: PyReplNotebookController | undefined;

export function activate(context: vscode.ExtensionContext) {
  // 1. notebook serializer – no transient metadata needed for now
  const serializer = new PyReplSerializer();
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer("pyrepl-notebook", serializer, {
      transientOutputs: true
    })
  );

  // 2. notebook controller (exec logic)
  controller = new PyReplNotebookController();
  context.subscriptions.push(controller);

  // 3. debug adapter tracker (stdout → cell output)
  registerDebugTracker(context, controller);

  // 4. command: new untitled notebook
  context.subscriptions.push(
    vscode.commands.registerCommand("pyrepl.newNotebook", async () => {
      const doc = await vscode.workspace.openNotebookDocument("pyrepl-notebook");
      await vscode.window.showNotebookDocument(doc);
    })
  );
}

export function deactivate() {
  controller?.dispose();
}




