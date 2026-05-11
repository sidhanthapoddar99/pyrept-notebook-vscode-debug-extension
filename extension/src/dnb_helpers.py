# pyright: reportMissingImports=false, reportAttributeAccessIssue=false
"""
Debug Notebook in-process helpers.

Installed once per debug session into __builtins__ so they are reachable from
any frame the user happens to be paused in. The extension never asks the user
to import anything; everything below is invoked transparently by the wrapper
that the controller sends for each cell.

The contract with the extension is a single stdout sentinel:

    <<<DNB:{mime}:{base64-payload}:DNB>>>

The debug-adapter tracker on the extension side parses these out of the
output stream and emits proper NotebookCellOutputItems with the right MIME
type. Any stdout that doesn't match the sentinel is forwarded as plain text.
"""

import sys as _sys
import io as _io
import base64 as _b64
import ast as _ast
import builtins as _builtins


if not hasattr(_builtins, "__dnb_keep_figures__"):
    _builtins.__dnb_keep_figures__ = False


def _dnb_keep_figures(value=True):
    _builtins.__dnb_keep_figures__ = bool(value)


_SENTINEL_PREFIX = "<<<DNB:"
_SENTINEL_SUFFIX = ":DNB>>>"


def _dnb_emit(mime, data):
    if isinstance(data, str):
        data = data.encode("utf-8")
    payload = _b64.b64encode(data).decode("ascii")
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
    (Jupyter-style) without the user having to do anything special.
    """
    _dnb_patch_pyplot()
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


_builtins.__dnb_run__ = _dnb_run
_builtins.__dnb_render__ = _dnb_render
_builtins.__dnb_keep_figures = _dnb_keep_figures
