# Debug Notebook User Guide

The Debug Notebook extension provides a notebook interface where code cells execute directly in VS Code's debug console, giving you the power of interactive notebooks with debugging capabilities.

## Installation

1. Install the Debug Notebook extension from the VS Code Marketplace
2. Install language-specific debug extensions:
   - For Python: Install the Python extension
   - For JavaScript: No additional extension needed (VS Code built-in)

## Creating a Debug Notebook

### Option 1: Create New Notebook
1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Debug Notebook: New Debug Notebook"
3. A new untitled `.dnb` notebook will open

### Option 2: Create File Manually
1. Create a new file with `.dnb` extension
2. The extension will automatically recognize it as a Debug Notebook

## Using the Notebook

### Adding Code Cells

1. Use the "+" button in the notebook toolbar to add new cells
2. Choose between Code and Markdown cells
3. Select the language for code cells (Python or JavaScript)

### Writing Code

**Python Example:**
```python
# Define a variable
message = "Hello from Debug Notebook!"
print(message)

# Multi-line code is supported
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
```

**JavaScript Example:**
```javascript
// Define variables
let count = 0;
console.log(`Starting count: ${count}`);

// Functions work too
function increment() {
    count++;
    console.log(`Current count: ${count}`);
}

increment();
```

### Running Cells

1. **Run Single Cell**: Click the play button (▶️) next to the cell or press `Shift+Enter`
2. **Run All Cells**: Use the "Run All" button in the notebook toolbar
3. **Using Keyboard**: Select a cell and use keyboard shortcut `Ctrl+Enter` to run and stay in the cell

### Viewing Output

- Output appears directly below each cell
- Printed output (stdout) shows as plain text
- Error messages (stderr) appear in red
- Return values of expressions are displayed

## Advanced Features

### Persistent State

- Variables and functions persist between cell executions
- State is maintained as long as the debug session is active
- Closing the notebook or VS Code will reset the state

### Debugging Integration

1. **Setting Breakpoints**: 
   - Not directly supported for cell code
   - You can debug imported modules by setting breakpoints in source files

2. **Inspecting Variables**:
   - Use the Debug sidebar to view variables while debug session is active
   - Variable values persist between cell executions

### Language-Specific Features

**Python:**
- Supports all standard Python syntax
- Multi-line code is automatically wrapped in `exec()`
- Print statements work as expected
- Can import modules: `import math`, `import pandas as pd`

**JavaScript:**
- Supports ES6+ syntax
- Can use `console.log()` for output
- Async/await is supported
- Can require/import modules (Node.js modules)

## Working with Files

### Saving Notebooks

1. Use `Ctrl+S` (or `Cmd+S` on Mac) to save
2. Choose a location and keep the `.dnb` extension
3. The notebook format preserves all cell content

### Opening Existing Notebooks

1. Use File → Open File and select a `.dnb` file
2. Double-click on `.dnb` files in the Explorer
3. Notebooks open with all cells intact

## Best Practices

1. **Keep cells focused**: Each cell should have a single purpose
2. **Use markdown cells**: Document your code with explanations
3. **Clear output regularly**: Use "Clear All Outputs" to clean up
4. **Save frequently**: Like any document, save your work regularly

## Limitations

1. **No rich output**: Only text output is supported (no graphs or images)
2. **Debug session required**: Needs appropriate debug extension installed
3. **Language-specific**: Only supports languages with debug adapters
4. **Performance**: Large computations may be slower than native execution

## Troubleshooting

### Code Not Running

1. Check that the kernel (Debug Console Kernel) is selected
2. Ensure the appropriate debug extension is installed
3. Verify that no other debug session is interfering

### No Output Appearing

1. Make sure to use `print()` or `console.log()` to see output
2. Check for errors in the Debug Console view
3. Verify the debug session is active

### Session Lost

If you see errors about missing debug session:
1. Restart VS Code
2. Run a cell to start a new debug session
3. Your previous variable state will be lost

## Tips and Tricks

1. **Quick Cell Execution**: Use `Shift+Enter` to run cell and move to next
2. **Multi-line Input**: Use `Shift+Enter` within a cell to add new lines
3. **Clear Variables**: Restart the debug session to clear all variables
4. **Export Code**: Copy cell content to regular `.py` or `.js` files

## Getting Help

- View the Debug Console for error messages
- Check VS Code's Output panel for extension logs
- Report issues on the extension's GitHub repository
- Consult language-specific documentation for syntax help