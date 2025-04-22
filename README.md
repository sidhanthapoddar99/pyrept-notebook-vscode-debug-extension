# Debug Notebook for VS Code

**Interactive notebook interface that connects to your debug sessions** - Debug your code like never before with the power of notebooks!

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/sidh1999.debug-notebook)](https://marketplace.visualstudio.com/items/?itemName=sidh1999.debug-notebook)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/sidhanthapoddar99/pyrept-notebook-vscode-debug-extension/blob/master/LICENSE)
<!-- [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com) -->

## What is Debug Notebook?

Debug Notebook brings the interactive power of notebooks to your debugging workflow. Instead of just using the debug console, you can now use a full notebook interface that connects automatically to any active debug session.

### 🚀 Key Features

- **Automatic Debug Connection**: Start debugging and open a notebook - it connects automatically!
- **Interactive Exploration**: Use cells to inspect variables, test fixes, and call functions
- **Persistent Sessions**: Save your debugging sessions for future reference
- **Multi-Language Support**: Works with Python and JavaScript debugging
- **Familiar Interface**: If you've used Jupyter notebooks, you'll feel right at home

## Getting Started

### Installation

1. Install from VS Code Marketplace (search for "Debug Notebook")
2. Make sure you have the Python extension installed (for Python debugging)
3. That's it! You're ready to start debugging with notebooks

### Quick Tutorial

1. **Start Debugging**
   - Set a breakpoint in your code
   - Press F5 to start debugging
   - When paused at the breakpoint, create a new Debug Notebook

2. **Create a Debug Notebook**
   - Use Command Palette: `Debug Notebook: New Debug Notebook`
   - Or create a file with `.dnb` extension

3. **Write and Run Cells**
   ```python
   # Inspect the current state
   print(locals())  # See all variables
   
   # Modify variables
   x = x * 2
   
   # Test functions
   result = problematic_function(x, y)
   
   # Experiment with fixes
   data = clean_data(data)
   ```

4. **Save Your Work**
   - Save the notebook to document your debugging process
   - Share with teammates to explain issues and solutions

## Why Debug Notebook?

### Traditional Debugging vs Debug Notebook

| Traditional Debug Console | Debug Notebook |
|--------------------------|----------------|
| One command at a time | Multiple cells with persistent output |
| No history after closing | Save debugging sessions |
| Hard to document process | Built-in documentation |
| Limited experimentation | Easy to test multiple approaches |

### Perfect For:

- **Complex Debugging**: Test multiple hypotheses without changing source code
- **Teaching**: Document debugging techniques for education
- **Team Collaboration**: Share debugging sessions with teammates
- **Bug Investigation**: Keep a record of what you tried and what worked
- **Learning**: See how variables change in real-time

## Usage Examples

### Python Debugging Session

```python
# Cell 1: Inspect the bug
print(f"Current value of user_data: {user_data}")
print(f"Exception occurred at: {e}")

# Cell 2: Test a fix
try:
    fixed_data = clean_user_data(user_data)
    process_user(fixed_data)
    print("Fix works!")
except Exception as e:
    print(f"Still failing: {e}")

# Cell 3: Explore alternative approach
from alternative_lib import better_processor
result = better_processor(user_data)
print(f"Alternative result: {result}")
```

### JavaScript Debugging Session

```javascript
// Cell 1: Check current state
console.log('Current array:', problematicArray);
console.log('Item count:', problematicArray.length);

// Cell 2: Test array manipulation
const filtered = problematicArray.filter(item => item.valid);
console.log('Filtered items:', filtered);

// Cell 3: Fix and verify
problematicArray = filtered;
processArray(problematicArray);
console.log('Processing successful!');
```

## Tips and Tricks

1. **Use Markdown Cells**: Document your investigation process
2. **Save Frequently**: Keep your debugging sessions for future reference
3. **Keyboard Shortcuts**: `Shift+Enter` to run cell and move to next
4. **Clear Output**: Use "Clear All Outputs" to clean up
5. **Multiple Sessions**: Run separate debug sessions for different issues

## Troubleshooting

### Common Issues

1. **"No active debug session"**
   - Make sure you've started debugging first (F5)
   - Check that the debugger is paused at a breakpoint

2. **Cells not running**
   - Verify the kernel is selected (Debug Console Kernel)
   - Check that appropriate debug extension is installed

3. **No output appearing**
   - Use `print()` or `console.log()` for output
   - Check the Debug Console for errors

## Requirements

- VS Code 1.90.0 or later
- Language-specific debug extensions:
  - Python: Python extension by Microsoft
  - JavaScript: Built-in debugger

## Known Limitations

- Text output only (no graphs or rich media)
- Requires active debug session
- Limited to languages with debug adapter support

## Support

- 📝 Report issues: [GitHub Issues](https://github.com/yourusername/debug-notebook/issues)
- 💡 Feature requests: [GitHub Discussions](https://github.com/yourusername/debug-notebook/discussions)
- 📧 Contact: sidhanthapoddar99@gmail.com

## License

MIT License - Free to use in personal and commercial projects.

---

**Made with ❤️ for developers who love efficient debugging**

