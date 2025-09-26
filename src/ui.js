const vscode = require('vscode');
const config = require('./config');
const { STATUS_STATES } = require('./constants');

let decorationType;
let statusBar;
let disposables = [];
let gitAvailable = true;

let codeLensEmitter = null;
let codeLensRegistration = null;
let currentLensState = {
  uri: null,
  line: -1,
  text: '',
  position: 'end-of-line',
};

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

function ensureCodeLensProvider() {
  if (codeLensRegistration) return codeLensRegistration;

  codeLensEmitter = new vscode.EventEmitter();

  const provider = {
    onDidChangeCodeLenses: codeLensEmitter.event,
    provideCodeLenses(document) {
      if (
        !currentLensState.uri ||
        document.uri.toString() !== currentLensState.uri ||
        !currentLensState.text ||
        currentLensState.position === 'end-of-line'
      ) {
        return [];
      }
      const lineIndex = Math.max(
        0,
        currentLensState.position === 'below-line'
          ? currentLensState.line
          : currentLensState.line - 1
      );
      const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
      return [
        new vscode.CodeLens(range, {
          title: currentLensState.text.trim(),
          command: '',
          tooltip: 'Inline Blame',
        }),
      ];
    },
  };

  codeLensRegistration = vscode.languages.registerCodeLensProvider(
    { scheme: 'file' },
    provider
  );

  return codeLensRegistration;
}

function addDecoration(editor, currentLine, inlineText) {
  const lineIndex = currentLine - 1;

  if (lineIndex < 0 || lineIndex >= editor.document.lineCount) {
    return;
  }

  const styleConfig = config.getStyleConfig();

  if (styleConfig.position === 'end-of-line') {
    const line = editor.document.lineAt(lineIndex);
    const endPosition = new vscode.Position(lineIndex, line.text.length);

    const decoration = {
      range: new vscode.Range(endPosition, endPosition),
      renderOptions: {
        after: {
          contentText: inlineText,
          color: styleConfig.color,
          margin: styleConfig.margin,
          fontStyle: styleConfig.fontStyle,
          fontSize: styleConfig.fontSize,
        },
      },
    };

    editor.setDecorations(decorationType, [decoration]);
  } else {
    ensureCodeLensProvider();
    currentLensState = {
      uri: editor.document.uri.toString(),
      line: lineIndex + 1,
      text: inlineText,
      position: styleConfig.position,
    };
    codeLensEmitter && codeLensEmitter.fire();
    editor.setDecorations(decorationType, []);
  }
}

function setGitAvailability(available) {
  gitAvailable = available;
}

function setStatusBar(text, tooltip, state = 'INFO') {
  if (statusBar) {
    const stateConfig = STATUS_STATES[state] || STATUS_STATES.INFO;
    statusBar.text = `${stateConfig.icon} ${text}`;
    statusBar.tooltip = tooltip;

    if (state === 'ERROR' || state === 'WARNING') {
      statusBar.command = 'inline-blame-mini.showHelp';
    } else if (state === 'SUCCESS') {
      statusBar.command = 'inline-blame-mini.toggle';
    } else {
      statusBar.command = undefined;
    }
  }
}

function setFileStatusBar(text, tooltip) {
  if (statusBar) {
    statusBar.text = text;
    statusBar.tooltip = tooltip;
    statusBar.command = undefined;
  }
}

function showMessage(type, title, message, actions = [], callback = null) {
  const options = { modal: false, detail: message };
  const method =
    type === 'error'
      ? 'showErrorMessage'
      : type === 'warning'
        ? 'showWarningMessage'
        : 'showInformationMessage';

  if (actions.length > 0) {
    vscode.window[method](title, options, ...actions).then(selection => {
      if (callback) callback(selection);
    });
  } else {
    vscode.window[method](title, options);
  }
}

function showErrorMessage(title, message, actions = [], callback = null) {
  showMessage('error', title, message, actions, callback);
}

function showWarningMessage(title, message, actions = [], callback = null) {
  showMessage('warning', title, message, actions, callback);
}

function showInfoMessage(title, message, actions = [], callback = null) {
  showMessage('info', title, message, actions, callback);
}

function clearDecorations(editor) {
  if (editor && decorationType) {
    editor.setDecorations(decorationType, []);
  }
  clearCodeLens();
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

  if (codeLensRegistration) {
    codeLensRegistration.dispose();
    codeLensRegistration = null;
  }
}

function clearCodeLens() {
  if (currentLensState.text) {
    currentLensState.text = '';
    codeLensEmitter && codeLensEmitter.fire();
  }
}

module.exports = {
  createDecorationType,
  createStatusBar,
  addDecoration,
  setGitAvailability,
  setStatusBar,
  setFileStatusBar,
  clearDecorations,
  getGitAvailability,
  showErrorMessage,
  showWarningMessage,
  showInfoMessage,
  cleanup,
  ensureCodeLensProvider,
};
