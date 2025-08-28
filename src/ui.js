const vscode = require('vscode');
const config = require('./config');

let decorationType;
let statusBar;
let disposables = [];
let gitAvailable = true;
let isProcessing = false;

const STATUS_STATES = {
  DISABLED: { icon: '$(eye-closed)', priority: 1 },
  ERROR: { icon: '$(error)', priority: 2 },
  WARNING: { icon: '$(warning)', priority: 3 },
  PROCESSING: { icon: '$(sync~spin)', priority: 4 },
  INFO: { icon: '$(info)', priority: 5 },
  SUCCESS: { icon: '$(check)', priority: 6 },
  EDIT: { icon: '$(edit)', priority: 7 },
  NEW_FILE: { icon: '$(new-file)', priority: 8 },
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

function addDecoration(editor, currentLine, inlineText) {
  const lineIndex = currentLine - 1;

  if (lineIndex < 0 || lineIndex >= editor.document.lineCount) {
    return;
  }

  const line = editor.document.lineAt(lineIndex);
  const endPosition = new vscode.Position(lineIndex, line.text.length);

  const styleConfig = config.getStyleConfig();
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

let statusBarBackup = null;

function setProcessingState(isProcessingNow) {
  isProcessing = isProcessingNow;
  if (isProcessing) {
    statusBarBackup = {
      text: statusBar ? statusBar.text || '' : '',
      tooltip: statusBar ? statusBar.tooltip || '' : '',
    };
    setStatusBar(
      'Loading blame info...',
      'Getting git blame information for current line',
      'PROCESSING'
    );
  } else if (statusBarBackup) {
    if (statusBarBackup.text) {
      statusBar.text = statusBarBackup.text;
      statusBar.tooltip = statusBarBackup.tooltip;
      statusBar.command = undefined;
    } else {
      setStatusBar('', '', 'INFO');
    }
    statusBarBackup = null;
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
  setFileStatusBar,
  setProcessingState,
  clearDecorations,
  getGitAvailability,
  showErrorMessage,
  showWarningMessage,
  showInfoMessage,
  cleanup,
};
