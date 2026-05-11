"""Fixture for exercising the Debug Notebook rich-output path.

Run under Python debugger (F5), let it pause at the breakpoint on the last
line, then open plot_demo.dnb and run cells.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt


def build_state():
    x = np.linspace(0, 4 * np.pi, 200)
    y = np.sin(x)
    df = pd.DataFrame({"x": x, "sin": y, "cos": np.cos(x)})
    fig, ax = plt.subplots()
    ax.plot(x, y, label="sin")
    ax.plot(x, np.cos(x), label="cos")
    ax.legend()
    ax.set_title("plot_demo fixture")
    return x, y, df, fig


if __name__ == "__main__":
    x, y, df, fig = build_state()
    print("paused — open plot_demo.dnb")  # set a breakpoint on this line
