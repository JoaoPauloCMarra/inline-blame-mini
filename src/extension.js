const vscode = require('vscode');
const { checkGitAvailability } = require('./git');
const {
  createDecorationType,
  createStatusBar,
  setGitAvailability,
  cleanup,
} = require('./ui');
const { hookEvents } = require('./events');
const { refresh, toggleEnabled } = require('./core');

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

  const showCommitDetailsCommand = vscode.commands.registerCommand(
    'inline-blame-mini.showCommitDetails',
    () => {
      showCommitDetailsPanel();
    }
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    'inline-blame-mini.openSettings',
    () => {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'inline-blame-mini'
      );
    }
  );

  context.subscriptions.push(
    decorationType,
    statusBar,
    helpCommand,
    toggleCommand,
    refreshCommand,
    showCommitDetailsCommand,
    openSettingsCommand,
    ...disposables
  );
}

function getHelpContent() {
  const issues = [
    {
      title: '🚫 Git not available',
      problem: 'Extension cannot find Git on your system.',
      solutions: [
        'Install Git from <a href="https://git-scm.com/downloads">git-scm.com</a>',
        'Restart VS Code after installing Git',
        'Make sure Git is in your system PATH',
        'Run <code>git --version</code> in terminal to verify installation',
        "Ensure VS Code's built-in Git extension is enabled",
      ],
    },
    {
      title: '📁 Not a git repository',
      problem: 'The current file is not in a Git repository.',
      solutions: [
        'Initialize Git: <code>git init</code> in your project folder',
        'Clone an existing repository',
        'Open a folder that contains a Git repository',
      ],
    },
    {
      title: '🔍 File not tracked by git',
      problem: 'The file exists but is not tracked by Git.',
      solutions: [
        'Add file to Git: <code>git add filename.ext</code>',
        'Commit the file: <code>git commit -m "Add file"</code>',
        'Check if file is in .gitignore',
      ],
    },
    {
      title: '⏱️ Operation timed out',
      problem: 'Git blame operation is taking too long.',
      solutions: [
        'Try with a smaller file',
        'Check if your repository is very large',
        'Ensure stable network connection (for remote repositories)',
        'Consider using Git LFS for large files',
      ],
    },
    {
      title: '💾 Unsaved changes',
      problem: 'File has modifications that affect blame accuracy.',
      solutions: [
        'Save the file (Ctrl/Cmd + S)',
        'Commit your changes',
        'Note: Blame shows info for the last committed version',
      ],
    },
    {
      title: '🆘 Still having issues?',
      problem: '',
      solutions: [
        '<a href="https://github.com/JoaoPauloCMarra/inline-blame-mini/issues">Report an issue on GitHub</a>',
        '<a href="https://github.com/JoaoPauloCMarra/inline-blame-mini#readme">Read the documentation</a>',
        "Check VS Code's Git extension is enabled",
        'Try reloading the window (Ctrl/Cmd + Shift + P → "Reload Window")',
      ],
    },
  ];

  const issueHtml = issues
    .map(
      issue => `
    <div class="issue">
        <h2>${issue.title}</h2>
        ${issue.problem ? `<p><strong>Problem:</strong> ${issue.problem}</p>` : ''}
        <div class="solution">
            <p><strong>${issue.problem ? 'Solutions' : 'Get more help'}:</strong></p>
            <ul>${issue.solutions.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
    </div>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inline Blame Mini - Troubleshooting</title>
    <style>
        body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background-color: var(--vscode-editor-background); line-height: 1.6; padding: 20px; max-width: 800px; }
        h1, h2 { color: var(--vscode-textLink-foreground); }
        .issue { margin: 20px 0; padding: 15px; background-color: var(--vscode-textBlockQuote-background); border-left: 4px solid var(--vscode-textLink-foreground); }
        .solution { margin: 10px 0; padding: 10px; background-color: var(--vscode-editor-inactiveSelectionBackground); }
        code { background-color: var(--vscode-textCodeBlock-background); padding: 2px 4px; border-radius: 3px; }
        a { color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    <h1>🔧 Inline Blame Mini - Troubleshooting Guide</h1>
    ${issueHtml}
</body>
</html>`;
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

function showCommitDetailsPanel() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  // Get blame data for current line
  const { blameLine } = require('./git');
  const currentLine = editor.selection.active.line + 1;
  const file = editor.document.fileName;

  blameLine(file, currentLine, (blameData, error) => {
    if (error || !blameData) {
      vscode.window.showErrorMessage(
        'Could not get blame information for current line'
      );
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'inlineBlameCommitDetails',
      `Commit Details - ${blameData.hash.substring(0, 8)}`,
      vscode.ViewColumn.One,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getCommitDetailsContent(blameData);
  });
}

function getCommitDetailsContent(blameData) {
  const { relativeTime } = require('./utils');
  const timeAgo = relativeTime(blameData.time * 1000);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Commit Details</title>
    <style>
        body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background-color: var(--vscode-editor-background); line-height: 1.6; padding: 20px; max-width: 800px; }
        .commit-hash { font-family: var(--vscode-editor-font-family); background-color: var(--vscode-textCodeBlock-background); padding: 4px 8px; border-radius: 3px; font-size: 0.9em; }
        .commit-info { background-color: var(--vscode-textBlockQuote-background); padding: 15px; border-radius: 5px; margin: 10px 0; }
        .commit-message { background-color: var(--vscode-editor-inactiveSelectionBackground); padding: 10px; border-radius: 3px; margin: 10px 0; white-space: pre-wrap; }
        .label { font-weight: bold; color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    <h1>Commit Details</h1>
    <div class="commit-info">
        <p><span class="label">Hash:</span> <span class="commit-hash">${blameData.hash}</span></p>
        <p><span class="label">Author:</span> ${blameData.author}</p>
        <p><span class="label">Time:</span> ${timeAgo}</p>
        ${blameData.prNumber ? `<p><span class="label">PR:</span> #${blameData.prNumber}</p>` : ''}
    </div>
    <div class="commit-message">
        <div class="label">Message:</div>
        ${blameData.summary}
    </div>
</body>
</html>`;
}

function deactivate() {
  cleanup();
}

module.exports = { activate, deactivate };
