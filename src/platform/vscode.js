const vscode = require('vscode');

class VSCodePlatform {
  get name() {
    return 'vscode';
  }

  get workspace() {
    return vscode.workspace;
  }

  get window() {
    return vscode.window;
  }

  get commands() {
    return vscode.commands;
  }

  get languages() {
    return vscode.languages;
  }

  get Uri() {
    return vscode.Uri;
  }

  get Range() {
    return vscode.Range;
  }

  get Position() {
    return vscode.Position;
  }

  get StatusBarAlignment() {
    return vscode.StatusBarAlignment;
  }

  get ViewColumn() {
    return vscode.ViewColumn;
  }

  get ConfigurationTarget() {
    return vscode.ConfigurationTarget;
  }

  get EventEmitter() {
    return vscode.EventEmitter;
  }

  get CodeLens() {
    return vscode.CodeLens;
  }

  createTextEditorDecorationType(options) {
    return vscode.window.createTextEditorDecorationType(options);
  }

  createStatusBarItem(alignment, priority) {
    return vscode.window.createStatusBarItem(alignment, priority);
  }

  createWebviewPanel(viewType, title, showOptions, options) {
    return vscode.window.createWebviewPanel(
      viewType,
      title,
      showOptions,
      options
    );
  }

  registerCommand(command, callback) {
    return vscode.commands.registerCommand(command, callback);
  }

  registerCodeLensProvider(selector, provider) {
    return vscode.languages.registerCodeLensProvider(selector, provider);
  }

  getConfiguration(section) {
    return vscode.workspace.getConfiguration(section);
  }

  getWorkspaceFolder(uri) {
    return vscode.workspace.getWorkspaceFolder(uri);
  }

  onDidChangeActiveTextEditor(listener) {
    return vscode.window.onDidChangeActiveTextEditor(listener);
  }

  onDidChangeTextEditorSelection(listener) {
    return vscode.window.onDidChangeTextEditorSelection(listener);
  }

  onDidSaveTextDocument(listener) {
    return vscode.workspace.onDidSaveTextDocument(listener);
  }

  onDidChangeTextDocument(listener) {
    return vscode.workspace.onDidChangeTextDocument(listener);
  }

  onDidChangeWorkspaceFolders(listener) {
    return vscode.workspace.onDidChangeWorkspaceFolders(listener);
  }

  onDidChangeConfiguration(listener) {
    return vscode.workspace.onDidChangeConfiguration(listener);
  }

  onDidCloseTextDocument(listener) {
    return vscode.workspace.onDidCloseTextDocument(listener);
  }

  showInformationMessage(message, ...items) {
    return vscode.window.showInformationMessage(message, ...items);
  }

  showWarningMessage(message, ...items) {
    return vscode.window.showWarningMessage(message, ...items);
  }

  showErrorMessage(message, ...items) {
    return vscode.window.showErrorMessage(message, ...items);
  }

  executeCommand(command, ...args) {
    return vscode.commands.executeCommand(command, ...args);
  }

  get activeTextEditor() {
    return vscode.window.activeTextEditor;
  }
}

module.exports = new VSCodePlatform();
