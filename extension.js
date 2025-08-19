const vscode = require('vscode');
const { execFile } = require('child_process');

let decorationType;
let statusBar;
let enabled = true;
let disposables = [];
let gitAvailable = true;
const userCache = new Map();

function updateDecorationType() {
  if (decorationType) {
    decorationType.dispose();
  }

  const config = vscode.workspace.getConfiguration('inlineBlameMini');
  const styleConfig = getStyleConfig(config);

  decorationType = vscode.window.createTextEditorDecorationType({
    after: styleConfig,
  });
}

function getStyleConfig(config) {
  const preset = config.get('style.preset', 'custom');

  if (preset !== 'custom') {
    return getPresetStyle(preset);
  }

  const style = {
    margin: config.get('style.margin', '0 0 0 1rem'),
  };

  const colorValue = config.get('style.color', 'editorCodeLens.foreground');
  if (
    colorValue.startsWith('#') ||
    colorValue.startsWith('rgb') ||
    colorValue.startsWith('hsl')
  ) {
    style.color = colorValue;
  } else {
    style.color = new vscode.ThemeColor(colorValue);
  }

  const fontStyle = config.get('style.fontStyle', 'italic');
  if (fontStyle !== 'normal') {
    style.fontStyle = fontStyle;
  }

  const fontWeight = config.get('style.fontWeight', 'normal');
  if (fontWeight !== 'normal') {
    style.fontWeight = fontWeight;
  }

  const fontSize = config.get('style.fontSize', '0.9em');
  if (fontSize) {
    style.fontSize = fontSize;
  }

  const opacity = config.get('style.opacity', 0.8);
  if (opacity !== 1.0) {
    style.opacity = opacity.toString();
  }

  const textDecoration = config.get('style.textDecoration', 'none');
  if (textDecoration !== 'none') {
    style.textDecoration = textDecoration;
  }

  return style;
}

function getPresetStyle(preset) {
  const presets = {
    subtle: {
      margin: '0 0 0 1rem',
      color: new vscode.ThemeColor('editorCodeLens.foreground'),
      fontStyle: 'italic',
      opacity: '0.6',
      fontSize: '0.9em',
    },
    prominent: {
      margin: '0 0 0 1.5rem',
      color: new vscode.ThemeColor('editorInfo.foreground'),
      fontStyle: 'normal',
      fontWeight: 'bold',
      opacity: '0.8',
    },
    minimal: {
      margin: '0 0 0 0.5rem',
      color: new vscode.ThemeColor('editorCodeLens.foreground'),
      fontStyle: 'normal',
      fontSize: '0.8em',
      opacity: '0.5',
    },
    modern: {
      margin: '0 0 0 1rem',
      color: '#888888',
      fontStyle: 'italic',
      fontWeight: '300',
      textDecoration: 'none',
      opacity: '0.7',
    },
  };

  return presets[preset] || presets.subtle;
}

function showStatusMessage(message) {
  vscode.window.setStatusBarMessage(`$(git-commit) ${message}`, 3000);
}

function checkGitAvailability() {
  execFile('git', ['--version'], err => {
    if (err) {
      gitAvailable = false;
      vscode.window.showInformationMessage(
        'Git not found in PATH. Inline Blame Mini will be disabled.',
        { modal: false }
      );
    }
  });
}

