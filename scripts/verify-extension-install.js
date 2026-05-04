const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJson = require(path.join(rootDir, 'package.json'));

function getCli() {
  return process.env.VSCODE_CLI || 'code-insiders';
}

function getTarget() {
  const mode = process.argv[2] || 'local';

  if (mode === 'marketplace') {
    return `${packageJson.publisher}.${packageJson.name}`;
  }

  if (mode !== 'local') {
    throw new Error(`Unknown install verification mode: ${mode}`);
  }

  return path.join(rootDir, `${packageJson.name}-${packageJson.version}.vsix`);
}

function runInstall(target) {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'inline-blame-install-')
  );
  const userDataDir = path.join(tempRoot, 'user-data');
  const extensionsDir = path.join(tempRoot, 'extensions');

  try {
    const result = spawnSync(
      getCli(),
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
  const target = getTarget();

  if (target.endsWith('.vsix') && !fs.existsSync(target)) {
    throw new Error(`Missing VSIX: ${target}`);
  }

  runInstall(target);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
