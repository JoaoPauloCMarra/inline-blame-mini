const vscode = require('vscode');
const { debounce } = require('./utils');
const { refresh } = require('./core');
const { clearDecorations, setDisposables } = require('./ui');

const DEBOUNCE_DELAY = 150;

function hookEvents() {
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
      clearDecorations(editor);
      debounce(() => refresh(), 100)();
    }
  });

  const disposables = [onEditor, onSelection, onSave, onDocumentChange];
  setDisposables(disposables);

  return disposables;
}

module.exports = {
  hookEvents,
};