function activate(context) {
  checkGitAvailability();
  enabled = vscode.workspace
    .getConfiguration('inlineBlameMini')
    .get('enabled', true);
  updateDecorationType();
  statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBar.command = 'inlineBlame.toggle';
  statusBar.show();

  context.subscriptions.push(
    decorationType,
    statusBar,
    vscode.commands.registerCommand('inlineBlame.toggle', () => {
      enabled = !enabled;
      vscode.workspace
        .getConfiguration('inlineBlameMini')
        .update('enabled', enabled, true);
      showStatusMessage(`Inline Blame ${enabled ? 'enabled' : 'disabled'}`);
      refresh();
    }),
    vscode.commands.registerCommand('inlineBlame.enable', () => {
      if (!enabled) {
        enabled = true;
        vscode.workspace
          .getConfiguration('inlineBlameMini')
          .update('enabled', enabled, true);
        showStatusMessage('Inline Blame enabled');
        refresh();
      } else {
        showStatusMessage('Inline Blame is already enabled');
      }
    }),
    vscode.commands.registerCommand('inlineBlame.disable', () => {
      if (enabled) {
        enabled = false;
        vscode.workspace
          .getConfiguration('inlineBlameMini')
          .update('enabled', enabled, true);
        showStatusMessage('Inline Blame disabled');
        refresh();
      } else {
        showStatusMessage('Inline Blame is already disabled');
      }
    }),
    vscode.commands.registerCommand('inlineBlame.showCurrentLine', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
      }

      if (!enabled) {
        vscode.window.showInformationMessage(
          'Inline Blame is disabled. Enable it first.'
        );
        return;
      }

      const file = editor.document.fileName;
      const currentLine = editor.selection.active.line + 1;

      blameLine(file, currentLine, blameData => {
        if (!blameData) {
          vscode.window.showInformationMessage(
            'No git blame information available for this line'
          );
          return;
        }

        let message;
        if (blameData.isUncommitted) {
          message = `Line ${currentLine}: ${blameData.summary}`;
        } else {
          const summary = trimSummary(blameData.summary);
          const rel = relativeTime(blameData.time * 1000);
          message = `Line ${currentLine}: ${blameData.author}, ${rel} • ${summary} (${blameData.hash})`;
        }

        vscode.window
          .showInformationMessage(message, 'Copy to Clipboard')
          .then(selection => {
            if (selection === 'Copy to Clipboard') {
              vscode.env.clipboard.writeText(message);
              showStatusMessage('Blame info copied to clipboard');
            }
          });
      });
    })
  );

  hookEvents(context);
  refresh();
}

function hookEvents(context) {
  const config = vscode.workspace.getConfiguration('inlineBlameMini');
  const debounceDelay = config.get('debounceDelay', 150);

  const onEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      refresh();
    }
  });

  const onSelection = vscode.window.onDidChangeTextEditorSelection(
    debounce(event => {
      const currentLine = event.textEditor.selection.active.line;
      if (currentLine !== (hookEvents.lastLine || -1)) {
        hookEvents.lastLine = currentLine;
        refresh();
      }
    }, debounceDelay)
  );

  const onSave = vscode.workspace.onDidSaveTextDocument(
    debounce(() => {
      refresh();
    }, 200)
  );

  const onConfig = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('inlineBlameMini')) {
      if (event.affectsConfiguration('inlineBlameMini.enabled')) {
        enabled = vscode.workspace
          .getConfiguration('inlineBlameMini')
          .get('enabled', true);
      }

      if (event.affectsConfiguration('inlineBlameMini.debounceDelay')) {
        disposables.forEach(d => d.dispose());
        hookEvents(context);
        return;
      }

      if (event.affectsConfiguration('inlineBlameMini.style')) {
        updateDecorationType();
      }

      refresh();
    }
  });

  disposables = [onEditor, onSelection, onSave, onConfig];
  context.subscriptions.push(...disposables);
}

function refresh() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  editor.setDecorations(decorationType, []);

  if (!gitAvailable) {
    statusBar.text = '$(error) Git not available';
    statusBar.tooltip = 'Git command not found in PATH. Please install Git.';
    statusBar.show();
    return;
  }

  if (!enabled) {
    statusBar.text = '$(eye-closed) Inline Blame: Disabled';
    statusBar.tooltip =
      'Click to enable inline blame or press Ctrl+Alt+B to toggle';
    statusBar.show();
    return;
  }

  if (editor.document.isUntitled) {
    statusBar.text = '$(new-file) Untitled file';
    statusBar.tooltip = 'Save the file first to see git blame information';
    statusBar.show();
    return;
  }

  const isDirty = editor.document.isDirty;

  const file = editor.document.fileName;
  const currentLine = editor.selection.active.line + 1;

  blameLine(file, currentLine, blameData => {
    if (!blameData) {
      const dirtyIndicator = isDirty ? ' $(save) Unsaved changes' : '';
      statusBar.text = `$(warning) No git blame${dirtyIndicator}`;
      statusBar.tooltip =
        'Not a git repository or no blame data available for this line' +
        (isDirty ? '\nFile has unsaved changes' : '');
      statusBar.show();
      return;
    }

    if (blameData.isUncommitted) {
      const inlineText = ` ${blameData.summary}`;

      const lineIndex = currentLine - 1;
      const line = editor.document.lineAt(lineIndex);
      const endPosition = line.range.end;

      const decoration = {
        range: new vscode.Range(endPosition, endPosition),
        renderOptions: {
          after: {
            contentText: inlineText,
          },
        },
      };

      editor.setDecorations(decorationType, [decoration]);

      statusBar.text = `$(edit) ${blameData.summary}`;
      statusBar.tooltip = `Uncommitted changes\nClick to toggle • Ctrl+Alt+B to toggle • Ctrl+Alt+I for details`;
      statusBar.show();
      return;
    }

    const summary = trimSummary(blameData.summary);
    const rel = relativeTime(blameData.time * 1000);

    let inlineText = ` ${blameData.author}, ${rel}`;

    if (blameData.prNumber) {
      inlineText += ` via PR #${blameData.prNumber}`;
    }

    inlineText += ` • ${summary}`;

    const lineIndex = currentLine - 1;
    const line = editor.document.lineAt(lineIndex);
    const endPosition = line.range.end;

    const decoration = {
      range: new vscode.Range(endPosition, endPosition),
      renderOptions: {
        after: {
          contentText: inlineText,
        },
      },
    };

    editor.setDecorations(decorationType, [decoration]);

    const dirtyIndicator = isDirty ? ' $(save)' : '';
    statusBar.text = `$(git-commit) ${blameData.author}, ${rel}${dirtyIndicator}`;
    statusBar.tooltip = `${blameData.hash} - ${summary}${isDirty ? '\nFile has unsaved changes' : ''}\nClick to toggle • Ctrl+Alt+B to toggle • Ctrl+Alt+I for details`;
    statusBar.show();
  });
}

