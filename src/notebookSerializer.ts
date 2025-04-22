// src/notebookSerializer.ts
import * as vscode from 'vscode';

interface NotebookFileFormat {
    cells: {
        language: string;
        value: string;
        kind: vscode.NotebookCellKind;
    }[];
}

export class DebugNotebookSerializer implements vscode.NotebookSerializer {
    async deserializeNotebook(
        content: Uint8Array,
        _token: vscode.CancellationToken
    ): Promise<vscode.NotebookData> {
        const text = Buffer.from(content).toString('utf8');
        let fileData: NotebookFileFormat;

        try {
            fileData = JSON.parse(text);
        } catch {
            // Handle corrupted file or empty file
            fileData = { cells: [] };
        }

        const cells = fileData.cells.map(cell => {
            return new vscode.NotebookCellData(
                cell.kind || vscode.NotebookCellKind.Code,
                cell.value,
                cell.language || 'python'
            );
        });

        return new vscode.NotebookData(cells);
    }

    async serializeNotebook(
        data: vscode.NotebookData,
        _token: vscode.CancellationToken
    ): Promise<Uint8Array> {
        const fileData: NotebookFileFormat = {
            cells: data.cells.map(cell => ({
                language: cell.languageId,
                value: cell.value,
                kind: cell.kind
            }))
        };

        const text = JSON.stringify(fileData, null, 2);
        return Buffer.from(text, 'utf8');
    }
}