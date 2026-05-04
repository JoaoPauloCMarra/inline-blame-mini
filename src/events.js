const vscode = require('vscode');
const { debounce } = require('./utils');
const { refresh, clearCaches, updateCacheSettings } = require('./core');
const { clearDecorations, setFileStatusBar } = require('./ui');
const {
  DEBOUNCE_DELAY,
  SAVE_DEBOUNCE_DELAY,
  CHANGE_DEBOUNCE_DELAY,
} = require('./constants');

let lastActiveEditor = null;
let lastLine = -1;

function hookEvents() {
  const refreshIfActiveDocument = document => {
    const currentEditor = vscode.window.activeTextEditor;
    if (currentEditor && currentEditor.document === document) {
      refresh();
    }
  };

  const refreshAfterSelectionChange = debounce(
    refreshIfActiveDocument,
    DEBOUNCE_DELAY
  );
  const refreshAfterDocumentChange = debounce(
    refreshIfActiveDocument,
    CHANGE_DEBOUNCE_DELAY
  );

  const onEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
    lastActiveEditor = editor;
    lastLine = editor ? editor.selection.active.line : -1;
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
        refreshAfterSelectionChange(event.textEditor.document);
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
          refreshAfterDocumentChange(event.document);
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
      updateCacheSettings();
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

  return disposables;
}

module.exports = {
  hookEvents,
};
