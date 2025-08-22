const vscode = require('vscode');
const { checkGitAvailability } = require('./git');
const {
  createDecorationType,
  createStatusBar,
  setGitAvailability,
  cleanup,
} = require('./ui');
const { hookEvents } = require('./events');
const { refresh } = require('./core');

function activate(context) {
  checkGitAvailability(available => {
    setGitAvailability(available);
  });

  const decorationType = createDecorationType();
  const statusBar = createStatusBar();
  const disposables = hookEvents();

  const helpCommand = vscode.commands.registerCommand(
    'inline-blame-mini.showHelp',
    () => {
      showHelpPanel();
    }
  );

  const toggleCommand = vscode.commands.registerCommand(
    'inline-blame-mini.toggle',
    () => {
      const { toggleEnabled } = require('./core');
      const newState = toggleEnabled();
      const message = newState
        ? 'Inline Blame enabled'
        : 'Inline Blame disabled';
      vscode.window.showInformationMessage(message);
    }
  );

  const refreshCommand = vscode.commands.registerCommand(
    'inline-blame-mini.refresh',
    () => {
      refresh();
      vscode.window.showInformationMessage('Blame information refreshed');
    }
  );

  context.subscriptions.push(
    decorationType,
    statusBar,
    helpCommand,
    toggleCommand,
    refreshCommand,
    ...disposables
  );

  refresh();
}

function showHelpPanel() {
  const panel = vscode.window.createWebviewPanel(
    'inlineBlameHelp',
    'Inline Blame Mini - Troubleshooting',
    vscode.ViewColumn.One,
    {
      enableScripts: false,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getHelpContent();
}

function getHelpContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inline Blame Mini - Troubleshooting</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            line-height: 1.6;
            padding: 20px;
            max-width: 800px;
        }
        h1, h2 { color: var(--vscode-textLink-foreground); }
        .issue { 
            margin: 20px 0; 
            padding: 15px;
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
        }
        .solution { 
            margin: 10px 0; 
            padding: 10px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
        }
        code { 
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
        }
        a { color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    <h1>🔧 Inline Blame Mini - Troubleshooting Guide</h1>
    
    <div class="issue">
        <h2>🚫 Git not available</h2>
        <p><strong>Problem:</strong> Extension cannot find Git on your system.</p>
        <div class="solution">
            <p><strong>Solutions:</strong></p>
            <ul>
                <li>Install Git from <a href="https://git-scm.com/downloads">git-scm.com</a></li>
                <li>Restart VS Code after installing Git</li>
                <li>Make sure Git is in your system PATH</li>
                <li>Run <code>git --version</code> in terminal to verify installation</li>
            </ul>
        </div>
    </div>

    <div class="issue">
        <h2>📁 Not a git repository</h2>
        <p><strong>Problem:</strong> The current file is not in a Git repository.</p>
        <div class="solution">
            <p><strong>Solutions:</strong></p>
            <ul>
                <li>Initialize Git: <code>git init</code> in your project folder</li>
                <li>Clone an existing repository</li>
                <li>Open a folder that contains a Git repository</li>
            </ul>
        </div>
    </div>

    <div class="issue">
        <h2>🔍 File not tracked by git</h2>
        <p><strong>Problem:</strong> The file exists but is not tracked by Git.</p>
        <div class="solution">
            <p><strong>Solutions:</strong></p>
            <ul>
                <li>Add file to Git: <code>git add filename.ext</code></li>
                <li>Commit the file: <code>git commit -m "Add file"</code></li>
                <li>Check if file is in .gitignore</li>
            </ul>
        </div>
    </div>

    <div class="issue">
        <h2>⏱️ Operation timed out</h2>
        <p><strong>Problem:</strong> Git blame operation is taking too long.</p>
        <div class="solution">
            <p><strong>Solutions:</strong></p>
            <ul>
                <li>Try with a smaller file</li>
                <li>Check if your repository is very large</li>
                <li>Ensure stable network connection (for remote repositories)</li>
                <li>Consider using Git LFS for large files</li>
            </ul>
        </div>
    </div>

    <div class="issue">
        <h2>💾 Unsaved changes</h2>
        <p><strong>Problem:</strong> File has modifications that affect blame accuracy.</p>
        <div class="solution">
            <p><strong>Solutions:</strong></p>
            <ul>
                <li>Save the file (Ctrl/Cmd + S)</li>
                <li>Commit your changes</li>
                <li>Note: Blame shows info for the last committed version</li>
            </ul>
        </div>
    </div>

    <div class="issue">
        <h2>🆘 Still having issues?</h2>
        <div class="solution">
            <p><strong>Get more help:</strong></p>
            <ul>
                <li><a href="https://github.com/JoaoPauloCMarra/inline-blame-mini/issues">Report an issue on GitHub</a></li>
                <li><a href="https://github.com/JoaoPauloCMarra/inline-blame-mini#readme">Read the documentation</a></li>
                <li>Check VS Code's Git extension is enabled</li>
                <li>Try reloading the window (Ctrl/Cmd + Shift + P → "Reload Window")</li>
            </ul>
        </div>
    </div>
</body>
</html>`;
}

function deactivate() {
  cleanup();
}

module.exports = { activate, deactivate };
