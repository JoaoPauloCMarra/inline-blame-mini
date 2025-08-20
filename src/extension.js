const vscode = require('vscode');
const { relativeTime, trimSummary, debounce } = require('./utils');
const { blameLine, checkGitAvailability } = require('./git');

const DEBOUNCE_DELAY = 150;
const MAX_SUMMARY_LENGTH = 60;
const BLAME_COLOR = 'rgba(136, 136, 136, 0.7)';
const BLAME_MARGIN = '0 0 0 1rem';
const BLAME_FONT_STYLE = 'italic';
const BLAME_FONT_SIZE = '0.9em';

let decorationType;
let statusBar;
const enabled = true;
let disposables = [];
let gitAvailable = true;

function activate(context) {
  checkGitAvailability(available => {
    gitAvailable = available;
    if (!available) {
      vscode.window.showInformationMessage(
        'Git not found in PATH. Inline Blame Mini will be disabled.',
        { modal: false }
      );
    }
  });
  createDecorationType();
  createStatusBar();
  hookEvents(context);
  refresh();
}

function createDecorationType() {
  if (decorationType) {
    decorationType.dispose();
  }
  decorationType = vscode.window.createTextEditorDecorationType({});
}

function createStatusBar() {
  statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBar.show();
}

function hookEvents(context) {
  const onEditor = vscode.window.onDidChangeActiveTextEditor(() => refresh());

  const onSelection = vscode.window.onDidChangeTextEditorSelection(
    debounce(event => {
      const currentLine = event.textEditor.selection.active.line;
      if (currentLine !== (hookEvents.lastLine || -1)) {
        hookEvents.lastLine = currentLine;
        refresh();
      }
    }, DEBOUNCE_DELAY)
  );

  const onSave = vscode.workspace.onDidSaveTextDocument(
    debounce(() => refresh(), 200)
  );

  const onDocumentChange = vscode.workspace.onDidChangeTextDocument(event => {
    const editor = vscode.window.activeTextEditor;
    if (editor && event.document === editor.document) {
      editor.setDecorations(decorationType, []);
      debounce(() => refresh(), 100)();
    }
  });

  disposables = [onEditor, onSelection, onSave, onDocumentChange];
  context.subscriptions.push(decorationType, statusBar, ...disposables);
}

function refresh() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  editor.setDecorations(decorationType, []);

  if (!gitAvailable) {
    statusBar.text = '$(error) Git not available';
    statusBar.tooltip = 'Git command not found in PATH. Please install Git.';
    return;
  }

  if (!enabled) {
    statusBar.text = '$(eye-closed) Inline Blame: Disabled';
    statusBar.tooltip = 'Inline blame is disabled';
    return;
  }

  if (editor.document.isUntitled) {
    statusBar.text = '$(new-file) Untitled file';
    statusBar.tooltip = 'Save the file first to see git blame information';
    return;
  }

  const file = editor.document.fileName;
  const currentLine = editor.selection.active.line + 1;
  const lineIndex = currentLine - 1;
  const line = editor.document.lineAt(lineIndex);

  if (line.text.trim() === '') {
    statusBar.text = '$(info) Empty line';
    statusBar.tooltip = 'No git blame information for empty lines';
    return;
  }

  blameLine(file, currentLine, blameData => {
    if (!blameData) {
      const isDirty = editor.document.isDirty;
      const dirtyIndicator = isDirty ? ' $(save) Unsaved changes' : '';
      statusBar.text = `$(warning) No git blame${dirtyIndicator}`;
      statusBar.tooltip =
        'Not a git repository or no blame data available for this line' +
        (isDirty ? '\nFile has unsaved changes' : '');
      return;
    }

    if (blameData.isUncommitted) {
      const inlineText = ` ${blameData.summary}`;
      addDecoration(editor, currentLine, inlineText);
      statusBar.text = `$(edit) ${blameData.summary}`;
      statusBar.tooltip = 'Uncommitted changes';
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
    statusBar.text = `${blameData.author} (${rel})`;
    statusBar.tooltip = `${blameData.hash} - ${summary}${isDirty ? '\nFile has unsaved changes' : ''}`;
  });
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
