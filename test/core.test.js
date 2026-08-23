const { beforeEach, expect, mock, test } = require('bun:test');

const editor = {
  document: {
    fileName: __filename,
    isDirty: false,
    isUntitled: false,
    lineCount: 3,
    version: 1,
    lineAt() {
      return { text: 'const value = 1;' };
    },
  },
  selection: { active: { line: 0 } },
};

const addDecoration = mock();
const blameRange = mock(
  async () =>
    new Map([
      [
        1,
        {
          author: 'Test Author',
          hash: '12345678',
          summary: 'Test commit',
          time: 1_700_000_000,
        },
      ],
      [
        2,
        {
          author: 'Test Author',
          hash: '12345678',
          summary: 'Test commit',
          time: 1_700_000_000,
        },
      ],
      [
        3,
        {
          author: 'Test Author',
          hash: '12345678',
          summary: 'Test commit',
          time: 1_700_000_000,
        },
      ],
    ])
);
const clearDecorations = mock();
const stat = mock(async () => ({ size: 100 }));
const getFileLastCommit = mock(async () => ({
  author: 'Test Author',
  hash: '12345678',
  time: 1_700_000_000,
}));
let shouldProcessFile = true;
let statusBarEnabled = false;

mock.module('vscode', () => ({
  Uri: { file: fileName => ({ fileName }) },
  window: { activeTextEditor: editor },
  workspace: { fs: { stat } },
}));

mock.module('../src/git', () => ({
  blameRange,
  blameLine(_file, _line, callback) {
    callback(
      {
        author: 'Test Author',
        hash: '12345678',
        summary: 'Test commit',
        time: 1_700_000_000,
      },
      null
    );
  },
  getFileLastCommit,
}));

mock.module('../src/ui', () => ({
  addDecoration,
  clearDecorations,
  getGitAvailability: () => true,
  setFileStatusBar() {},
  setStatusBar() {},
}));

mock.module('../src/config', () => ({
  formatBlameText: data => `${data.author}, ${data.summary}`,
  getStatusBarConfig: () => ({ enabled: statusBarEnabled }),
  getStyleConfig: () => ({ position: 'end-of-line' }),
  getSummaryMaxLength: () => 60,
  isEnabled: () => true,
  shouldProcessFile: () => shouldProcessFile,
  shouldShowOnlyWhenChanged: () => true,
  update: async () => {},
}));

const { clearCaches, refresh } = require('../src/core');

function createDeferred() {
  let resolve;
  const promise = new Promise(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function waitForCalls(callable, count) {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (callable.mock.calls.length >= count) return;
    await Promise.resolve();
  }

  throw new Error(
    `Expected ${count} calls, received ${callable.mock.calls.length}`
  );
}

beforeEach(() => {
  addDecoration.mockClear();
  blameRange.mockClear();
  clearDecorations.mockClear();
  getFileLastCommit.mockClear();
  stat.mockClear();
  shouldProcessFile = true;
  statusBarEnabled = false;
  editor.document.version += 1;
  clearCaches();
});

test('manual refresh renders blame again on the unchanged line', async () => {
  await refresh();
  await refresh();

  expect(addDecoration).toHaveBeenCalledTimes(2);
});

test('a cache miss batches the current and prefetched lines', async () => {
  await refresh();

  expect(blameRange).toHaveBeenCalledTimes(1);
  expect(blameRange).toHaveBeenCalledWith(__filename, 1, 3);
});

test('file size is resolved once per document version', async () => {
  await refresh();
  await refresh();

  expect(stat).toHaveBeenCalledTimes(1);
});

test('excluded files do not request status metadata', async () => {
  shouldProcessFile = false;
  statusBarEnabled = true;

  await refresh();

  expect(getFileLastCommit).not.toHaveBeenCalled();
});

test('an obsolete request cannot detach the current in-flight request', async () => {
  const first = createDeferred();
  const second = createDeferred();
  const blame = {
    author: 'Test Author',
    hash: '12345678',
    summary: 'Test commit',
    time: 1_700_000_000,
  };
  const blames = new Map([
    [1, blame],
    [2, blame],
    [3, blame],
  ]);
  blameRange.mockImplementationOnce(() => first.promise);
  blameRange.mockImplementationOnce(() => second.promise);

  const firstRefresh = refresh();
  await waitForCalls(blameRange, 1);
  clearCaches();
  const secondRefresh = refresh();
  await waitForCalls(blameRange, 2);

  first.resolve(blames);
  await firstRefresh;

  const overlappingRefresh = refresh();
  await Promise.resolve();
  second.resolve(blames);
  await Promise.all([secondRefresh, overlappingRefresh]);

  expect(blameRange).toHaveBeenCalledTimes(2);
  expect(addDecoration).toHaveBeenCalledTimes(2);
});
