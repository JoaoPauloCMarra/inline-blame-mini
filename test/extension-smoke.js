const assert = require('assert');

const vscode = require('vscode');

const extensionId = 'JoaoPauloCMarra.inline-blame-mini';

function isEnabled() {
  return vscode.workspace.getConfiguration('inline-blame-mini').get('enabled');
}

async function run() {
  const extension = vscode.extensions.getExtension(extensionId);
  assert(extension, 'extension is registered');

  await extension.activate();
  assert.strictEqual(extension.isActive, true);

  const filePath = process.env.INLINE_BLAME_TEST_FILE;
  assert(filePath, 'test file path is configured');

  const document = await vscode.workspace.openTextDocument(filePath);
  const editor = await vscode.window.showTextDocument(document);

  editor.selection = new vscode.Selection(0, 0, 0, 0);
  await vscode.commands.executeCommand('inline-blame-mini.refresh');
  await vscode.commands.executeCommand('inline-blame-mini.openSettings');

  const originalEnabled = isEnabled();

  await vscode.commands.executeCommand('inline-blame-mini.toggle');
  assert.strictEqual(isEnabled(), !originalEnabled);

  await vscode.commands.executeCommand('inline-blame-mini.toggle');
  assert.strictEqual(isEnabled(), originalEnabled);

  const { escapeHtml, getCommitDetailsContent } = require('../src/extension');
  assert.strictEqual(
    escapeHtml('<b>"x"&</b>'),
    '&lt;b&gt;&quot;x&quot;&amp;&lt;/b&gt;'
  );
  assert(
    getCommitDetailsContent({
      hash: 'abc123',
      author: '<author>',
      time: Date.now() / 1000,
      summary: '<script>alert(1)</script>',
      prNumber: null,
    }).includes('&lt;script&gt;alert(1)&lt;/script&gt;')
  );

  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}

module.exports = { run };
