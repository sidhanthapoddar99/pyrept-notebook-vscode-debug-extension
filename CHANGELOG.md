# Change Log

All notable changes to the "Debug Notebook" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-04-22

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

[1.0.0]: https://github.com/yourusername/debug-notebook/releases/tag/v1.0.0