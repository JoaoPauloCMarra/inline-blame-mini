const { afterEach, expect, mock, test } = require('bun:test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

mock.module('vscode', () => ({
  Uri: { file: filePath => ({ filePath }) },
  workspace: { getWorkspaceFolder: () => ({}) },
}));

const { blameRange, getFileLastCommit } = require('../src/git');

const tempDirs = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

function createCommittedFile() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-blame-git-'));
  const filePath = path.join(repoRoot, 'file.js');
  const commitDate = '2023-11-14T22:13:20Z';

  tempDirs.push(repoRoot);
  execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Local User'], { cwd: repoRoot });
  execFileSync('git', ['config', 'user.email', 'local@example.com'], {
    cwd: repoRoot,
  });

  fs.writeFileSync(
    filePath,
    'const value = 1;\nconst next = value + 1;\nconst done = next > 1;\n'
  );
  execFileSync('git', ['add', 'file.js'], { cwd: repoRoot });
  execFileSync('git', ['commit', '-m', 'Add fixture'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: commitDate,
      GIT_AUTHOR_EMAIL: 'author@example.com',
      GIT_AUTHOR_NAME: 'Commit Author',
      GIT_COMMITTER_DATE: commitDate,
    },
    stdio: 'ignore',
  });

  return filePath;
}

function readFileLastCommit(filePath) {
  return getFileLastCommit(filePath);
}

test('file status reports the last commit author and time', async () => {
  const filePath = createCommittedFile();

  const commit = await readFileLastCommit(filePath);

  expect(commit.author).toBe('Commit Author');
  expect(commit.time).toBe(1_700_000_000);
});

test('one blame range returns metadata for every requested line', async () => {
  const filePath = createCommittedFile();

  const blames = await blameRange(filePath, 1, 3);

  expect([...blames.keys()]).toEqual([1, 2, 3]);
  expect([...blames.values()].map(blame => blame.summary)).toEqual([
    'Add fixture',
    'Add fixture',
    'Add fixture',
  ]);
});

test('file status observes a commit created after the first read', async () => {
  const filePath = createCommittedFile();
  const repoRoot = path.dirname(filePath);

  await readFileLastCommit(filePath);

  fs.appendFileSync(filePath, 'const later = done;\n');
  execFileSync('git', ['add', 'file.js'], { cwd: repoRoot });
  execFileSync('git', ['commit', '-m', 'Update fixture'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: '2023-11-14T22:15:00Z',
      GIT_AUTHOR_EMAIL: 'later@example.com',
      GIT_AUTHOR_NAME: 'Later Author',
      GIT_COMMITTER_DATE: '2023-11-14T22:15:00Z',
    },
    stdio: 'ignore',
  });

  const commit = await readFileLastCommit(filePath);

  expect(commit.author).toBe('Later Author');
  expect(commit.time).toBe(1_700_000_100);
});
