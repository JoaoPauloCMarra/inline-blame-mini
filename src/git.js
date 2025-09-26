const vscode = require('vscode');
const path = require('path');
const { LRUCache } = require('./utils');
const { CACHE_MAX_SIZE } = require('./constants');
const { execFile } = require('child_process');

const userCache = new LRUCache(CACHE_MAX_SIZE);
const fileCache = new LRUCache(CACHE_MAX_SIZE);

function blameLine(file, line, callback) {
  try {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(file)
    );
    if (!workspaceFolder) {
      callback(null, {
        type: 'NOT_GIT_REPO',
        message: 'File is not in a workspace folder',
      });
      return;
    }

    const cwd = workspaceFolder.uri.fsPath;
    const relativePath = path.relative(cwd, file);

    execFile(
      'git',
      [
        'blame',
        '-L',
        `${line},${line}`,
        '--line-porcelain',
        '--',
        relativePath,
      ],
      { cwd: cwd },
      (error, stdout, stderr) => {
        if (error) {
          const err = categorizeGitError(error, stderr);
          callback(null, err);
          return;
        }

        if (!stdout.trim()) {
          callback(null, {
            type: 'NO_BLAME_DATA',
            message: 'No blame data available for this line',
          });
          return;
        }

        parseBlameFromGit(stdout.trim(), cwd, (blameData, parseError) => {
          if (parseError) {
            callback(null, parseError);
          } else {
            callback(blameData, null);
          }
        });
      }
    );
  } catch (error) {
    callback(null, {
      type: 'EXECUTION_ERROR',
      message: `Failed to execute git blame: ${error.message}`,
    });
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
    return { type: 'TIMEOUT', message: 'Git operation timed out' };
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

function parseBlameFromGit(blameOutput, cwd, callback) {
  try {
    const lines = blameOutput.split('\n');
    if (lines.length < 10) {
      callback(null, {
        type: 'PARSE_ERROR',
        message: 'Invalid git blame output format',
      });
      return;
    }

    const firstLineParts = lines[0].trim().split(/\s+/);
    const hash = firstLineParts[0];

    let author = 'Unknown';
    let authorEmail = '';
    let authorTime = Date.now() / 1000;
    let summary = 'No commit message';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('author ')) {
        author = line.substring(7).trim();
      } else if (line.startsWith('author-mail ')) {
        authorEmail = line.substring(12).trim();
        if (authorEmail.startsWith('<') && authorEmail.endsWith('>')) {
          authorEmail = authorEmail.slice(1, -1);
        }
      } else if (line.startsWith('author-time ')) {
        authorTime = parseInt(line.substring(11).trim());
      } else if (line.startsWith('summary ')) {
        summary = line.substring(8).trim();
      }
    }

    if (hash === '0000000000000000000000000000000000000000') {
      callback(
        {
          author: 'You',
          time: Date.now() / 1000,
          summary: 'Not committed yet',
          hash: 'uncommitted',
          isUncommitted: true,
        },
        null
      );
      return;
    }

    getCurrentGitUser(cwd, currentUser => {
      const isCurrentUser =
        currentUser &&
        (currentUser.email === authorEmail || currentUser.name === author);

      callback(
        {
          author: isCurrentUser ? 'You' : author,
          authorEmail: authorEmail,
          time: authorTime,
          summary: summary,
          hash: hash.substring(0, 8),
          prNumber: null,
        },
        null
      );
    });
  } catch (error) {
    callback(null, {
      type: 'PARSE_ERROR',
      message: `Failed to parse git blame output: ${error.message}`,
    });
  }
}

function getFileLastCommit(file, callback) {
  const cacheKey = file;
  const cached = fileCache.get(cacheKey);
  if (cached !== undefined) {
    callback(cached.data, cached.error);
    return;
  }

  try {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(file)
    );
    if (!workspaceFolder) {
      const error = {
        type: 'NOT_GIT_REPO',
        message: 'File is not in a workspace folder',
      };
      fileCache.set(cacheKey, { data: null, error });
      callback(null, error);
      return;
    }

    const cwd = workspaceFolder.uri.fsPath;
    const relativePath = path.relative(cwd, file);

    execFile(
      'git',
      ['log', '--oneline', '-1', '--', relativePath],
      { cwd: cwd },
      (error, stdout, stderr) => {
        if (error) {
          const err = {
            type: 'EXECUTION_ERROR',
            message: `Failed to get file commit history: ${stderr || error.message}`,
          };
          fileCache.set(cacheKey, { data: null, error: err });
          callback(null, err);
          return;
        }

        if (!stdout.trim()) {
          const error = {
            type: 'FILE_NOT_TRACKED',
            message: 'File has no git history',
          };
          fileCache.set(cacheKey, { data: null, error });
          callback(null, error);
          return;
        }

        const line = stdout.trim().split(' ');
        const hash = line[0];

        getCurrentGitUser(cwd, currentUser => {
          const result = {
            author: currentUser ? currentUser.name : 'Unknown',
            time: Date.now() / 1000,
            hash: hash.substring(0, 8),
          };

          fileCache.set(cacheKey, { data: result, error: null });

          callback(result, null);
        });
      }
    );
  } catch (error) {
    const err = {
      type: 'EXECUTION_ERROR',
      message: `Failed to execute git command: ${error.message}`,
    };
    fileCache.set(cacheKey, { data: null, error: err });
    callback(null, err);
  }
}

function getCurrentGitUser(cwd, callback) {
  if (userCache.has(cwd)) {
    callback(userCache.get(cwd));
    return;
  }

  execFile('git', ['config', 'user.name'], { cwd: cwd }, (error, stdout) => {
    if (error || !stdout.trim()) {
      userCache.set(cwd, null);
      callback(null);
      return;
    }

    const name = stdout.trim();

    execFile(
      'git',
      ['config', 'user.email'],
      { cwd: cwd },
      (emailError, emailStdout) => {
        const user =
          !emailError && emailStdout.trim()
            ? { name, email: emailStdout.trim() }
            : null;
        userCache.set(cwd, user);
        callback(user);
      }
    );
  });
}

function checkGitAvailability(callback) {
  execFile('git', ['--version'], error => {
    callback(!error);
  });
}

function updateCacheSettings() {
  userCache.setLimit(CACHE_MAX_SIZE);
  fileCache.setLimit(CACHE_MAX_SIZE);
}

module.exports = {
  blameLine,
  getFileLastCommit,
  checkGitAvailability,
  updateCacheSettings,
};
