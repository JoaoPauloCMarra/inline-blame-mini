const vscode = require('vscode');
const { relativeTime, trimSummary } = require('./utils');
const { blameLine } = require('./git');
const {
  setStatusBar,
  addDecoration,
  clearDecorations,
  getGitAvailability,
} = require('./ui');

const MAX_SUMMARY_LENGTH = 60;
const enabled = true;

function refresh() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  clearDecorations(editor);

  if (!getGitAvailability()) {
    setStatusBar(
      '$(error) Git not available',
      'Git command not found in PATH. Please install Git.'
    );
    return;
  }

  if (!enabled) {
    setStatusBar(
      '$(eye-closed) Inline Blame: Disabled',
      'Inline blame is disabled'
    );
    return;
  }

  if (editor.document.isUntitled) {
    setStatusBar(
      '$(new-file) Untitled file',
      'Save the file first to see git blame information'
    );
    return;
  }

  const file = editor.document.fileName;
  const currentLine = editor.selection.active.line + 1;
  const lineIndex = currentLine - 1;
  const line = editor.document.lineAt(lineIndex);

  if (line.text.trim() === '') {
    setStatusBar(
      '$(info) Empty line',
      'No git blame information for empty lines'
    );
    return;
  }

  blameLine(file, currentLine, blameData => {
    if (!blameData) {
      const isDirty = editor.document.isDirty;
      const dirtyIndicator = isDirty ? ' $(save) Unsaved changes' : '';
      setStatusBar(
        `$(warning) No git blame${dirtyIndicator}`,
        'Not a git repository or no blame data available for this line' +
          (isDirty ? '\nFile has unsaved changes' : '')
      );
      return;
    }

    if (blameData.isUncommitted) {
      const inlineText = ` ${blameData.summary}`;
      addDecoration(editor, currentLine, inlineText);
      setStatusBar(`$(edit) ${blameData.summary}`, 'Uncommitted changes');
      return;
    }

    const summary = trimSummary(blameData.summary, MAX_SUMMARY_LENGTH);
    const rel = relativeTime(blameData.time * 1000);
    let inlineText = ` ${blameData.author}, ${rel}`;

    if (blameData.prNumber) {
      inlineText += ` via PR #${blameData.prNumber}`;
    }

    inlineText += ` • ${summary}`;

    addDecoration(editor, currentLine, inlineText);

    const isDirty = editor.document.isDirty;
    setStatusBar(
      `${blameData.author} (${rel})`,
      `${blameData.hash} - ${summary}${isDirty ? '\nFile has unsaved changes' : ''}`
    );
  });
}

module.exports = {
  refresh,
};
