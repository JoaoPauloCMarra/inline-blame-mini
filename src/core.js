const vscode = require('vscode');
const {
  relativeTime,
  trimSummary,
  validateLinePosition,
  findGitRoot,
} = require('./utils');
const { blameLine, getFileLastCommit } = require('./git');
const {
  setStatusBar,
  addDecoration,
  clearDecorations,
  getGitAvailability,
  showWarningMessage,
} = require('./ui');
const config = require('./config');

const blameCache = new Map();
const repoCache = new Map();
let lastProcessedFile = null;
let lastProcessedLine = null;
let lastEditor = null;
let lastStatusBarFile = null;

function refresh() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    lastStatusBarFile = null;
    const { setFileStatusBar } = require('./ui');
    setFileStatusBar('', '');
    return;
  }

  clearDecorations(editor);

  if (!getGitAvailability()) {
    setStatusBar(
      'Git not available',
      'Git command not found in PATH. Please install Git and restart VS Code.',
      'ERROR'
    );
    return;
  }

  if (!config.isEnabled()) {
    setStatusBar(
      'Inline Blame: Disabled',
      'Inline blame is disabled. Use the command palette to enable it.',
      'DISABLED'
    );
    return;
  }

  if (editor.document.isUntitled) {
    setStatusBar(
      'Untitled file',
      'Save the file first to see git blame information. Git blame only works with saved files.',
      'NEW_FILE'
    );
    return;
  }

  const file = editor.document.fileName;
  const currentLine = editor.selection.active.line + 1;

  if (lastStatusBarFile !== file) {
    lastStatusBarFile = file;
    updateFileStatusBar(file);
  }

  if (!config.shouldProcessFile(file)) {
    const { setFileStatusBar } = require('./ui');
    setFileStatusBar('', '');
    return;
  }

  if (
    config.shouldShowOnlyWhenChanged() &&
    lastEditor === editor &&
    lastProcessedFile === file &&
    lastProcessedLine === currentLine
  ) {
    return;
  }

  lastEditor = editor;
  lastProcessedFile = file;
  lastProcessedLine = currentLine;

  const validation = validateLinePosition(editor, currentLine);
  if (!validation.valid) {
    return;
  }

  const lineIndex = currentLine - 1;
  const line = editor.document.lineAt(lineIndex);

  if (config.shouldIgnoreEmptyLines() && line.text.trim() === '') {
    return;
  }

  let gitRoot = repoCache.get(file);
  if (gitRoot === undefined) {
    gitRoot = findGitRoot(file);
    repoCache.set(file, gitRoot);
  }

  if (!gitRoot) {
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(
    vscode.Uri.file(file)
  );
  if (!workspaceFolder) {
    return;
  }

  const cacheKey = `${file}:${currentLine}:${editor.document.version}`;
  const cachedBlame = blameCache.get(cacheKey);
  if (cachedBlame) {
    if (cachedBlame.error) {
      handleBlameError(cachedBlame.error, editor);
    } else if (cachedBlame.data) {
      if (cachedBlame.data.isUncommitted) {
        const inlineText = ` ${cachedBlame.data.summary}`;
        addDecoration(editor, currentLine, inlineText);
      } else {
        displayBlameInfo(editor, currentLine, cachedBlame.data);
      }
    } else {
      handleNoBlameData(editor);
    }
    return;
  }

  blameLine(file, currentLine, (blameData, error) => {
    blameCache.set(cacheKey, { data: blameData, error });

    if (blameCache.size > 100) {
      const firstKey = blameCache.keys().next().value;
      blameCache.delete(firstKey);
    }

    if (error) {
      handleBlameError(error, editor);
      return;
    }

    if (!blameData) {
      handleNoBlameData(editor);
      return;
    }

    if (blameData.isUncommitted) {
      const inlineText = ` ${blameData.summary}`;
      addDecoration(editor, currentLine, inlineText);
      return;
    }

    displayBlameInfo(editor, currentLine, blameData);
  });
}