function blameLine(file, line, cb) {
  try {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(file)
    );
    if (!workspaceFolder) {
      cb(null);
      return;
    }

    const opts = { cwd: workspaceFolder.uri.fsPath };
    const args = [
      'blame',
      `-L`,
      `${line},${line}`,
      '--line-porcelain',
      '--',
      file,
    ];

    execFile('git', args, opts, (err, stdout, stderr) => {
      if (err || !stdout || stderr) {
        cb(null);
        return;
      }

      try {
        const lines = stdout.trim().split('\n');
        if (lines.length === 0) {
          cb(null);
          return;
        }

        const firstLine = lines[0];
        if (!firstLine) {
          cb(null);
          return;
        }

        const hash = firstLine.split(' ')[0];
        if (!hash || hash.length < 8) {
          cb(null);
          return;
        }

        if (hash.startsWith('00000000')) {
          cb({
            author: 'You',
            time: Date.now() / 1000,
            summary: 'Not committed yet, just now',
            hash: 'uncommitted',
            isPR: false,
            prNumber: null,
            isUncommitted: true,
          });
          return;
        }

        const metadata = {};
        let summary = '';

        for (const line of lines) {
          const spaceIndex = line.indexOf(' ');
          if (spaceIndex > -1) {
            const key = line.substring(0, spaceIndex);
            const value = line.substring(spaceIndex + 1);
            metadata[key] = value;
          } else if (line.startsWith('\t')) {
            summary = line.substring(1);
          }
        }

        const author = metadata['author'] || 'Unknown';
        const authorTime = parseInt(metadata['author-time'] || '0', 10);
        const authorEmail = metadata['author-mail'] || '';

        getCurrentGitUser(workspaceFolder.uri.fsPath, currentUser => {
          const config = vscode.workspace.getConfiguration('inlineBlameMini');
          const showCurrentUserAsYou = config.get('showCurrentUserAsYou', true);

          const isCurrentUser =
            currentUser &&
            (currentUser.email === authorEmail || currentUser.name === author);

          getPRInfo(workspaceFolder.uri.fsPath, hash, prData => {
            if (prData && prData.title) {
              cb({
                author: isCurrentUser && showCurrentUserAsYou ? 'You' : author,
                time: authorTime,
                summary: prData.title,
                hash: hash.substring(0, 8),
                isPR: true,
                prNumber: prData.number,
              });
            } else {
              getFullCommitMessage(
                workspaceFolder.uri.fsPath,
                hash,
                fullMessage => {
                  const displaySummary =
                    fullMessage || summary || 'No commit message';

                  cb({
                    author:
                      isCurrentUser && showCurrentUserAsYou ? 'You' : author,
                    time: authorTime,
                    summary: displaySummary,
                    hash: hash.substring(0, 8),
                    isPR: false,
                    prNumber: null,
                  });
                }
              );
            }
          });
        });
      } catch (parseError) {
        cb(null);
      }
    });
  } catch (error) {
    cb(null);
  }
}

