class AntigravityPlatform {
  get name() {
    return 'antigravity';
  }

  get workspace() {
    throw new Error('Antigravity workspace API not yet implemented');
  }

  get window() {
    throw new Error('Antigravity window API not yet implemented');
  }

  get commands() {
    throw new Error('Antigravity commands API not yet implemented');
  }

  get languages() {
    throw new Error('Antigravity languages API not yet implemented');
  }

  get Uri() {
    throw new Error('Antigravity Uri not yet implemented');
  }

  get Range() {
    throw new Error('Antigravity Range not yet implemented');
  }

  get Position() {
    throw new Error('Antigravity Position not yet implemented');
  }

  get StatusBarAlignment() {
    return { Left: 1, Right: 2 };
  }

  get ViewColumn() {
    return { One: 1, Two: 2, Three: 3 };
  }

  get ConfigurationTarget() {
    return { Global: 1, Workspace: 2, WorkspaceFolder: 3 };
  }

  get EventEmitter() {
    throw new Error('Antigravity EventEmitter not yet implemented');
  }

  get CodeLens() {
    throw new Error('Antigravity CodeLens not yet implemented');
  }

  createTextEditorDecorationType(_options) {
    throw new Error('Antigravity decoration API not yet implemented');
  }

  createStatusBarItem(_alignment, _priority) {
    throw new Error('Antigravity status bar API not yet implemented');
  }

  createWebviewPanel(_viewType, _title, _showOptions, _options) {
    throw new Error('Antigravity webview API not yet implemented');
  }

  registerCommand(_command, _callback) {
    throw new Error('Antigravity command registration not yet implemented');
  }

  registerCodeLensProvider(_selector, _provider) {
    throw new Error('Antigravity CodeLens provider not yet implemented');
  }

  getConfiguration(_section) {
    throw new Error('Antigravity configuration API not yet implemented');
  }

  getWorkspaceFolder(_uri) {
    throw new Error('Antigravity workspace folder API not yet implemented');
  }

  onDidChangeActiveTextEditor(_listener) {
    throw new Error('Antigravity event listener not yet implemented');
  }

  onDidChangeTextEditorSelection(_listener) {
    throw new Error('Antigravity event listener not yet implemented');
  }

  onDidSaveTextDocument(_listener) {
    throw new Error('Antigravity event listener not yet implemented');
  }

  onDidChangeTextDocument(_listener) {
    throw new Error('Antigravity event listener not yet implemented');
  }

  onDidChangeWorkspaceFolders(_listener) {
    throw new Error('Antigravity event listener not yet implemented');
  }

  onDidChangeConfiguration(_listener) {
    throw new Error('Antigravity event listener not yet implemented');
  }

  onDidCloseTextDocument(_listener) {
    throw new Error('Antigravity event listener not yet implemented');
  }

  showInformationMessage(message, ..._items) {
    console.log('[INFO]', message);
    return Promise.resolve(undefined);
  }

  showWarningMessage(message, ..._items) {
    console.warn('[WARNING]', message);
    return Promise.resolve(undefined);
  }

  showErrorMessage(message, ..._items) {
    console.error('[ERROR]', message);
    return Promise.resolve(undefined);
  }

  executeCommand(_command, ..._args) {
    throw new Error('Antigravity command execution not yet implemented');
  }

  get activeTextEditor() {
    throw new Error('Antigravity active editor API not yet implemented');
  }
}

module.exports = new AntigravityPlatform();
