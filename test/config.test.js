const { beforeEach, expect, mock, test } = require('bun:test');

const values = {
  excludeFiles: [],
  includeFiles: ['src/**'],
};
let configReads = 0;

mock.module('vscode', () => ({
  ConfigurationTarget: { Workspace: 2 },
  workspace: {
    asRelativePath(filePath) {
      return filePath.replace('/workspace/', '');
    },
    getConfiguration() {
      configReads += 1;
      return {
        get(key, defaultValue) {
          return values[key] ?? defaultValue;
        },
        update() {},
      };
    },
  },
}));

const {
  clearCache,
  formatBlameText,
  shouldProcessFile,
} = require('../src/config');

beforeEach(() => {
  configReads = 0;
  clearCache?.();
});

test('file filters match paths relative to the workspace', () => {
  expect(shouldProcessFile('/workspace/src/file.js')).toBe(true);
  expect(shouldProcessFile('/workspace/test/file.js')).toBe(false);
});

test('repeated file checks reuse the current configuration snapshot', () => {
  shouldProcessFile('/workspace/src/first.js');
  shouldProcessFile('/workspace/src/second.js');

  expect(configReads).toBe(1);
});

test('format variables can be used more than once', () => {
  const text = formatBlameText(
    {
      author: 'Ada',
      hash: '12345678',
      summary: 'Refine blame',
      timeAgo: 'today',
    },
    '{author} / {author}: {summary}'
  );

  expect(text).toBe('Ada / Ada: Refine blame');
});