function getFullCommitMessage(cwd, hash, cb) {
  const args = ['log', '--format=%s', '-n', '1', hash];

  execFile('git', args, { cwd }, (err, stdout) => {
    if (err || !stdout) {
      cb(null);
      return;
    }

    cb(stdout.trim());
  });
}

function getCurrentGitUser(cwd, cb) {
  if (userCache.has(cwd)) {
    cb(userCache.get(cwd));
    return;
  }

  const getUserName = new Promise(resolve => {
    execFile('git', ['config', 'user.name'], { cwd }, (err, stdout) => {
      resolve(err ? null : stdout.trim());
    });
  });

  const getUserEmail = new Promise(resolve => {
    execFile('git', ['config', 'user.email'], { cwd }, (err, stdout) => {
      resolve(err ? null : stdout.trim());
    });
  });

  Promise.all([getUserName, getUserEmail]).then(([name, email]) => {
    const user = name && email ? { name, email } : null;
    userCache.set(cwd, user);
    cb(user);
  });
}

function getPRInfo(cwd, hash, cb) {
  const args = ['log', '--format=%s', '-n', '1', hash];

  execFile('git', args, { cwd }, (err, stdout) => {
    if (err || !stdout) {
      cb(null);
      return;
    }

    const commitMessage = stdout.trim();

    const prPatterns = [
      { pattern: /^Merge pull request #(\d+) from .+/, numberIndex: 1 },
      { pattern: /^Merged in .+ \(pull request #(\d+)\)/, numberIndex: 1 },
      { pattern: /^(.+) \(#(\d+)\)$/, titleIndex: 1, numberIndex: 2 },
      { pattern: /^(.+) \(!(\d+)\)$/, titleIndex: 1, numberIndex: 2 },
      { pattern: /.*#(\d+).*/, numberIndex: 1 },
      { pattern: /.*PR\s*#?(\d+).*/, numberIndex: 1 },
      { pattern: /.*pull\s*request\s*#?(\d+).*/i, numberIndex: 1 },
    ];

    for (const { pattern, titleIndex, numberIndex } of prPatterns) {
      const match = commitMessage.match(pattern);
      if (match) {
        const prNumber = match[numberIndex];

        if (titleIndex && match[titleIndex]) {
          const prTitle = match[titleIndex];
          if (
            prTitle &&
            prTitle !== 'Merge pull request' &&
            prTitle !== 'Merged in'
          ) {
            cb({ title: prTitle, number: prNumber });
            return;
          }
        }

        if (prNumber) {
          getPRTitleFromCommit(cwd, hash, prTitle => {
            cb({
              title: prTitle || commitMessage,
              number: prNumber,
            });
          });
          return;
        }
      }
    }

    cb(null);
  });
}

function getPRTitleFromCommit(cwd, hash, cb) {
  const args = [
    'log',
    '--format=%s',
    '--merges',
    '--ancestry-path',
    `${hash}^..${hash}`,
  ];

  execFile('git', args, { cwd }, (err, stdout) => {
    if (err || !stdout) {
      cb(null);
      return;
    }

    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const prMatch = line.match(/^(.+?) \(#\d+\)$/);
      if (prMatch) {
        cb(prMatch[1]);
        return;
      }
    }

    cb(null);
  });
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const y = Math.floor(d / 365);
  if (y > 0) return y === 1 ? '1 year ago' : `${y} years ago`;
  if (d > 0) return d === 1 ? '1 day ago' : `${d} days ago`;
  if (h > 0) return h === 1 ? '1 hour ago' : `${h} hours ago`;
  if (m > 0) return m === 1 ? '1 min ago' : `${m} mins ago`;
  return 'just now';
}

function trimSummary(s) {
  const max = vscode.workspace
    .getConfiguration('inlineBlameMini')
    .get('maxSummary', 150);
  if (s.length <= max) return s;
  return s.substring(0, max - 1) + '…';
}

function debounce(fn, ms) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

function deactivate() {
  const editor = vscode.window.activeTextEditor;
  if (editor && decorationType) {
    editor.setDecorations(decorationType, []);
  }

  if (disposables && disposables.length) {
    disposables.forEach(disposable => {
      if (disposable && typeof disposable.dispose === 'function') {
        disposable.dispose();
      }
    });
    disposables = [];
  }

  if (statusBar) {
    statusBar.dispose();
    statusBar = null;
  }

  if (decorationType) {
    decorationType.dispose();
    decorationType = null;
  }
}

module.exports = { activate, deactivate };
