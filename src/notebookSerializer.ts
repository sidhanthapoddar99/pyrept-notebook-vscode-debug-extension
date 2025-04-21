
import * as vscode from "vscode";

export interface RawCell {
  language: string;
  value: string;
}

export class PyReplSerializer implements vscode.NotebookSerializer {
  deserializeNotebook(content: Uint8Array): vscode.NotebookData {
    if (content.length === 0) {
      const cell = new vscode.NotebookCellData(vscode.NotebookCellKind.Code, "", "python");
      return new vscode.NotebookData([cell]);
    }
    const raw: RawCell[] = JSON.parse(Buffer.from(content).toString("utf8"));
    const cells = raw.map(
      c => new vscode.NotebookCellData(vscode.NotebookCellKind.Code, c.value, c.language)
    );
    return new vscode.NotebookData(cells);
  }

  serializeNotebook(data: vscode.NotebookData): Uint8Array {
    const raw: RawCell[] = data.cells.map(cell => ({ language: cell.document.languageId, value: cell.document.getText() }));
    return Buffer.from(JSON.stringify(raw, null, 2), "utf8");
  }
}
