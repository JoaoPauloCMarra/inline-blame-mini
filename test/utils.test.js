const { afterEach, expect, test } = require('bun:test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { findGitRoot } = require('../src/utils');

const originalCwd = process.cwd();
const tempDirs = [];

afterEach(() => {
  process.chdir(originalCwd);

  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

function createRepoFixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-blame-mini-'));
  const nestedDir = path.join(repoRoot, 'nested');

  fs.mkdirSync(path.join(repoRoot, '.git'));
  fs.mkdirSync(nestedDir);

  tempDirs.push(repoRoot);

  return { repoRoot, nestedDir };
}

test('findGitRoot resolves relative file paths before walking parents', () => {
  const { repoRoot } = createRepoFixture();

  process.chdir(repoRoot);

  expect(findGitRoot('hosts')).toBe(fs.realpathSync(repoRoot));
});

test('findGitRoot walks absolute file paths to the repository root', () => {
  const { repoRoot, nestedDir } = createRepoFixture();
  const filePath = path.join(nestedDir, 'file.js');

  expect(findGitRoot(filePath)).toBe(repoRoot);
});