function updateFileStatusBar(file) {
  const statusBarConfig = config.getStatusBarConfig();
  if (!statusBarConfig.enabled) {
    const { setFileStatusBar } = require('./ui');
    setFileStatusBar('', '');
    return;
  }

  getFileLastCommit(file, (fileData, error) => {
    const currentEditor = vscode.window.activeTextEditor;
    if (!currentEditor || currentEditor.document.fileName !== file) {
      return;
    }

    if (error || !fileData) {
      const { setFileStatusBar } = require('./ui');
      setFileStatusBar('', '');
      return;
    }

    const rel = relativeTime(fileData.time * 1000);
    const statusText = `${fileData.author} (${rel})`;
    const { setFileStatusBar } = require('./ui');
    setFileStatusBar(statusText, `Last modified by ${fileData.author}`);
  });
}

function handleBlameError(error, editor) {
  const isDirty = editor.document.isDirty;
  const dirtyWarning = isDirty ? '\n\nNote: File has unsaved changes' : '';

  switch (error.type) {
    case 'NOT_GIT_REPO':
      setStatusBar(
        'Not a git repository',
        `This file is not in a git repository. Initialize git in the workspace folder to see blame information.${dirtyWarning}`,
        'WARNING'
      );
      break;
    case 'FILE_NOT_TRACKED':
      setStatusBar(
        'File not tracked by git',
        `This file is not tracked by git. Add it to git to see blame information.${dirtyWarning}`,
        'WARNING'
      );
      showWarningMessage(
        'File not tracked by git',
        'This file needs to be added to git before blame information can be displayed.',
        ['Add to Git', 'Learn More'],
        selection => {
          if (selection === 'Add to Git') {
            vscode.commands.executeCommand(
              'git.stage',
              vscode.Uri.file(editor.document.fileName)
            );
          } else if (selection === 'Learn More') {
            vscode.env.openExternal(
              vscode.Uri.parse('https://git-scm.com/docs/git-add')
            );
          }
        }
      );
      break;
    case 'TIMEOUT':
      setStatusBar(
        'Git operation timed out',
        `Git blame operation took too long to complete. This may happen with very large files or repositories.${dirtyWarning}`,
        'WARNING'
      );
      break;
    case 'PERMISSION_DENIED':
      setStatusBar(
        'Permission denied',
        `Cannot access git repository. Check file permissions and git configuration.${dirtyWarning}`,
        'ERROR'
      );
      break;
    default:
      setStatusBar(
        'Git blame failed',
        `Failed to get git blame information: ${error.message || 'Unknown error'}${dirtyWarning}`,
        'ERROR'
      );
      break;
  }
}

function handleNoBlameData(editor) {
  const isDirty = editor.document.isDirty;
  const dirtyIndicator = isDirty ? ' Unsaved changes' : '';
  const dirtyTooltip = isDirty
    ? '\n\nFile has unsaved changes which may affect git blame results'
    : '';

  setStatusBar(
    `No git blame${dirtyIndicator}`,
    `No blame data available for this line. This may occur with:
• New files not yet committed
• Binary files
• Very recent changes
• Git repository issues${dirtyTooltip}`,
    'WARNING'
  );

  if (isDirty) {
    showWarningMessage(
      'Unsaved changes detected',
      'The file has unsaved changes which may affect git blame results. Save the file to see accurate blame information.',
      ['Save File', 'Continue Anyway'],
      selection => {
        if (selection === 'Save File') {
          vscode.commands.executeCommand('workbench.action.files.save');
        }
      }
    );
  }
}

function displayBlameInfo(editor, currentLine, blameData) {
  const summaryMaxLength = config.getSummaryMaxLength();
  const summary = trimSummary(blameData.summary, summaryMaxLength);
  const rel = relativeTime(blameData.time * 1000);

  const formatData = {
    author: blameData.author,
    timeAgo: rel,
    summary: summary,
    hash: blameData.hash,
    prNumber: blameData.prNumber || '',
  };

  const inlineText = ` ${config.formatBlameText(formatData)}`;
  addDecoration(editor, currentLine, inlineText);
}

function clearCaches() {
  blameCache.clear();
  repoCache.clear();
  lastProcessedFile = null;
  lastProcessedLine = null;
  lastEditor = null;
  lastStatusBarFile = null;
}

function updateCacheSettings() {
  const cacheConfig = config.getCacheConfig();
  if (!cacheConfig.enabled) {
    clearCaches();
  }
}

function toggleEnabled() {
  const currentState = config.isEnabled();
  config.update('enabled', !currentState);
  if (!currentState) {
    refresh();
  } else {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      clearDecorations(editor);
    }
  }
  return !currentState;
}

module.exports = {
  refresh,
  clearCaches,
  updateCacheSettings,
  toggleEnabled,
};
