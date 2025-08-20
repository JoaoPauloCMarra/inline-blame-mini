# Inline Blame Mini

A minimal VS Code extension that shows git blame information inline for the current cursor line.

## Screenshots

### Inline Blame Display

![Inline Blame](screenshots/blame-line.png)

### Status Bar Information

![Status Bar](screenshots/statusbar.png)

## Features

- **Lightweight**: Only shows blame for the line where your cursor is positioned
- **Clean**: Displays author, time, and commit message inline with subtle styling
- **Smart**: Shows "You" for your own commits and detects Pull Request information
- **Fast**: Optimized with debouncing and caching for better performance

## How it works

When you place your cursor on any line in a git-tracked file, the extension automatically shows:

- **Inline blame text** (see first screenshot above): Author name (or "You" for your commits), relative time, and commit message
- **Status bar information** (see second screenshot above): Simplified format with author and time
- Pull Request title detection when available
- Automatic updates when moving between lines

Example inline format: ` You, 2 hours ago • Fix inline blame performance issue`

The extension works automatically - no commands or configuration needed!

## Requirements

- Git must be installed and available in your PATH
- File must be saved and part of a git repository

## Performance

This extension is designed to be fast and efficient:

- Only queries git blame for the current line (not entire files)
- Uses debouncing to prevent excessive git calls
- Caches user information per workspace
- Only updates when moving to different lines

## Styling

The extension uses these default styles (configurable via constants in code):

- Color: `rgba(136, 136, 136, 0.7)` (gray with opacity)
- Font: Italic, 0.9em size
- Margin: 1rem left padding
