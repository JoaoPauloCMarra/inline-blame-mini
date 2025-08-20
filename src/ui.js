const vscode = require('vscode');

let decorationType;
let statusBar;
let disposables = [];
let gitAvailable = true;

const BLAME_COLOR = 'rgba(136, 136, 136, 0.7)';
const BLAME_MARGIN = '0 0 0 1rem';
const BLAME_FONT_STYLE = 'italic';
const BLAME_FONT_SIZE = '0.9em';

function createDecorationType() {
  if (decorationType) {
    decorationType.dispose();
  }
  decorationType = vscode.window.createTextEditorDecorationType({});
  return decorationType;
}

function createStatusBar() {
  statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBar.show();
  return statusBar;
}

function addDecoration(editor, currentLine, inlineText) {
  const lineIndex = currentLine - 1;

  if (lineIndex < 0 || lineIndex >= editor.document.lineCount) {
    return;
  }

  const line = editor.document.lineAt(lineIndex);
  const endPosition = new vscode.Position(lineIndex, line.text.length);

  const decoration = {
    range: new vscode.Range(endPosition, endPosition),
    renderOptions: {
      after: {
        contentText: inlineText,
        color: BLAME_COLOR,
        margin: BLAME_MARGIN,
        fontStyle: BLAME_FONT_STYLE,
        fontSize: BLAME_FONT_SIZE,
      },
    },
  };

  editor.setDecorations(decorationType, [decoration]);
}

function setGitAvailability(available) {
  gitAvailable = available;
  if (!available) {
    vscode.window.showInformationMessage(
      'Git not found in PATH. Inline Blame Mini will be disabled.',
      { modal: false }
    );
  }
}

function setStatusBar(text, tooltip) {
  if (statusBar) {
    statusBar.text = text;
    statusBar.tooltip = tooltip;
  }
}

function clearDecorations(editor) {
  if (editor && decorationType) {
    editor.setDecorations(decorationType, []);
  }
}

function getDisposables() {
  return disposables;
}

function setDisposables(newDisposables) {
  disposables = newDisposables;
}

function getGitAvailability() {
  return gitAvailable;
}

function cleanup() {
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

module.exports = {
  createDecorationType,
  createStatusBar,
  addDecoration,
  setGitAvailability,
  setStatusBar,
  clearDecorations,
  getDisposables,
  setDisposables,
  getGitAvailability,
  cleanup,
};
