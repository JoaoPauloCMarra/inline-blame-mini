# Style Examples

Here are some style configurations you can copy to your VS Code settings.

## Color System

The extension supports multiple color formats with automatic conversion and opacity:

- **3-digit hex**: `#fff`, `#f00` (auto-expanded to 6-digit)
- **6-digit hex**: `#ffffff`, `#ff0000`
- **CSS names**: `red`, `blue`, `white`, `gray`, etc.
- **VS Code themes**: `editorCodeLens.foreground`, `errorForeground`

Invalid colors automatically fallback to `#888888`.

## Preset Styles

```json
// Subtle and unobtrusive
"inlineBlameMini.style.preset": "subtle"

// Bold and prominent
"inlineBlameMini.style.preset": "prominent"

// Very minimal
"inlineBlameMini.style.preset": "minimal"

// Modern clean look
"inlineBlameMini.style.preset": "modern"
```

## Custom Styles

```json
// GitHub-like style with 6-digit hex
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "#586069",
"inlineBlameMini.style.fontStyle": "normal",
"inlineBlameMini.style.fontSize": "0.9em",
"inlineBlameMini.style.opacity": 0.8,
"inlineBlameMini.style.margin": "0 0 0 2rem"

// White text with low opacity (3-digit hex)
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "#fff",
"inlineBlameMini.style.fontStyle": "italic",
"inlineBlameMini.style.fontWeight": "lighter",
"inlineBlameMini.style.opacity": 0.3

// CSS color name with opacity
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "orange",
"inlineBlameMini.style.fontStyle": "italic",
"inlineBlameMini.style.fontWeight": "bold",
"inlineBlameMini.style.opacity": 0.9

// Preset override example
"inlineBlameMini.style.preset": "modern",
"inlineBlameMini.style.color": "red",
"inlineBlameMini.style.opacity": 0.5

// Underlined with VS Code theme color (no opacity)
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "editorCodeLens.foreground",
"inlineBlameMini.style.textDecoration": "underline",
"inlineBlameMini.style.fontStyle": "normal"

// Dark theme friendly with fallback protection
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "#7c7c7c",
"inlineBlameMini.style.fontStyle": "italic",
"inlineBlameMini.style.fontSize": "0.85em",
"inlineBlameMini.style.opacity": 0.7

// Invalid color example (auto-fallback to #888888)
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "invalid-color-name",
"inlineBlameMini.style.opacity": 0.6
// → Results in rgba(136, 136, 136, 0.6)
```

## VS Code Theme Color References

You can use these VS Code theme color IDs:

- `editorCodeLens.foreground` - Default code lens color
- `editorInfo.foreground` - Info message color
- `editorWarning.foreground` - Warning color
- `editorError.foreground` - Error color
- `descriptionForeground` - Description text color
- `disabledForeground` - Disabled text color
