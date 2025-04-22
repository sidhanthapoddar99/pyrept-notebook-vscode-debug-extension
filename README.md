# Debug Notebook Extension

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/sid1999.debug-notebook)](https://marketplace.visualstudio.com/items?itemName=sid1999.debug-notebook)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

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

## Publishing to VS Code Marketplace

### Prerequisites

1. Create a Microsoft Azure DevOps account
2. Create a Personal Access Token (PAT):
   - Go to https://dev.azure.com
   - Click on User Settings (profile icon) > Personal Access Tokens
   - Create new token with "Marketplace (Publish)" scope
3. Install vsce: `npm install -g @vscode/vsce`

### Publishing Steps

1. **Clean and Prepare**
   ```bash
   # Clean dependencies
   rm -rf node_modules
   npm install --production=false
   
   # Compile
   npm run compile
   
   # Create necessary directories if they don't exist
   mkdir -p icons
   
   # Ensure icons are present
   cp src/icons/* icons/
   ```

2. **Create Publisher**
   ```bash
   vsce create-publisher sid1999 # Use your publisher name
   ```

3. **Login and Publish**
   ```bash
   # Login with your PAT
   vsce login sid1999
   
   # Package extension
   vsce package
   
   # Publish to marketplace
   vsce publish
   ```

4. **Update Extension**
   ```bash
   # Increment version and publish
   vsce publish minor  # for 1.0.0 -> 1.1.0
   vsce publish patch  # for 1.0.0 -> 1.0.1
   vsce publish major  # for 1.0.0 -> 2.0.0
   ```

### Verification

- Visit https://marketplace.visualstudio.com/manage/publishers/sid1999
- Check your extension at https://marketplace.visualstudio.com/items?itemName=sid1999.debug-notebook

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

This extension leverages VS Code's excellent Notebook API and Debug Adapter Protocol to create a unique debugging experience. Special thanks to the VS Code team for making this possible.

## Support

- **Issues**: Report bugs at https://github.com/yourusername/debug-notebook/issues
- **Feature Requests**: Open an issue with the "enhancement" label
- **Contact**: sidhantha1999@gmail.com