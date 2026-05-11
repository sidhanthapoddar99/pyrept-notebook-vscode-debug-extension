# pyright: reportMissingImports=false, reportAttributeAccessIssue=false
"""
Debug Notebook in-process helpers.

Installed once per debug session into __builtins__ so they are reachable from
any frame the user happens to be paused in. The extension never asks the user
to import anything; everything below is invoked transparently by the wrapper
that the controller sends for each cell.

Rich-output transport: during a `_dnb_run` call, `_dnb_emit` appends to an
in-process list. `_dnb_run` writes the list as JSON to a tempfile and returns
just the file path via the DAP `evaluate` response. The controller reads the
file, parses, emits each entry as a NotebookCellOutputItem, and unlinks it.

This bypasses both (a) stdout (so binary payloads don't leak into the debug
console) and (b) debugpy/pydevd's internal cap on evaluate result-string
length (which silently truncates long base64 strings and causes empty cell
output for cells like `df.head()` where the HTML payload exceeds the cap).

Outside a `_dnb_run` context (e.g. user types `__dnb_render__(fig)` manually
in the debug console), `_dnb_emit` falls back to the legacy stdout sentinel
`<<<DNB:{mime}:{base64}:DNB>>>`. The controller still parses these as a
safety net for older sessions.

Plain `print()` output is left alone: it streams through stdout → DAP output
events → both the debug console (useful) and the cell (also useful).
"""

import sys as _sys
import io as _io
import os as _os
import json as _json
import base64 as _b64
import ast as _ast
import atexit as _atexit
import tempfile as _tempfile
import builtins as _builtins


# Track every tempfile we hand out so we can wipe any controller-never-read
# leftovers on Python-process exit (defense-in-depth; primary cleanup is
# unlink-after-read on the extension side).
if not hasattr(_builtins, "__dnb_tempfiles__"):
    _builtins.__dnb_tempfiles__ = set()

    def _dnb_cleanup_tempfiles():
        for p in list(_builtins.__dnb_tempfiles__):
            try:
                _os.unlink(p)
            except Exception:
                pass
        _builtins.__dnb_tempfiles__.clear()

    _atexit.register(_dnb_cleanup_tempfiles)


if not hasattr(_builtins, "__dnb_keep_figures__"):
    _builtins.__dnb_keep_figures__ = False


def _dnb_keep_figures(value=True):
    _builtins.__dnb_keep_figures__ = bool(value)


_SENTINEL_PREFIX = "<<<DNB:"
_SENTINEL_SUFFIX = ":DNB>>>"

# Set to a list while inside _dnb_run; rich emissions append here instead of
# being written to stdout. Always reset to None on _dnb_run exit (success or
# failure) so manual console calls fall back cleanly.
_dnb_active_emissions = None  # type: list | None


def _dnb_emit(mime, data):
    global _dnb_active_emissions
    if isinstance(data, str):
        data = data.encode("utf-8")
    payload = _b64.b64encode(data).decode("ascii")
    if _dnb_active_emissions is not None:
        _dnb_active_emissions.append({"mime": mime, "data": payload})
        return
    # Fallback for manual `__dnb_render__(obj)` from the debug console.
    _sys.stdout.write("\n" + _SENTINEL_PREFIX + mime + ":" + payload + _SENTINEL_SUFFIX + "\n")
    _sys.stdout.flush()


def _dnb_emit_figure(fig):
    buf = _io.BytesIO()
    try:
        fig.savefig(buf, format="png", bbox_inches="tight", dpi=100)
    except Exception:
        fig.savefig(buf, format="png")
    _dnb_emit("image/png", buf.getvalue())


