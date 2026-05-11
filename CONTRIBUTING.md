# Debug Notebook — Developer Guide

This document is the contributor-facing guide. End-user usage lives in `README.md`.

## Toolchain

The repo is wired up with [mise](https://mise.jdx.dev) for tool versioning. Two
managed tools: **bun** (JS deps + script runner) and **uv** (Python + venv).

```bash
mise install            # installs the bun and uv versions from mise.toml
mise run setup          # bun install + uv venv .venv + uv sync
```

`mise.toml` also exposes:

| Task              | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `mise run setup`   | Install JS deps and create/sync the Python venv. |
| `mise run compile` | `bun run compile` → `tsc -p ./`.                 |
| `mise run package` | `bun run package` → produces a `.vsix`.          |

The Python venv lives in `.venv/` and is automatically activated by mise when
you `cd` into the project. Required Python is **3.14+** (`.python-version`).

The optional `plot` dependency group (`uv sync --group plot`) installs
matplotlib / pandas / plotly / Pillow / numpy / debugpy so the local fixture in
`testing/plot_demo.py` actually has libraries to plot with.

## Project layout

```
src/
  extension.ts          # activation: registers serializer, controller, '*' DAP tracker
  notebookController.ts # cell execution + helper injection + sentinel parsing
  notebookSerializer.ts # .dnb (de)serialization, persists outputs
  debugTracker.ts       # forwards DAP `output` events to the controller
  dnb_helpers.py        # in-process Python helper module, base64-injected per session
out/                    # tsc output, packaged into the .vsix
testing/                # local fixtures (excluded from .vsix via .vscodeignore)
  plot_demo.py          # script with a Figure/DataFrame breakpoint state
  plot_demo.dnb         # demo notebook exercising rich-output paths
  .vscode/launch.json   # debugpy config used inside the dev host
.vscode/
  launch.json           # "Run Extension" config (F5 in this repo)
  tasks.json            # bun-based compile/watch tasks
mise.toml               # tool versions + run tasks
pyproject.toml          # Python deps (helpers + optional `plot` group)
.vscodeignore           # files excluded from the published .vsix
```

## How the extension works

The unique value prop is "**a notebook running in the live frame of the
debugger**". Everything else falls out of that.

1. `.dnb` files are claimed by `DebugNotebookSerializer` (a small JSON-on-disk
   format that preserves cell outputs, unlike Jupyter `.ipynb`).
2. When a cell runs, `DebugNotebookController` finds the active debug session,
   resolves the paused thread/frame, and sends a DAP `evaluate` request scoped
   to that frame.
3. For Python sessions, on first run the controller base64-installs
   `src/dnb_helpers.py` into the debuggee's `__builtins__`. This gives every
   frame `__dnb_run__(code, globals(), locals())`, `__dnb_render__(obj)`, etc.
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

- runs the `compile` task first,
- launches an Extension Development Host with `testing/` as the workspace.

Inside the dev host:

1. `Ctrl+Shift+P` → "Python: Select Interpreter" → pick the project's
   `.venv/bin/python`.
2. Open `plot_demo.py`, set a breakpoint on the last line.
3. F5 → "Python: plot_demo (pause for notebook)" (defined in
   `testing/.vscode/launch.json`). The script pauses at the breakpoint.
4. Open `plot_demo.dnb`. The Debug Notebook kernel is auto-selected.
5. Shift+Enter through the cells.

Use the **Run Extension (watch)** config instead if you want `tsc -watch`
running in the background so edits hot-rebuild between cell runs (you still
need to reload the dev host: `Ctrl+R` in that window).

### Enabling breakpoints in `.dnb` cells (and other non-standard files)

By default VS Code only honors breakpoints in files whose language is
registered with a debug adapter. `.dnb` cells (and any custom-language file)
get a **hollow** gutter dot — set but inactive — which is confusing while
testing this extension. Two ways to fix it:

**Method 1 — workspace setting (already wired up for the dev host).**
`testing/.vscode/settings.json` sets `"debug.allowBreakpointsEverywhere": true`
so any breakpoint inside the dev host's `testing/` workspace is active.
For your own projects, flip the same toggle in user settings
(`Ctrl+,` → search `allowBreakpointsEverywhere`) or add it to your project's
`.vscode/settings.json`:

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

You can exercise `src/dnb_helpers.py` directly without VS Code (mise has
already put `python` from `.venv` and `uv` on PATH once you've `cd`-ed into
the project):

```bash
uv sync --group plot
python -c "
import sys, io
ns = {}; exec(open('src/dnb_helpers.py').read(), ns)
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
`notebookController._consumeChunk`.

## Building and packaging

```bash
mise run compile           # tsc -p ./
mise run package           # vsce package → debug-notebook-<version>.vsix
```

To inspect what would be shipped:

```bash
bunx --bun vsce ls
```

The `.vsix` ships compiled JS, `src/dnb_helpers.py`, icons, README, LICENSE.
Source TS, source maps, `.venv`, testing fixtures, mise config, and
`pyproject.toml` are excluded by `.vscodeignore`.

## Publishing to the marketplace

One-time setup:

1. Create a publisher account at <https://marketplace.visualstudio.com/manage>
   (sign in with a Microsoft account). The publisher ID used here is
   `sidh1999` — see `publisher` in `package.json`.
2. Create a Personal Access Token (PAT) at <https://dev.azure.com> →
   User Settings → Personal Access Tokens. Scope it to
   **Marketplace → Publish**. Set the organization to "All accessible
   organizations" and pick a custom expiration (1 year is fine).
3. Register and log in once with `vsce`:

   ```bash
   bunx --bun vsce create-publisher <publisher-id>   # only on first publish
   bunx --bun vsce login <publisher-id>              # paste the PAT
   ```

Each release:

```bash
# bump the version in package.json, write a CHANGELOG.md entry, then:
mise run compile
bunx --bun vsce publish                  # or: vsce publish patch|minor|major
```

`vsce publish patch|minor|major` does the version bump for you (use it instead
of editing `package.json` by hand).

Verify the result at
`https://marketplace.visualstudio.com/items?itemName=<publisher>.debug-notebook`
and install it from inside VS Code as a smoke test before announcing.

### Pre-publish sanity checklist

- `mise run compile` passes with no diagnostics.
- `bunx --bun vsce ls` shows only the files you expect (no `.venv`, no
  testing fixtures, no source maps).
- Manual test checklist above passes in the dev host.
- `CHANGELOG.md` is up to date.
- Version in `package.json` matches what you're about to publish.
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
