const vscode = require('vscode');
const {
  relativeTime,
  trimSummary,
  validateLinePosition,
  findGitRoot,
  LRUCache,
  setGitRootCacheLimit,
} = require('./utils');
const {
  blameLine,
  getFileLastCommit,
  updateCacheSettings: updateGitCaches,
} = require('./git');
const {
  setStatusBar,
  addDecoration,
  clearDecorations,
  getGitAvailability,
  setFileStatusBar,
} = require('./ui');
const config = require('./config');
const {
  CACHE_ENABLED,
  CACHE_MAX_SIZE,
  IGNORE_EMPTY_LINES,
} = require('./constants');

const blameCache = new LRUCache(CACHE_MAX_SIZE);
const repoCache = new LRUCache(CACHE_MAX_SIZE);
let lastProcessedFile = null;
let lastProcessedLine = null;
let lastEditor = null;
let lastStatusBarFile = null;

function clearStatusBar() {
  setFileStatusBar('', '');
}

function getGitRoot(file) {
  let gitRoot = repoCache.get(file);
  if (gitRoot === undefined) {
    gitRoot = findGitRoot(file);
    if (CACHE_ENABLED) repoCache.set(file, gitRoot);
  }
  return gitRoot;
}

function shouldSkipProcessing(editor, file, currentLine) {
  return (
    config.shouldShowOnlyWhenChanged() &&
    lastEditor === editor &&
    lastProcessedFile === file &&
    lastProcessedLine === currentLine
  );
}

function handleCachedBlame(cachedBlame, editor, currentLine, updateStatusBar) {
  if (cachedBlame.error) {
    if (updateStatusBar) handleBlameError(cachedBlame.error, editor);
  } else if (cachedBlame.data) {
    if (cachedBlame.data.isUncommitted) {
      const inlineText = ` ${cachedBlame.data.summary}`;
      addDecoration(editor, currentLine, inlineText);
    } else {
      displayBlameInfo(editor, currentLine, cachedBlame.data);
    }
  } else if (updateStatusBar) {
    handleNoBlameData(editor);
  }
}

function handleBlameResult(
  blameData,
  error,
  editor,
  currentLine,
  updateStatusBar
) {
  if (error) {
    if (updateStatusBar) handleBlameError(error, editor);
    return;
  }

  if (!blameData) {
    if (updateStatusBar) handleNoBlameData(editor);
    return;
  }

  if (blameData.isUncommitted) {
    const inlineText = ` ${blameData.summary}`;
    addDecoration(editor, currentLine, inlineText);
    return;
  }

  displayBlameInfo(editor, currentLine, blameData);
}

function refresh() {
  const editor = vscode.window.activeTextEditor;
  if (
    !editor ||
    !getGitAvailability() ||
    !config.isEnabled() ||
    editor.document.isUntitled
  ) {
    lastStatusBarFile = null;
    clearStatusBar();
    return;
  }

  clearDecorations(editor);
  const file = editor.document.fileName;
  const currentLine = editor.selection.active.line + 1;
  processLine(editor, file, currentLine, true);
}

function processLine(editor, file, currentLine, updateStatusBar = false) {
  if (updateStatusBar) {
    if (lastStatusBarFile !== file) {
      lastStatusBarFile = file;
      updateFileStatusBar(file);
    }
  }

  if (!config.shouldProcessFile(file)) {
    if (updateStatusBar) clearStatusBar();
    return;
  }

  if (shouldSkipProcessing(editor, file, currentLine)) return;

  lastEditor = editor;
  lastProcessedFile = file;
  lastProcessedLine = currentLine;

  if (!validateLinePosition(editor, currentLine).valid) return;

  const lineIndex = currentLine - 1;
  const line = editor.document.lineAt(lineIndex);
  if (IGNORE_EMPTY_LINES && line.text.trim() === '') return;

  if (!getGitRoot(file)) return;

  const cacheKey = `${file}:${currentLine}:${editor.document.version}`;
  const cachedBlame = CACHE_ENABLED ? blameCache.get(cacheKey) : undefined;

  if (cachedBlame) {
    handleCachedBlame(cachedBlame, editor, currentLine, updateStatusBar);
    return;
  }

  blameLine(file, currentLine, (blameData, error) => {
    if (CACHE_ENABLED) blameCache.set(cacheKey, { data: blameData, error });
    handleBlameResult(blameData, error, editor, currentLine, updateStatusBar);
  });
}

function updateFileStatusBar(file) {
  const statusBarConfig = config.getStatusBarConfig();
  if (!statusBarConfig.enabled) {
    clearStatusBar();
    return;
  }

  getFileLastCommit(file, (fileData, error) => {
    const currentEditor = vscode.window.activeTextEditor;
    if (!currentEditor || currentEditor.document.fileName !== file) {
      return;
    }

    if (error || !fileData) {
      clearStatusBar();
      return;
    }

    const rel = relativeTime(fileData.time * 1000);
    const statusText = `${fileData.author} (${rel})`;
    setFileStatusBar(statusText, `Last modified by ${fileData.author}`);
  });
}

function handleBlameError(error, editor) {
  const isDirty = editor.document.isDirty;
  const dirtyWarning = isDirty ? '\n\nNote: File has unsaved changes' : '';

  switch (error.type) {
    case 'NOT_GIT_REPO': {
      clearStatusBar();
      return;
    }
    case 'FILE_NOT_TRACKED': {
      clearStatusBar();
      return;
    }
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

function handleNoBlameData(_editor) {
  clearStatusBar();
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
  const limit = CACHE_MAX_SIZE;
  blameCache.setLimit(limit);
  repoCache.setLimit(limit);
  setGitRootCacheLimit(limit);
  updateGitCaches();
  if (!CACHE_ENABLED) clearCaches();
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
