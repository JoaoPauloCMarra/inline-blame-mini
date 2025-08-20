const { checkGitAvailability } = require('./git');
const {
  createDecorationType,
  createStatusBar,
  setGitAvailability,
  cleanup,
} = require('./ui');
const { hookEvents } = require('./events');
const { refresh } = require('./core');

function activate(context) {
  checkGitAvailability(available => {
    setGitAvailability(available);
  });

  const decorationType = createDecorationType();
  const statusBar = createStatusBar();
  const disposables = hookEvents();

  context.subscriptions.push(decorationType, statusBar, ...disposables);

  refresh();
}

function deactivate() {
  cleanup();
}

module.exports = { activate, deactivate };
