// src/notebookSerializer.ts
import * as vscode from 'vscode';

interface SerializedOutputItem {
    mime: string;
    /** Plain UTF-8 text for textual MIME types; base64-encoded for binary. */
    data: string;
    encoding?: 'utf8' | 'base64';
}

interface SerializedOutput {
    items: SerializedOutputItem[];
}

interface SerializedCell {
    language: string;
    value: string;
    kind: vscode.NotebookCellKind;
    outputs?: SerializedOutput[];
}

interface NotebookFileFormat {
    version?: number;
    cells: SerializedCell[];
}

const TEXT_MIMES = new Set<string>([
    'text/plain',
    'text/html',
    'text/markdown',
    'application/json',
    'application/vnd.code.notebook.stdout',
    'application/vnd.code.notebook.stderr',
    'application/vnd.code.notebook.error',
    'application/vnd.plotly.v1+json',
]);

function encodeItem(item: vscode.NotebookCellOutputItem): SerializedOutputItem {
    if (TEXT_MIMES.has(item.mime)) {
        return {
            mime: item.mime,
            data: Buffer.from(item.data).toString('utf8'),
            encoding: 'utf8',
        };
    }
    return {
        mime: item.mime,
        data: Buffer.from(item.data).toString('base64'),
        encoding: 'base64',
    };
}

function decodeItem(serialized: SerializedOutputItem): vscode.NotebookCellOutputItem {
    const encoding = serialized.encoding ?? (TEXT_MIMES.has(serialized.mime) ? 'utf8' : 'base64');
    const bytes =
        encoding === 'utf8'
            ? Buffer.from(serialized.data, 'utf8')
            : Buffer.from(serialized.data, 'base64');
    return new vscode.NotebookCellOutputItem(new Uint8Array(bytes), serialized.mime);
}

export class DebugNotebookSerializer implements vscode.NotebookSerializer {
    async deserializeNotebook(
        content: Uint8Array,
        _token: vscode.CancellationToken
    ): Promise<vscode.NotebookData> {
        const text = Buffer.from(content).toString('utf8');
        let fileData: NotebookFileFormat;
        try {
            fileData = text.trim() ? JSON.parse(text) : { cells: [] };
        } catch {
            fileData = { cells: [] };
        }

        if (fileData.version !== undefined && fileData.version !== 1) {
            console.warn(`DebugNotebookSerializer: unsupported .dnb version ${fileData.version}; opening as empty.`);
            return new vscode.NotebookData([]);
        }

        const cells = (fileData.cells ?? []).map((cell: SerializedCell) => {
            const data = new vscode.NotebookCellData(
                cell.kind ?? vscode.NotebookCellKind.Code,
                cell.value,
                cell.language ?? 'python'
            );
            if (cell.outputs?.length) {
                data.outputs = cell.outputs.map(
                    (output: SerializedOutput) =>
                        new vscode.NotebookCellOutput((output.items ?? []).map(decodeItem))
                );
            }
            return data;
        });

        return new vscode.NotebookData(cells);
    }

    async serializeNotebook(
        data: vscode.NotebookData,
        _token: vscode.CancellationToken
    ): Promise<Uint8Array> {
        const fileData: NotebookFileFormat = {
            version: 1,
            cells: data.cells.map((cell: vscode.NotebookCellData) => {
                const serialized: SerializedCell = {
                    language: cell.languageId,
                    value: cell.value,
                    kind: cell.kind,
                };
                if (cell.outputs?.length) {
                    serialized.outputs = cell.outputs.map((output: vscode.NotebookCellOutput) => ({
                        items: output.items.map(encodeItem),
                    }));
                }
                return serialized;
            }),
        };
        return Buffer.from(JSON.stringify(fileData, null, 2), 'utf8');
    }
}
