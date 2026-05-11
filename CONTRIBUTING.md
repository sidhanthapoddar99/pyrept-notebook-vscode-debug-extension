# Debug Notebook — Developer Guide

Contributor-facing guide. End-user usage and the marketplace listing live in
`README.md` (at the repo root; the extension sub-package symlinks it).

## Toolchain

Tool versioning is managed by [mise](https://mise.jdx.dev). Two managed tools:
**bun** (JS deps + script runner for `extension/`) and **uv** (Python venv).

```bash
mise install            # installs the bun and uv versions from mise.toml
mise run setup          # bun install (in extension/) + uv venv .venv + uv sync
```

`mise.toml` tasks:

| Task               | What it does                                     |
| ------------------ | ------------------------------------------------ |
| `mise run setup`   | Install JS deps and create/sync the Python venv. |
| `mise run compile` | `bun run compile` → `tsc -p ./` inside `extension/`. |
| `mise run watch`   | `tsc -watch -p ./` inside `extension/`.          |
| `mise run package` | `vsce package --out ../dist/` from `extension/`. |

The Python venv lives in `.venv/` (repo root) and is auto-activated by mise.
Required Python is **3.14+** (`.python-version`). The optional `plot`
dependency group (`uv sync --group plot`) installs matplotlib / pandas /
plotly / Pillow / numpy / debugpy so `dev-workspace/plot_demo.py` actually has
libraries to plot with.

## Project layout

```
.
├── extension/                  ← the npm package shipped as the .vsix
│   ├── src/
│   │   ├── extension.ts        # activation: serializer, controller, '*' DAP tracker
│   │   ├── notebookController.ts # cell execution + helper injection + sentinel parsing
│   │   ├── notebookSerializer.ts # .dnb (de)serialization, persists outputs
│   │   ├── debugTracker.ts     # forwards DAP `output` events to the controller
│   │   └── dnb_helpers.py      # in-process Python helper, base64-injected per session
│   ├── icons/
│   ├── out/                    # tsc output, gitignored, packaged into .vsix
│   ├── package.json, tsconfig.json, bun.lock
│   ├── .vscodeignore           # files excluded from the .vsix
│   └── README.md, CHANGELOG.md, LICENSE   ← symlinks to repo root
├── dev-workspace/              ← dev-host workspace + manual test fixtures
│   ├── .vscode/{launch,settings}.json
│   ├── plot_demo.py            # script with a Figure/DataFrame breakpoint state
│   └── plot_demo.dnb           # demo notebook exercising rich-output paths
├── dist/                       ← vsce package output (.vsix files), gitignored
├── .vscode/                    ← repo-level dev IDE config
│   ├── launch.json             # "Run Extension" config (F5 from repo root)
│   └── tasks.json              # bun-based compile/watch tasks (cwd=extension/)
├── README.md, CHANGELOG.md, LICENSE   ← canonical, symlinked from extension/
├── CONTRIBUTING.md             # this file
├── pyproject.toml, uv.lock, .python-version
├── mise.toml                   # tool versions + run tasks
└── .gitignore
```

## How the extension works

The unique value prop is "**a notebook running in the live frame of the
debugger**". Everything else falls out of that.

1. `.dnb` files are claimed by `DebugNotebookSerializer` (small JSON-on-disk
   format that preserves cell outputs, unlike Jupyter `.ipynb`).
2. When a cell runs, `DebugNotebookController` finds the active debug session,
   resolves the paused thread/frame, and sends a DAP `evaluate` request scoped
   to that frame.
3. For Python sessions, on first run the controller base64-installs
   `extension/src/dnb_helpers.py` into the debuggee's `__builtins__`. This
   gives every frame `__dnb_run__(code, globals(), locals())`,
   `__dnb_render__(obj)`, etc.
4. Each cell body is base64-wrapped and sent as
   `__dnb_run__(<b64-decoded code>, globals(), locals())`. The helper
   AST-splits the code, executes the leading statements, and `eval`s the
   trailing expression (Jupyter-style auto-render).
5. `__dnb_render__` knows how to turn a `matplotlib.Figure`, `pandas.DataFrame`,
   `plotly.Figure`, `PIL.Image`, or anything with `_repr_html_` into the right
   MIME type — emitted to stdout as a sentinel:

   ```
   <<<DNB:{mime}:{base64-bytes}:DNB>>>
   ```

6. The DAP adapter tracker forwards every `output` event to the controller,
   which buffers across event boundaries, extracts complete sentinels (handles
   the case where one sentinel is split across multiple output events), and
   emits proper `NotebookCellOutput` items with the right MIME type.
7. Non-sentinel text is streamed to the cell using
   `application/vnd.code.notebook.stdout` / `.stderr` so VS Code styles it.
8. `plt.show()` is monkey-patched once per session to flush figures inline
   instead of opening a window — so existing notebook idioms work unchanged.

For non-Python sessions, the helper is skipped and the cell body is sent as
plain `evaluate`. Rich output isn't supported for JS today, but the sentinel
protocol is language-agnostic — adding it is a matter of writing an analogous
helper for the target runtime.

## Running the extension locally (F5)

`.vscode/launch.json` defines **Run Extension** which:

- runs the `compile` task (`bun run compile` inside `extension/`) first,
- launches an Extension Development Host pointed at `extension/`, with
  `dev-workspace/` as the open workspace.

Inside the dev host:

1. `Ctrl+Shift+P` → "Python: Select Interpreter" → pick the project's
   `.venv/bin/python`.
2. Open `plot_demo.py`, set a breakpoint on the last line.
3. F5 → "Python: plot_demo (pause for notebook)" (defined in
   `dev-workspace/.vscode/launch.json`). The script pauses at the breakpoint.
4. Open `plot_demo.dnb`. The Debug Notebook kernel is auto-selected.
5. Shift+Enter through the cells.

Use **Run Extension (watch)** if you want `tsc -watch` running in the
background so edits hot-rebuild between cell runs (still need to reload the
dev host with `Ctrl+R`).

### Enabling breakpoints in `.dnb` cells (and other non-standard files)

By default VS Code only honors breakpoints in files whose language is
registered with a debug adapter. `.dnb` cells (and any custom-language file)
get a **hollow** gutter dot — set but inactive — which is confusing while
testing this extension. Two ways to fix it:

**Method 1 — workspace setting (already wired up for the dev host).**
`dev-workspace/.vscode/settings.json` sets
`"debug.allowBreakpointsEverywhere": true` so any breakpoint inside the dev
host's `dev-workspace/` is active. For your own projects, flip the same
toggle in user settings (`Ctrl+,` → search `allowBreakpointsEverywhere`) or
add it to that project's `.vscode/settings.json`:

```json
{ "debug.allowBreakpointsEverywhere": true }
```

**Method 2 — `breakpoint()` call inside a cell.** Python's built-in
`breakpoint()` triggers `sys.breakpointhook()`, which under debugpy fires a
pause regardless of any VS Code setting or file-type registration. Drop it
into a cell when you want to inspect what the debuggee is doing mid-cell:

```python
import some_module
result = some_module.do_thing(x, y)
breakpoint()             # debugger pauses here, in this frame
result.fix_something()
```

Method 2 is the more robust one — it works even if a teammate hasn't enabled
the setting, and it's portable to anyone running your `.dnb` against the same
debug session.

## What to test (manual checklist)

When changing anything in the execution path, walk through these in the dev
host:

- **Graphs render inline.** `fig` cell in `plot_demo.dnb` → PNG below the cell.
- **Trailing expression auto-renders** without `print()`. `df.head()` →
  rendered as HTML table; `x.mean()` → number.
- **No duplicate output.** Add a `print("hello")` cell; you should see exactly
  one `hello` (the previous version of this extension fired four DAP trackers
  in parallel and duplicated everything).
- **Statement-only cells produce no output.** `a = 1; b = 2; c = a + b` →
  empty output area.
- **Streaming works.** A loop like `for i in range(50): print(i)` should
  stream lines in as they arrive, not appear in one blob at the end.
- **Cancellation.** Run `for i in range(100000): print(i)` and click stop —
  the cell flips to failed/cancelled immediately. (DAP `evaluate` itself is
  not interruptible; the underlying call continues server-side until natural
  completion, which is a known limitation of the adapter protocol.)
- **Execution order.** The left-margin counter increments.
- **Output persistence.** Save the `.dnb`, close, reopen → text + graphs are
  still rendered. (Previously `transientOutputs: true` silently dropped them
  despite the README promising persistence.)
- **Frame scoping.** While paused inside a function, run a cell — `locals()`
  should reflect that frame's locals, not module globals.

## Helper module — local sanity check

Exercise `extension/src/dnb_helpers.py` directly without VS Code:

```bash
uv sync --group plot
python -c "
import sys, io
ns = {}; exec(open('extension/src/dnb_helpers.py').read(), ns)
buf = io.StringIO(); sys.stdout = buf
ns['_dnb_run']('1 + 2', ns, ns)              # → '3\n'
sys.stdout = sys.__stdout__
print(repr(buf.getvalue()))
"
```

## TypeScript sentinel parser — sanity check

```bash
bun -e "
const re = /<<<DNB:([^:<>]+):([A-Za-z0-9+/=]+):DNB>>>/g;
const s = 'pre<<<DNB:image/png:YWJjZA==:DNB>>>post';
console.log([...s.matchAll(re)]);
"
```

For the split-across-chunks case, see the buffering logic in
`extension/src/notebookController.ts` → `_consumeChunk`.

## Building and packaging

```bash
mise run compile           # tsc -p ./ inside extension/
mise run package           # vsce package --out ../dist/ → dist/debug-notebook-<version>.vsix
```

Inspect what would be packaged:

```bash
cd extension && bunx --bun vsce ls
```

The `.vsix` ships compiled JS, `src/dnb_helpers.py`, icons, README, LICENSE,
CHANGELOG (the last three resolved through the symlinks from
`extension/` → repo root). Source TS, source maps, the venv, the
dev-workspace fixtures, mise config, and `pyproject.toml` are excluded by
`extension/.vscodeignore`.

## Publishing to the marketplace

One-time setup:

1. Create a publisher account at <https://marketplace.visualstudio.com/manage>
   (sign in with a Microsoft account). The publisher ID used here is
   `sidh1999` — see `publisher` in `extension/package.json`.
2. Create a Personal Access Token (PAT) at <https://dev.azure.com> →
   User Settings → Personal Access Tokens. Scope it to
   **Marketplace → Publish**. Organization: "All accessible organizations".
   Custom expiration (1 year is fine).
3. Register and log in once with `vsce`:

   ```bash
   cd extension
   bunx --bun vsce create-publisher <publisher-id>   # only on first publish
   bunx --bun vsce login <publisher-id>              # paste the PAT
   ```

Each release:

```bash
# bump the version in extension/package.json, write a CHANGELOG.md entry, then:
mise run compile
cd extension && bunx --bun vsce publish        # or: vsce publish patch|minor|major
```

`vsce publish patch|minor|major` does the version bump for you (use it instead
of editing `package.json` by hand).

Verify the result at
`https://marketplace.visualstudio.com/items?itemName=<publisher>.debug-notebook`
and install it from inside VS Code as a smoke test before announcing.

### Pre-publish sanity checklist

- `mise run compile` passes with no diagnostics.
- `cd extension && bunx --bun vsce ls` shows only the files you expect (no
  `.venv`, no dev-workspace fixtures, no source maps).
- Manual test checklist above passes in the dev host.
- `CHANGELOG.md` is up to date.
- Version in `extension/package.json` matches what you're about to publish.
- No `console.log` left in the execution path.

## Notes / gotchas

- The `*` DAP tracker is intentionally the **only** registration. Registering
  per-type (`python`, `node`, `pwa-node`) **and** `*` causes every output
  event to be delivered to all matching trackers, duplicating output. Don't
  add more registrations unless you also add a session-id dedupe.
- `__dnb_run__` is installed into the debuggee's `__builtins__`. That's a
  global mutation per debug session. Names are dunder-prefixed and the
  installer no-ops if helpers are already present. Cleared automatically on
  `onDidTerminateDebugSession`.
- `transientOutputs: false` means cell outputs are written to disk. Don't
  flip this back to `true` without removing the persistence guarantee from
  the user-facing README.
- The cell body is base64-transported to the debuggee. This avoids the
  brittle escape logic the previous version used (`\\n` / `\\t` replacement
  inside an `exec("...")` string broke tab-indented Python).
- `plt.show` is monkey-patched globally inside the debuggee. If the user's
  own program (running between cells) calls `plt.show()`, it will now emit
  a sentinel instead of opening a window. This is intentional — interactive
  matplotlib windows during a debug session are usually unwanted.
- README/CHANGELOG/LICENSE in `extension/` are **symlinks** to the canonical
  files at the repo root. Git tracks them as symlinks (mode `120000`, ~12-byte
  blobs that store only the target path), not duplicated content. `vsce
  package` follows the symlinks and embeds the actual file content into the
  `.vsix` — the published artifact has no symlinks.

  **Cloning on Linux / macOS / WSL:** works out of the box, no setup needed.

  **Cloning on native Windows:** Git for Windows sometimes defaults to
  `core.symlinks=false`, which materializes each symlink as a plain text file
  containing the literal path string (e.g. `"../README.md"`) — that breaks
  `vsce package`. Before cloning, either:

  ```bash
  git config --global core.symlinks true
  ```

  …and enable Developer Mode (or run the shell as admin) so Windows allows
  symlink creation, **or** just clone via WSL, which behaves like Linux.

  If you've already cloned and the symlinks came through as text files, the
  fastest fix is to delete `extension/{README.md,CHANGELOG.md,LICENSE}` and
  re-create them as symlinks pointing at `../{README.md,CHANGELOG.md,LICENSE}`
  (`mklink` on cmd, `New-Item -ItemType SymbolicLink` in PowerShell, or
  `ln -s` in a Linux-ish shell).
