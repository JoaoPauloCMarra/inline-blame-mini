const vscode = require('vscode');
const { debounce } = require('./utils');
const { refresh, clearCaches } = require('./core');
const { clearDecorations, setDisposables, setFileStatusBar } = require('./ui');

const DEBOUNCE_DELAY = 100;
const SAVE_DEBOUNCE_DELAY = 50;
const CHANGE_DEBOUNCE_DELAY = 300;

let lastActiveEditor = null;
let lastLine = -1;

function hookEvents() {
  const onEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
    lastActiveEditor = editor;
    if (editor) {
      refresh();
    } else {
      setFileStatusBar('', '');
    }
  });

  const onSelection = vscode.window.onDidChangeTextEditorSelection(
    debounce(event => {
      if (
        !event.textEditor ||
        event.textEditor !== vscode.window.activeTextEditor
      ) {
        return;
      }

      const currentLine = event.textEditor.selection.active.line;
      if (currentLine !== lastLine) {
        lastLine = currentLine;
        refresh();
      }
    }, DEBOUNCE_DELAY)
  );

  const onSave = vscode.workspace.onDidSaveTextDocument(
    debounce(document => {
      const editor = vscode.window.activeTextEditor;
      if (editor && document === editor.document) {
        refresh();
      }
    }, SAVE_DEBOUNCE_DELAY)
  );

  const onDocumentChange = vscode.workspace.onDidChangeTextDocument(event => {
    const editor = vscode.window.activeTextEditor;
    if (editor && event.document === editor.document) {
      clearDecorations(editor);

      if (event.contentChanges.length > 0) {
        const changeAffectsCurrentLine = event.contentChanges.some(change => {
          const currentLine = editor.selection.active.line;
          return (
            change.range.start.line <= currentLine &&
            change.range.end.line >= currentLine
          );
        });

        if (changeAffectsCurrentLine) {
          debounce(() => {
            const currentEditor = vscode.window.activeTextEditor;
            if (currentEditor && currentEditor.document === event.document) {
              refresh();
            }
          }, CHANGE_DEBOUNCE_DELAY)();
        }
      }
    }
  });

  const onWorkspaceChange = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    clearCaches();
    refresh();
  });

  const onConfigChange = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('inline-blame-mini')) {
      clearCaches();
      refresh();
    }
  });

  const onCloseDocument = vscode.workspace.onDidCloseTextDocument(document => {
    if (lastActiveEditor && lastActiveEditor.document === document) {
      lastActiveEditor = null;
      lastLine = -1;
    }
  });

  const disposables = [
    onEditor,
    onSelection,
    onSave,
    onDocumentChange,
    onWorkspaceChange,
    onConfigChange,
    onCloseDocument,
  ];

  setDisposables(disposables);

  return disposables;
}

module.exports = {
  hookEvents,
};
