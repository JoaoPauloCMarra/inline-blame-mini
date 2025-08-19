# Style Examples

Here are some style configurations you can copy to your VS Code settings:

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
// GitHub-like style
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "#586069",
"inlineBlameMini.style.fontStyle": "normal",
"inlineBlameMini.style.fontSize": "0.9em",
"inlineBlameMini.style.opacity": 0.8,
"inlineBlameMini.style.margin": "0 0 0 2rem"

// Colorful warning style
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "#ff9500",
"inlineBlameMini.style.fontStyle": "italic",
"inlineBlameMini.style.fontWeight": "bold",
"inlineBlameMini.style.opacity": 0.9

// Underlined and subtle
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "editorCodeLens.foreground",
"inlineBlameMini.style.textDecoration": "underline",
"inlineBlameMini.style.fontStyle": "normal",
"inlineBlameMini.style.opacity": 0.6

// Dark theme friendly
"inlineBlameMini.style.preset": "custom",
"inlineBlameMini.style.color": "#7c7c7c",
"inlineBlameMini.style.fontStyle": "italic",
"inlineBlameMini.style.fontSize": "0.85em",
"inlineBlameMini.style.opacity": 0.7
```

## VS Code Theme Color References

You can use these VS Code theme color IDs:

- `editorCodeLens.foreground` - Default code lens color
- `editorInfo.foreground` - Info message color
- `editorWarning.foreground` - Warning color
- `editorError.foreground` - Error color
- `descriptionForeground` - Description text color
- `disabledForeground` - Disabled text color
