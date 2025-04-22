# Debug Notebook Extension

A VS Code extension that bridges the gap between notebooks and debugging. Debug Notebook provides an interactive notebook interface that automatically connects to active debug sessions, allowing you to explore and manipulate code execution in real-time.

## Features

- 🔄 **Automatic Debug Session Connection**: Notebooks automatically connect to any active debug session
- 🐛 **Full Debug Context**: Access and modify variables, call functions, and explore state while debugging
- 📓 **Familiar Notebook Interface**: Use code cells just like Jupyter notebooks
- 💾 **Persistent Debugging Sessions**: Save notebooks to document your debugging process
- 🎨 **Language Support**: Works with Python and JavaScript debugging
- ⚡ **Live Execution**: Changes in notebook cells affect the active debug session

## Quick Start

1. Install the extension from VS Code Marketplace
2. Start debugging your code (F5)
3. When paused at a breakpoint, create or open a `.dnb` file
4. The notebook automatically connects to your debug session
5. Run cells to inspect and modify the debug state

```python
# Example: At a breakpoint, explore your code
print(locals())         # See all local variables
print(x)               # Inspect specific variable
x = x * 2              # Modify values
result = func(x, y)    # Call functions in scope
```

## Requirements

- VS Code 1.90.0 or later
- Python extension (for Python debugging)
- Active debug session to connect to

## Usage

### Creating Debug Notebooks

- **Command Palette**: "Debug Notebook: New Debug Notebook"
- **File Explorer**: Create a file with `.dnb` extension

### Running Cells

- Press `Shift+Enter` or click the play button
- Output appears directly below each cell
- Errors are displayed with full stack traces

### Automatic Connection

Debug Notebooks automatically detect and connect to any active debug session. No manual configuration needed!

## Example Workflow

1. Set breakpoints in your code
2. Start debugging (F5)
3. When paused, open a Debug Notebook
4. Explore the current state:
   ```python
   # See all variables
   print(locals())
   
   # Modify values
   data = data * 2
   
   # Test fixes
   result = problematic_function(data)
   ```

## Advantages Over Traditional Debugging

- **Interactive Exploration**: Test hypotheses without modifying source code
- **Documentation**: Save debugging sessions for future reference
- **Experimentation**: Try multiple approaches in separate cells
- **State Manipulation**: Modify variables and see immediate effects

## Known Limitations

- Text output only (no graphs or rich media)
- Requires active debug session
- Limited to languages with debug adapter support

## Development

```bash
# Clone repository
git clone https://github.com/yourusername/debug-notebook.git

# Install dependencies
npm install

# Compile
npm run compile

# Run extension
Press F5 in VS Code
```

## Release Notes

### 1.0.0

- Automatic debug session connection
- Streamlined user interface
- Added custom icon for .dnb files
- Improved error handling
- Enhanced documentation

### 0.0.1

- Initial release
- Basic notebook functionality
- Manual session connection

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

This extension leverages VS Code's excellent Notebook API and Debug Adapter Protocol to create a unique debugging experience. Special thanks to the VS Code team for making this possible.