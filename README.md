# Debug Notebook Extension

A VS Code extension that provides a notebook interface where code cells execute directly in the debug console, combining the interactive experience of notebooks with the power of VS Code's debugging capabilities.

## Features

- 📓 Create and edit notebook files with `.dnb` extension
- 🐍 Support for Python and JavaScript code execution
- 🔄 Persistent state between cell executions
- 🐛 Integration with VS Code's debug infrastructure
- 📝 Mix code and markdown cells for documentation
- 💾 Save and load notebook files

## Requirements

- VS Code 1.90.0 or later
- Python extension (for Python support)
- Node.js (for JavaScript support)

## Installation

1. Download from VS Code Marketplace (when published)
2. Or install from VSIX file:
   - Download the `.vsix` file
   - In VS Code, go to Extensions view
   - Click "..." menu → "Install from VSIX..."

## Quick Start

1. Create a new Debug Notebook:
   - Command Palette → "Debug Notebook: New Debug Notebook"
   - Or create a file with `.dnb` extension

2. Write code in cells:
   ```python
   # Python example
   message = "Hello, Debug Notebook!"
   print(message)
   ```

3. Run cells using the play button or `Shift+Enter`

## How It Works

This extension uses VS Code's Debug Adapter Protocol to execute code cells. Instead of running a separate kernel process like Jupyter, it leverages existing debug adapters:

- Code execution happens via DAP `evaluate` requests
- Output is captured through debug output events
- State persists within the debug session
- No separate kernel process needed

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/debug-notebook.git
cd debug-notebook

# Install dependencies
npm install

# Compile
npm run compile
```

### Testing

```bash
# Run tests
npm test

# Debug the extension
# Press F5 in VS Code
```

### Building

```bash
# Package extension
vsce package
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Known Issues

- Rich output (graphs, images) not supported
- Breakpoints cannot be set directly in cell code
- Performance may be slower than native execution for heavy computations

## Release Notes

### 0.0.1

- Initial release
- Basic notebook functionality
- Python and JavaScript support
- Debug console integration

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Inspired by VS Code's Notebook API examples
- Built on top of the Debug Adapter Protocol
- Thanks to the VS Code extension development community