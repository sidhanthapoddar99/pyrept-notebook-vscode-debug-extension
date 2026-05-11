# Change Log

All notable changes to the "Debug Notebook" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## 2.0.1 - 2026-05-12

### Added
- **Inline rich rendering** of matplotlib `Figure`, pandas `DataFrame` / `Series`, plotly `Figure`, `PIL.Image`, and any object with `_repr_html_`. No imports or display calls required — the trailing expression of a cell auto-renders Jupyter-style.
- **`plt.show()` monkey-patched** once per session to flush figures inline instead of opening a window.
- **Output persistence**: `.dnb` files now save and restore cell outputs (text + base64-encoded binary). The format gained a `version: 1` field; unknown versions open as empty rather than corrupting content.
- **Execution cancellation**: the cell's `CancellationToken` is wired up — clicking stop ends the cell in the UI immediately.
- **Execution order** counter now shown in the gutter.
- **`__dnb_keep_figures(True)`** opt-out for building plots across multiple cells.
- **README demo GIF** showing inline plots and DataFrames.

### Fixed
- **Empty cell output on first complex run** (issue #3). Rich payloads now travel via a tempfile path returned in the evaluate response, bypassing debugpy/pydevd's silent truncation of long inline result strings.
- **Stale figures from pre-breakpoint state** appearing in every cell. `_dnb_run` now snapshots `plt.get_fignums()` at cell start and only auto-emits/closes figures the cell itself created.
- **Duplicate output**: previously registered four DAP trackers (`python`, `node`, `pwa-node`, `*`) that all fired in parallel, double-capturing every print. Now a single `*` registration.
- **Output cross-contamination across concurrent cells**: cell executions are now serialized via a `_runQueue` Promise chain so a slow cell's late-arriving output can't leak into the next cell.
- **Output ordering races**: per-execution `outputChain` serializes `appendOutput` / `replaceOutputItems` calls.
- **`exec()` mangled tab-indented Python** in multi-line cells. Cell bodies are now base64-transported to the debuggee — no escape logic.
- **`'important'` DAP category** was mistakenly styled as stderr; now routes as stdout per DAP spec.
- **Helper install warmup**: `matplotlib` and `pandas` are now imported during helper install (invisible to the user) rather than during the first cell evaluate.
- **README known-limitations** no longer claims "text output only" or links to `yourusername/...`.

### Changed
- **Rich payload transport** moved off stdout: emissions are collected in-process and returned via the DAP evaluate response (as a tempfile path), so binary blobs no longer leak into the debug console.
- **Activation events** removed from `package.json` — auto-derived from `contributes` since VS Code 1.74.
- **Pre-publish hook** invokes `tsc` directly instead of `bun run compile`, so `vsce publish` works through either package manager.
- **Toolchain switched to mise + bun + uv.** Python 3.14, Bun (latest), and uv (latest) are managed via `mise.toml`.
- **Repo restructured** as a small monorepo: extension package under `extension/`, dev workspace under `dev-workspace/`, `.vsix` outputs under `dist/`.


## 1.0.1 - 2025-04-23

### Bug Fixes
- Fixed issue where output was not displayed for print statements in Python
- Resolved auto session switching for multithreaded debugging


## 1.0.0 - 2025-04-22

### Added
- Initial release of Debug Notebook
- Automatic connection to active debug sessions
- Support for Python and JavaScript debugging
- Interactive notebook interface with code cells
- Persistent debugging sessions
- Command palette integration
- File association for `.dnb` files
- Custom icon for Debug Notebook files
- Output streaming from debug console
- Error handling and display

### Features
- Run code cells in active debug context
- Inspect and modify variables
- Call functions within debug scope
- Save debugging sessions for documentation
- Multi-line code support
- Clear distinction between stdout and stderr

### Supported Languages
- Python (with Python extension)
- JavaScript (with built-in debugger)

### Known Issues
- Text output only (no rich media support)
- Requires active debug session
- Performance may be slower for large computations
