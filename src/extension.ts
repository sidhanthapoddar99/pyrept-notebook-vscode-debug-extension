
import * as vscode from "vscode";
import { PyReplSerializer } from "./notebookSerializer";
import { PyReplNotebookController } from "./notebookController";
import { registerDebugTracker } from "./debugTracker";

let controller: PyReplNotebookController | undefined;

export function activate(context: vscode.ExtensionContext) {
  const serializer = new PyReplSerializer();
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer("pyrepl-notebook", serializer, {
      transientOutputs: true,
      transientMetadata: { runnable: true, editable: true }
    })
  );

  controller = new PyReplNotebookController();
  context.subscriptions.push(controller);

  registerDebugTracker(context, controller);

  context.subscriptions.push(
    vscode.commands.registerCommand("pyrepl.newNotebook", async () => {
      const doc = await vscode.workspace.openNotebookDocument("pyrepl-notebook", new Uint8Array());
      await vscode.window.showNotebookDocument(doc);
    })
  );
}

export function deactivate() {
  controller?.dispose();
}





