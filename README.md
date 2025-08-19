# Inline Blame Mini

A lightweight VS Code extension that shows git blame information inline for the current cursor line.

![VS Code Demo](screenshots/vscode-demo.png)

## Features

- **Performance Focused**: Only shows blame for the line where your cursor is positioned
- **Clean UI**: Displays author, time, and commit message inline with subtle styling
- **PR Support**: Prioritizes showing Pull Request titles over commit messages
- **Smart User Detection**: Shows "You" for your own commits (configurable)
- **Robust Color System**: Supports hex colors, CSS names, and VS Code theme colors with opacity
- **Configurable**: Customize display options and behavior with preset styles or individual properties
- **Smart Updates**: Only updates when you move to a different line (not on every cursor position change)
- **Empty Line Detection**: Automatically skips empty lines to avoid unnecessary git blame calls

## How it works

When you place your cursor on any line in a git-tracked file, the extension will show:

- Author name (or "You" for your commits)
- Relative time (e.g., "2 hours ago", "3 days ago")
- **PR title** (if available) or commit message summary

Example: ` You, 2 hours ago • Fix inline blame performance issue`

## PR Support

The extension intelligently detects and prioritizes Pull Request information:

- **GitHub**: `Merge pull request #123 from feature-branch` → Shows PR title
- **Bitbucket**: `Merged in feature (pull request #123)` → Shows PR title
- **GitLab**: `Feature title (!123)` → Shows merge request title
- **Generic**: `Feature: Add new functionality (#123)` → Shows feature title
- **Fallback**: Regular commit message if no PR detected

## Commands

- `Ctrl+Alt+B` (or `Cmd+Alt+B` on Mac): Toggle inline blame on/off

## Configuration

You can customize the extension in VS Code Settings:

### Basic Settings

- `inlineBlameMini.enabled`: Enable or disable the extension (default: true)
- `inlineBlameMini.maxSummary`: Maximum length of commit/PR message to display (default: 60)
- `inlineBlameMini.debounceDelay`: Delay in milliseconds before updating when cursor moves (default: 150)
- `inlineBlameMini.showCurrentUserAsYou`: Show 'You' instead of your name for your commits (default: true)

### Style Settings

The extension features a robust color and opacity system that supports multiple color formats:

**Supported Color Formats:**

- **3-digit hex**: `#fff`, `#f00`, `#abc` (automatically expanded to 6-digit)
- **6-digit hex**: `#ffffff`, `#ff0000`, `#aabbcc`
- **CSS color names**: `red`, `blue`, `green`, `white`, `gray`, etc.
- **VS Code theme colors**: `editorCodeLens.foreground`, `errorForeground`, etc.

**Color Processing:**

- All colors (except VS Code theme colors) are converted to HEX format first
- Invalid colors automatically fallback to `#888888` (gray)
- Opacity is applied by converting HEX to RGBA format
- VS Code theme colors bypass opacity and use the theme's native color

**Preset System:**

- `inlineBlameMini.style.preset`: Apply a predefined style preset:
  - `custom` - Use individual style settings (default)
  - `subtle` - Low opacity, smaller font, italic
  - `prominent` - Bold, higher opacity, larger margin
  - `minimal` - Very subtle, small font, minimal spacing
  - `modern` - Clean modern look with custom colors

**Note**: Individual style properties override preset values, allowing you to use a preset as a base and customize specific properties.

### Custom Style Properties

- `inlineBlameMini.style.color`: Color of the text
  - **Hex colors**: `#fff`, `#ffffff`, `#f00`, `#ff0000`
  - **CSS names**: `red`, `blue`, `white`, `gray`, etc.
  - **VS Code theme**: `editorCodeLens.foreground`, `errorForeground`
- `inlineBlameMini.style.fontStyle`: Font style (`normal`, `italic`, `oblique`)
- `inlineBlameMini.style.fontWeight`: Font weight (`normal`, `bold`, `100`-`900`)
- `inlineBlameMini.style.fontSize`: Font size (e.g., '12px', '0.9em')
- `inlineBlameMini.style.opacity`: Opacity from 0.1 to 1.0
  - Works with hex colors and CSS color names
  - Does not affect VS Code theme colors
- `inlineBlameMini.style.margin`: CSS margin (e.g., '0 0 0 1rem')
- `inlineBlameMini.style.textDecoration`: Text decoration (`none`, `underline`, `line-through`)

### Style Examples

```json
// Subtle preset
"inlineBlameMini.style.preset": "subtle"

// 3-digit hex with opacity (auto-expanded to #ff6b6b)
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "#f6b",
"inlineBlameMini.style.fontStyle": "italic",
"inlineBlameMini.style.opacity": 0.8

// CSS color name with opacity
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "red",
"inlineBlameMini.style.opacity": 0.5

// White text with low opacity (works with both #fff and #ffffff)
"inlineBlameMini.style.preset": "modern",
"inlineBlameMini.style.color": "#fff",
"inlineBlameMini.style.opacity": 0.3,
"inlineBlameMini.style.fontSize": "0.9em",
"inlineBlameMini.style.fontWeight": "lighter"

// VS Code theme color (no opacity applied)
"inlineBlameMini.style.color": "editorWarning.foreground"

// Invalid color fallback example
"inlineBlameMini.style.color": "invalid-color-name",
"inlineBlameMini.style.opacity": 0.7
// → Automatically falls back to rgba(136, 136, 136, 0.7)
```

## Requirements

- Git must be installed and available in your PATH
- File must be saved and part of a git repository

## Performance Notes

This extension is designed to be lightweight and performant:

- Only queries git blame for the current line (not the entire file)
- Intelligent PR detection using commit message patterns
- Uses debouncing to prevent excessive git calls
- Caches user information to avoid repeated git config calls
- Clears decorations when switching between files
- Only updates when moving to a different line number

## Known Limitations

- Requires saved files (doesn't work with unsaved/dirty files)
- Only works within git repositories
- Requires git to be accessible from the command line
- PR detection depends on conventional commit message formats

## Development

To package and install:

```bash
bun install
bun run lint
bun run format
bun run package
code --install-extension inline-blame-mini-*.vsix
```