def _dnb_render(obj):
    if obj is None:
        return
    try:
        from matplotlib.figure import Figure as _MplFigure
        if isinstance(obj, _MplFigure):
            _dnb_emit_figure(obj)
            return
    except Exception:
        pass
    try:
        import pandas as _pd
        if isinstance(obj, _pd.DataFrame):
            _dnb_emit("text/html", obj.to_html())
            return
        if isinstance(obj, _pd.Series):
            _dnb_emit("text/html", obj.to_frame().to_html())
            return
    except Exception:
        pass
    try:
        import plotly.graph_objs as _go
        if isinstance(obj, _go.Figure):
            _dnb_emit("application/vnd.plotly.v1+json", obj.to_json())
            return
    except Exception:
        pass
    try:
        from PIL.Image import Image as _PILImage
        if isinstance(obj, _PILImage):
            buf = _io.BytesIO()
            obj.save(buf, format="PNG")
            _dnb_emit("image/png", buf.getvalue())
            return
    except Exception:
        pass
    if hasattr(obj, "_repr_html_"):
        try:
            html = obj._repr_html_()
            if html:
                _dnb_emit("text/html", html)
                return
        except Exception:
            pass
    _sys.stdout.write(repr(obj) + "\n")
    _sys.stdout.flush()


def _dnb_flush_pyplot():
    try:
        import matplotlib.pyplot as _plt
        for num in _plt.get_fignums():
            _dnb_emit_figure(_plt.figure(num))
        if not getattr(_builtins, "__dnb_keep_figures__", False):
            _plt.close("all")
    except Exception:
        pass


def _dnb_patch_pyplot():
    """Patch plt.show() to flush figures inline instead of opening a window."""
    try:
        import matplotlib
        try:
            if matplotlib.get_backend().lower() not in ("agg", "module://matplotlib_inline.backend_inline"):
                matplotlib.use("Agg", force=False)
        except Exception:
            pass
        import matplotlib.pyplot as _plt
        if not getattr(_plt, "__dnb_patched__", False):
            _plt.show = lambda *a, **kw: _dnb_flush_pyplot()
            _plt.__dnb_patched__ = True
    except Exception:
        pass


def _dnb_run(code, _globals, _locals):
    """Execute a cell's code in the caller's globals/locals.

    Splits trailing expression off via AST so its value is auto-rendered
    (Jupyter-style). Returns the path to a tempfile containing the JSON
    payload of rich emissions; controller reads + unlinks. Returns empty
    string if there are no emissions (cells producing only text via
    print/repr).
    """
    global _dnb_active_emissions
    _dnb_patch_pyplot()
    _dnb_active_emissions = []
    try:
        tree = _ast.parse(code, mode="exec")
        last_expr = None
        if tree.body and isinstance(tree.body[-1], _ast.Expr):
            last_expr = tree.body[-1].value
            tree.body = tree.body[:-1]
        if tree.body:
            exec(compile(tree, "<dnb-cell>", "exec"), _globals, _locals)
        if last_expr is not None:
            result = eval(compile(_ast.Expression(last_expr), "<dnb-cell>", "eval"), _globals, _locals)
            _dnb_render(result)
        _dnb_flush_pyplot()
        emissions = _dnb_active_emissions
    finally:
        _dnb_active_emissions = None
    if not emissions:
        return ""
    payload = _json.dumps({"emissions": emissions}).encode("utf-8")
    fd, path = _tempfile.mkstemp(prefix="dnb-", suffix=".json")
    try:
        _os.write(fd, payload)
    finally:
        _os.close(fd)
    _builtins.__dnb_tempfiles__.add(path)
    return path


def _dnb_warmup():
    """Pre-import the optional plotting libs at install time so the user's
    FIRST cell doesn't pay the multi-second first-import cost (which can look
    like a hang or — worse — trip debugpy's evaluate-completion behavior)."""
    try:
        import matplotlib  # noqa: F401
    except Exception:
        pass
    try:
        import pandas  # noqa: F401
    except Exception:
        pass
    _dnb_patch_pyplot()


_builtins.__dnb_run__ = _dnb_run
_builtins.__dnb_render__ = _dnb_render
_builtins.__dnb_keep_figures = _dnb_keep_figures
_dnb_warmup()
