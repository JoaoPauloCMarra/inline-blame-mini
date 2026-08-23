const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runTests } = require('@vscode/test-electron');

const version = process.argv[2] || '1.96.0';

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
    process.stdout.write(
      `Running extension smoke test with VS Code ${version}\n`
    );
    await runTests({
      version,
      timeout: 30_000,
      extensionDevelopmentPath: path.resolve(__dirname, '..'),
      extensionTestsPath: path.resolve(__dirname, '../test/extension-smoke.js'),
      extensionTestsEnv: {
        INLINE_BLAME_TEST_FILE: filePath,
      },
      launchArgs: [workspaceRoot, '--disable-extensions', '--disable-updates'],
    });
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
