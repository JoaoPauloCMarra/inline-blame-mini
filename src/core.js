const vscode = require('vscode');
const {
  relativeTime,
  trimSummary,
  isValidLinePosition,
  findGitRoot,
  LRUCache,
} = require('./utils');
const { blameRange, getFileLastCommit } = require('./git');
const {
  setStatusBar,
  addDecoration,
  clearDecorations,
  getGitAvailability,
  setFileStatusBar,
} = require('./ui');
const config = require('./config');
const {
  CACHE_MAX_SIZE,
  IGNORE_EMPTY_LINES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_LINES,
  PREFETCH_LINE_RADIUS,
} = require('./constants');

const blameCache = new LRUCache(CACHE_MAX_SIZE);
const inFlightBlames = new Map();
const fileSizeCache = new WeakMap();
let cacheGeneration = 0;
let lastStatusBarFile = null;

function clearStatusBar() {
  setFileStatusBar('', '');
}

function isCurrentEditorRequest(editor, file, currentLine, documentVersion) {
  const activeEditor = vscode.window.activeTextEditor;
  return (
    activeEditor === editor &&
    editor.document.fileName === file &&
    editor.document.version === documentVersion &&
    editor.selection.active.line + 1 === currentLine
  );
}

function getBlameCacheKey(file, line, documentVersion) {
  return `${file}:${line}:${documentVersion}`;
}

function requestBlameRange(file, startLine, endLine, documentVersion) {
  const currentKey = getBlameCacheKey(file, startLine, documentVersion);
  const pendingRequest = inFlightBlames.get(currentKey);
  if (pendingRequest) {
    return pendingRequest.then(() => blameCache.get(currentKey));
  }

  const cacheKeys = [];
  for (let line = startLine; line <= endLine; line++) {
    cacheKeys.push(getBlameCacheKey(file, line, documentVersion));
  }

  const requestGeneration = cacheGeneration;
  const request = blameRange(file, startLine, endLine)
    .then(blames => {
      if (requestGeneration !== cacheGeneration) {
        return;
      }

      for (let line = startLine; line <= endLine; line++) {
        const cacheKey = getBlameCacheKey(file, line, documentVersion);
        blameCache.set(cacheKey, {
          data: blames.get(line) || null,
          error: null,
        });
      }
    })
    .catch(error => {
      if (requestGeneration !== cacheGeneration) {
        return;
      }

      for (const cacheKey of cacheKeys) {
        blameCache.set(cacheKey, { data: null, error });
      }
    })
    .finally(() => {
      for (const cacheKey of cacheKeys) {
        if (inFlightBlames.get(cacheKey) === request) {
          inFlightBlames.delete(cacheKey);
        }
      }
    });

  for (const cacheKey of cacheKeys) {
    inFlightBlames.set(cacheKey, request);
  }

  return request.then(() => blameCache.get(currentKey));
}

async function isFileTooLarge(editor) {
  if (editor.document.lineCount > MAX_FILE_LINES) {
    return true;
  }

  const cached = fileSizeCache.get(editor.document);
  if (cached && cached.version === editor.document.version) {
    return cached.result;
  }

  try {
    const stats = await vscode.workspace.fs.stat(
      vscode.Uri.file(editor.document.fileName)
    );
    const result = stats.size > MAX_FILE_SIZE_BYTES;
    fileSizeCache.set(editor.document, {
      version: editor.document.version,
      result,
    });
    return result;
  } catch (error) {
    return false;
  }
}

function handleBlameResult(result, editor, currentLine, updateStatusBar) {
  const { data: blameData, error } = result || {};
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

async function refresh() {
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
  await processLine(editor, file, currentLine, true);
}

async function processLine(editor, file, currentLine, updateStatusBar = false) {
  if (!config.shouldProcessFile(file)) {
    if (updateStatusBar) {
      lastStatusBarFile = null;
      clearStatusBar();
    }
    return;
  }

  if (!isValidLinePosition(editor, currentLine)) return;

  if (await isFileTooLarge(editor)) {
    if (updateStatusBar) {
      setStatusBar(
        'File too large',
        'Inline blame is disabled for large files to maintain performance',
        'INFO'
      );
    }
    return;
  }

  if (updateStatusBar && lastStatusBarFile !== file) {
    lastStatusBarFile = file;
    updateFileStatusBar(file);
  }

  const lineIndex = currentLine - 1;
  const line = editor.document.lineAt(lineIndex);
  if (IGNORE_EMPTY_LINES && line.text.trim() === '') return;

  if (!findGitRoot(file)) return;

  const documentVersion = editor.document.version;
  const cacheKey = getBlameCacheKey(file, currentLine, documentVersion);
  const cachedBlame = blameCache.get(cacheKey);

  if (cachedBlame) {
    handleBlameResult(cachedBlame, editor, currentLine, updateStatusBar);
    return;
  }

  const endLine = Math.min(
    currentLine + PREFETCH_LINE_RADIUS,
    editor.document.lineCount
  );
  const result = await requestBlameRange(
    file,
    currentLine,
    endLine,
    documentVersion
  );

  if (!isCurrentEditorRequest(editor, file, currentLine, documentVersion)) {
    return;
  }

  handleBlameResult(result, editor, currentLine, updateStatusBar);
}

async function updateFileStatusBar(file) {
  const statusBarConfig = config.getStatusBarConfig();
  if (!statusBarConfig.enabled) {
    clearStatusBar();
    return;
  }

  try {
    const fileData = await getFileLastCommit(file);
    const currentEditor = vscode.window.activeTextEditor;
    if (!currentEditor || currentEditor.document.fileName !== file) {
      return;
    }

    const rel = relativeTime(fileData.time * 1000);
    const statusText = `${fileData.author} (${rel})`;
    setFileStatusBar(statusText, `Last modified by ${fileData.author}`);
  } catch (error) {
    clearStatusBar();
  }
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
  };

  const inlineText = ` ${config.formatBlameText(formatData)}`;

  addDecoration(editor, currentLine, inlineText);
}

function clearCaches() {
  cacheGeneration += 1;
  blameCache.clear();
  inFlightBlames.clear();
  lastStatusBarFile = null;
}

async function toggleEnabled() {
  const currentState = config.isEnabled();
  const nextState = !currentState;

  await config.update('enabled', nextState);

  if (!currentState) {
    await refresh();
  } else {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      clearDecorations(editor);
    }
  }
  return nextState;
}

module.exports = {
  refresh,
  clearCaches,
  toggleEnabled,
};
