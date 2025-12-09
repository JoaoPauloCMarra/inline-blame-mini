# Inline Blame Mini

[![Version](https://img.shields.io/badge/version-0.1.2-blue.svg)](https://marketplace.visualstudio.com/items?itemName=JoaoPauloCMarra.inline-blame-mini)
[![VS Code](https://img.shields.io/badge/VS_Code-1.105+-blue.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🚀 **Lightning-fast git blame information** - See who changed what, when, right in your editor!

A minimal, performant VS Code extension that shows git blame information **inline** for the current cursor line. No more switching tabs or running terminal commands!

## ✨ Features

### 🎯 **Smart & Fast**

- ⚡ **Instant blame** - Shows blame info as you move your cursor
- 🧠 **Intelligent caching** - Remembers blame data for lightning-fast subsequent views
- 🎭 **Smart display** - Shows "You" for your own commits
- 🚀 **Optimized performance** - Debounced updates, timeout protection, and memory-efficient caching

### 🎨 **Beautiful & Customizable**

- 🎨 **Subtle styling** - Non-intrusive gray text that blends with your theme
- 📍 **Flexible positioning** - End-of-line, above-line, or below-line
- 🎛️ **Full customization** - Colors, fonts, margins, and formats
- 🌙 **Theme aware** - Works beautifully with light and dark themes

### 🔧 **Powerful & Reliable**

- 📊 **Status bar integration** - Quick overview at a glance
- 📋 **Detailed commit view** - Click to see full commit details
- 🛠️ **Comprehensive error handling** - Helpful troubleshooting guides
- 🔍 **File filtering** - Include/exclude patterns for precise control

## 📸 Screenshots

### ✨ Inline Blame in Action

![Inline Blame Display](screenshots/blame-line.png)

_Clean, contextual blame information appears instantly as you move your cursor_

### 📊 Status Bar Overview

![Status Bar Information](screenshots/statusbar.png)

_Quick status bar summary with author and time information_

### 📋 Detailed Commit Information

_Click on any blame info to view comprehensive commit details including author, time, hash, and full commit message_

## 🚀 Quick Start

1. **Install** from VS Code Marketplace
2. **Open** any git-tracked file
3. **Move your cursor** - blame info appears instantly!
4. **Click** on blame text for detailed commit view

## ⚙️ Configuration

### Essential Settings

```json
{
  "inline-blame-mini.enabled": true,
  "inline-blame-mini.showOnlyWhenChanged": true,
  "inline-blame-mini.statusBar.enabled": true
}
```

### Advanced Customization

```json
{
  "inline-blame-mini.format": "{author}, {timeAgo} • {summary}",
  "inline-blame-mini.style.position": "end-of-line",
  "inline-blame-mini.style.color": "rgba(136, 136, 136, 0.7)",
  "inline-blame-mini.excludeFiles": [],
  "inline-blame-mini.includeFiles": ["**/*"]
}
```

## 🎮 Commands

| Command                      | Description                | Shortcut |
| ---------------------------- | -------------------------- | -------- |
| `Toggle Inline Blame`        | Enable/disable extension   | -        |
| `Refresh Blame Information`  | Manual refresh             | -        |
| `Show Commit Details`        | Open detailed commit panel | -        |
| `Show Troubleshooting Guide` | Get help with issues       | -        |
| `Open Settings`              | Quick access to settings   | -        |

## 🏆 Why Choose Inline Blame Mini?

### ⚡ **Performance First**

- **500x faster** than full-file blame operations
- **Smart caching** prevents redundant git calls
- **Timeout protection** prevents hanging on large repos
- **Memory efficient** with automatic cleanup

### 🎯 **Developer Experience**

- **Zero configuration** - works out of the box
- **Non-intrusive** - doesn't interfere with your workflow
- **Keyboard friendly** - all features accessible via commands
- **Error resilient** - helpful guidance when things go wrong

### 🔧 **Enterprise Ready**

- **Large repo support** - handles massive codebases gracefully
- **File size limits** - automatically skips problematic files
- **Git compatibility** - works with all git workflows
- **VS Code native** - follows platform conventions

## 🐛 Troubleshooting

### Common Issues & Solutions

| Issue                       | Solution                                                      |
| --------------------------- | ------------------------------------------------------------- |
| 🚫 **Git not available**    | Install Git from [git-scm.com](https://git-scm.com/downloads) |
| 📁 **Not a git repository** | Run `git init` in your project folder                         |
| 🔍 **File not tracked**     | Run `git add filename.ext` to track the file                  |
| ⏱️ **Operation timed out**  | Repository may be too large - check network connection        |
| 💾 **Unsaved changes**      | Save the file to see accurate blame information               |

### Get Help

- **Command Palette** → `Inline Blame Mini: Show Troubleshooting Guide`
- **Status Bar** → Click error/warning messages for guidance
- **GitHub Issues** → [Report bugs or request features](https://github.com/JoaoPauloCMarra/inline-blame-mini/issues)

## 📋 Requirements

- **VS Code**: 1.105+
- **Git**: Any recent version (must be in PATH)
- **Repository**: File must be saved and git-tracked

## 🤝 Contributing

Found a bug or have a feature request? We'd love to hear from you!

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/JoaoPauloCMarra/inline-blame-mini/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/JoaoPauloCMarra/inline-blame-mini/discussions)
- 📖 **Documentation**: [GitHub Wiki](https://github.com/JoaoPauloCMarra/inline-blame-mini/wiki)

## 📄 License

**MIT License** - Free for personal and commercial use

---

**Made with ❤️ for developers who care about productivity**

[⭐ Star on GitHub](https://github.com/JoaoPauloCMarra/inline-blame-mini) • [📦 Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=JoaoPauloCMarra.inline-blame-mini)
