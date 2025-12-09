const PLATFORM = process.env.EDITOR_PLATFORM || 'vscode';

let platformAdapter;

try {
  platformAdapter = require(`./${PLATFORM}`);
} catch (error) {
  console.warn(
    `Platform adapter for "${PLATFORM}" not found, falling back to vscode`
  );
  platformAdapter = require('./vscode');
}

module.exports = platformAdapter;
