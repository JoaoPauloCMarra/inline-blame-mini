const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const packageJson = require(path.join(rootDir, 'package.json'));

function getMode() {
  return process.argv[2] || 'local';
}

function getCli(mode) {
  if (mode === 'cursor') {
    return process.env.CURSOR_CLI || 'cursor';
  }

  return process.env.VSCODE_CLI || 'code-insiders';
}

function getTarget(mode) {
  if (mode === 'marketplace') {
    return `${packageJson.publisher}.${packageJson.name}`;
  }

  if (mode !== 'local' && mode !== 'cursor') {
    throw new Error(`Unknown install verification mode: ${mode}`);
  }

  return path.join(rootDir, `${packageJson.name}-${packageJson.version}.vsix`);
}

function runInstall(cli, target) {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'inline-blame-install-')
  );
  const userDataDir = path.join(tempRoot, 'user-data');
  const extensionsDir = path.join(tempRoot, 'extensions');

  try {
    const result = spawnSync(
      cli,
      [
        '--user-data-dir',
        userDataDir,
        '--extensions-dir',
        extensionsDir,
        '--install-extension',
        target,
        '--force',
      ],
      {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120_000,
      }
    );

    if (result.status !== 0) {
      const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
      throw new Error(output || `Install verification failed for ${target}`);
    }

    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function main() {
  const mode = getMode();
  const target = getTarget(mode);

  if (target.endsWith('.vsix') && !fs.existsSync(target)) {
    throw new Error(`Missing VSIX: ${target}`);
  }

  runInstall(getCli(mode), target);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
