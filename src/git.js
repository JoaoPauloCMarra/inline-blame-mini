const vscode = require('vscode');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { findGitRoot, LRUCache } = require('./utils');
const { CACHE_MAX_SIZE, GIT_TIMEOUT_MS } = require('./constants');

const execFileAsync = promisify(execFile);

const userCache = new LRUCache(CACHE_MAX_SIZE);

function runGit(args, cwd) {
  return execFileAsync('git', args, {
    cwd,
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: 1024 * 1024,
  });
}

function getGitContext(file) {
  const gitRoot = findGitRoot(file);
  if (!gitRoot) {
    return null;
  }

  return {
    cwd: gitRoot,
    relativePath: path.relative(gitRoot, file),
  };
}

function getGitContextOrError(file) {
  const context = getGitContext(file);
  if (context) {
    return { context, error: null };
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(
    vscode.Uri.file(file)
  );
  const error = workspaceFolder
    ? {
        type: 'NOT_GIT_REPO',
        message: 'Directory is not a git repository',
      }
    : {
        type: 'NOT_GIT_REPO',
        message: 'File is not in a workspace folder',
      };

  return { context: null, error };
}

async function blameRange(file, startLine, endLine) {
  const { context, error } = getGitContextOrError(file);
  if (error) {
    throw error;
  }

  const { cwd, relativePath } = context;

  try {
    const { stdout } = await runGit(
      [
        'blame',
        '-L',
        `${startLine},${endLine}`,
        '--line-porcelain',
        '--no-merges',
        '--',
        relativePath,
      ],
      cwd
    );

    if (!stdout.trim()) {
      throw {
        type: 'NO_BLAME_DATA',
        message: 'No blame data available for this range',
      };
    }

    const currentUser = await getCurrentGitUser(cwd);
    return parseBlameFromGit(stdout.trim(), currentUser);
  } catch (error) {
    if (error.type) {
      throw error;
    }

    throw categorizeGitError(error, error.stderr);
  }
}

function categorizeGitError(err, stderr) {
  const errorMessage = (stderr || err.message || '').toLowerCase();

  if (errorMessage.includes('not a git repository')) {
    return {
      type: 'NOT_GIT_REPO',
      message: 'Directory is not a git repository',
    };
  }

  if (
    errorMessage.includes('no such file or directory') ||
    errorMessage.includes('does not exist') ||
    errorMessage.includes('pathspec')
  ) {
    return {
      type: 'FILE_NOT_FOUND',
      message: 'File not found in git repository',
    };
  }

  if (
    errorMessage.includes('fatal: no such path') ||
    errorMessage.includes('is outside repository')
  ) {
    return { type: 'FILE_NOT_TRACKED', message: 'File is not tracked by git' };
  }

  if (
    errorMessage.includes('permission denied') ||
    errorMessage.includes('access denied')
  ) {
    return {
      type: 'PERMISSION_DENIED',
      message: 'Permission denied accessing git repository',
    };
  }

  if (err.code === 'ETIMEDOUT' || errorMessage.includes('timeout')) {
    return {
      type: 'TIMEOUT',
      message: 'Git operation timed out - repository may be too large',
    };
  }

  if (err.code === 'ENOENT') {
    return { type: 'GIT_NOT_FOUND', message: 'Git command not found' };
  }

  return {
    type: 'UNKNOWN',
    message: `Git error: ${err.message || 'Unknown error'}`,
    code: err.code,
  };
}

function parseBlameFromGit(blameOutput, currentUser) {
  try {
    const lines = blameOutput.split('\n');
    const blames = new Map();
    let record = null;

    for (const line of lines) {
      const header = line.match(/^([0-9a-f]{40}) \d+ (\d+)(?: \d+)?$/);
      if (header) {
        record = {
          hash: header[1],
          line: Number(header[2]),
          author: 'Unknown',
          authorEmail: '',
          time: Date.now() / 1000,
          summary: 'No commit message',
        };
        continue;
      }

      if (!record) {
        continue;
      }

      if (line.startsWith('author ')) {
        record.author = line.substring(7).trim();
      } else if (line.startsWith('author-mail ')) {
        record.authorEmail = line.substring(12).trim();
        if (
          record.authorEmail.startsWith('<') &&
          record.authorEmail.endsWith('>')
        ) {
          record.authorEmail = record.authorEmail.slice(1, -1);
        }
      } else if (line.startsWith('author-time ')) {
        record.time = Number(line.substring(12).trim());
      } else if (line.startsWith('summary ')) {
        record.summary = line.substring(8).trim();
      } else if (line.startsWith('\t')) {
        blames.set(record.line, formatBlameRecord(record, currentUser));
        record = null;
      }
    }

    if (blames.size === 0) {
      throw new Error('Invalid git blame output format');
    }

    return blames;
  } catch (error) {
    throw {
      type: 'PARSE_ERROR',
      message: `Failed to parse git blame output: ${error.message}`,
    };
  }
}

function formatBlameRecord(record, currentUser) {
  if (record.hash === '0000000000000000000000000000000000000000') {
    return {
      author: 'You',
      time: Date.now() / 1000,
      summary: 'Not committed yet',
      hash: 'uncommitted',
      isUncommitted: true,
    };
  }

  const isCurrentUser =
    currentUser &&
    (currentUser.email === record.authorEmail ||
      currentUser.name === record.author);

  return {
    author: isCurrentUser ? 'You' : record.author,
    authorEmail: record.authorEmail,
    time: record.time,
    summary: record.summary,
    hash: record.hash.substring(0, 8),
  };
}

async function getFileLastCommit(file) {
  const gitContext = getGitContextOrError(file);
  if (gitContext.error) {
    throw gitContext.error;
  }

  const { cwd, relativePath } = gitContext.context;

  try {
    const { stdout } = await runGit(
      ['log', '-1', '--format=%h%x00%an%x00%at', '--', relativePath],
      cwd
    );

    if (!stdout.trim()) {
      throw {
        type: 'FILE_NOT_TRACKED',
        message: 'File has no git history',
      };
    }

    const [hash, author, timestamp] = stdout.trim().split('\0');
    return {
      author,
      time: Number(timestamp),
      hash: hash.substring(0, 8),
    };
  } catch (error) {
    if (error.type) {
      throw error;
    }

    throw {
      type: 'EXECUTION_ERROR',
      message: `Failed to get file commit history: ${error.stderr || error.message}`,
    };
  }
}

async function getCurrentGitUser(cwd) {
  const cached = userCache.get(cwd);
  if (cached !== undefined) {
    return cached;
  }

  const request = readCurrentGitUser(cwd);
  userCache.set(cwd, request);
  return request;
}

async function readCurrentGitUser(cwd) {
  try {
    const { stdout } = await runGit(
      ['config', '--null', '--get-regexp', '^user\\.(name|email)$'],
      cwd
    );
    const user = {};

    for (const entry of stdout.split('\0')) {
      const separator = entry.indexOf('\n');
      if (separator === -1) {
        continue;
      }

      const key = entry.slice(0, separator);
      const value = entry.slice(separator + 1);
      if (key === 'user.name') user.name = value;
      if (key === 'user.email') user.email = value;
    }

    return user.name || user.email ? user : null;
  } catch (error) {
    return null;
  }
}

async function checkGitAvailability() {
  try {
    await runGit(['--version']);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  blameRange,
  getFileLastCommit,
  checkGitAvailability,
};
