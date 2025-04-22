// FILE: src/debugTracker.ts
import * as vscode from "vscode";
import { PyReplNotebookController } from "./notebookController";

/**
 * Attaches a tracker so all `output` events from the Python debug adapter
 * are piped back into the *currently running* cell execution.
 */
export function registerDebugTracker(context: vscode.ExtensionContext, ctrl: PyReplNotebookController) {
  const factory: vscode.DebugAdapterTrackerFactory = {
    createDebugAdapterTracker(session) {
      // only Python sessions we started
      if (session.type !== "python" || session !== ctrl.debugSession) {
        return;
      }

      return {
        onDidSendMessage: msg => {
          if (msg.type === "event" && msg.event === "output") {
            const body = msg.body as { output: string; category?: string };
            ctrl.appendStream(body.output);
          }
        },
        onWillStopSession: () => {
          ctrl.debugSession = undefined;
        }
      } satisfies vscode.DebugAdapterTracker;
    }
  };
  context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory("python", factory));
}