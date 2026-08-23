const { beforeEach, expect, mock, test } = require('bun:test');

const editor = {
  document: {},
  selection: { active: { line: 1 } },
};
const listeners = {};
const clearCaches = mock();
const clearConfigCache = mock();
const refresh = mock();
const disposable = { dispose() {} };

mock.module('vscode', () => ({
  window: {
    activeTextEditor: editor,
    onDidChangeActiveTextEditor(listener) {
      listeners.editor = listener;
      return disposable;
    },
    onDidChangeTextEditorSelection(listener) {
      listeners.selection = listener;
      return disposable;
    },
  },
  workspace: {
    onDidChangeConfiguration(listener) {
      listeners.configuration = listener;
      return disposable;
    },
    onDidChangeTextDocument(listener) {
      listeners.change = listener;
      return disposable;
    },
    onDidChangeWorkspaceFolders(listener) {
      listeners.workspace = listener;
      return disposable;
    },
    onDidCloseTextDocument(listener) {
      listeners.close = listener;
      return disposable;
    },
    onDidSaveTextDocument(listener) {
      listeners.save = listener;
      return disposable;
    },
  },
}));

mock.module('../src/core', () => ({
  clearCaches,
  refresh,
}));

mock.module('../src/config', () => ({
  clearCache: clearConfigCache,
}));

mock.module('../src/ui', () => ({
  clearDecorations() {},
  setFileStatusBar() {},
}));

const { hookEvents } = require('../src/events');

beforeEach(() => {
  clearCaches.mockClear();
  clearConfigCache.mockClear();
  refresh.mockClear();
});

test('selection changes refresh after one debounce interval', async () => {
  hookEvents();

  listeners.selection({
    textEditor: editor,
  });
  await new Promise(resolve => setTimeout(resolve, 100));

  expect(refresh).toHaveBeenCalledTimes(1);
});

test('configuration changes invalidate the settings snapshot', () => {
  hookEvents();

  listeners.configuration({
    affectsConfiguration: () => true,
  });

  expect(clearConfigCache).toHaveBeenCalledTimes(1);
});

test('saving the active document invalidates cached Git metadata', async () => {
  hookEvents();

  listeners.save(editor.document);
  await new Promise(resolve => setTimeout(resolve, 50));

  expect(clearCaches).toHaveBeenCalledTimes(1);
});
