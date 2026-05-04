const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { runTests } = require('@vscode/test-electron');

function createRepoFixture() {
  const workspaceRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'inline-blame-mini-')
  );
  const repoRoot = path.join(workspaceRoot, 'nested-repo');
  const filePath = path.join(repoRoot, 'file.js');

  fs.mkdirSync(repoRoot);
  execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Inline Blame Test'], {
    cwd: repoRoot,
  });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], {
    cwd: repoRoot,
  });

  fs.writeFileSync(filePath, 'const value = 1;\nconst next = value + 1;\n');
  execFileSync('git', ['add', 'file.js'], { cwd: repoRoot });
  execFileSync('git', ['commit', '-m', 'Add fixture file'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });

  return { filePath, workspaceRoot };
}

async function main() {
  const { filePath, workspaceRoot } = createRepoFixture();

  try {
    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '..'),
      extensionTestsPath: path.resolve(__dirname, '../test/extension-smoke.js'),
      extensionTestsEnv: {
        INLINE_BLAME_TEST_FILE: filePath,
      },
      launchArgs: [workspaceRoot, '--disable-extensions'],
    });
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
