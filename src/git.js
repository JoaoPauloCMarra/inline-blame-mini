const vscode = require('vscode');
const { execFile } = require('child_process');
const config = require('./config');

const userCache = new Map();
const commitCache = new Map();
const prCache = new Map();
const fileCache = new Map();
const CACHE_CLEANUP_THRESHOLD = 200;

function blameLine(file, line, callback) {
  try {
    const gitConfig = config.getGitConfig();
    const operationTimeout = gitConfig.timeout;

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

    const opts = {
      cwd: workspaceFolder.uri.fsPath,
      timeout: operationTimeout,
    };
    const args = [
      'blame',
      `-L`,
      `${line},${line}`,
      '--line-porcelain',
      '--',
      file,
    ];

    const gitProcess = execFile('git', args, opts, (err, stdout, stderr) => {
      if (err) {
        const error = categorizeGitError(err, stderr);
        callback(null, error);
        return;
      }

      if (!stdout) {
        callback(null, {
          type: 'NO_OUTPUT',
          message: 'Git blame returned no output',
        });
        return;
      }

      if (stderr && stderr.includes('fatal:')) {
        const error = categorizeGitError(new Error(stderr), stderr);
        callback(null, error);
        return;
      }

      try {
        parseBlameOutput(
          stdout,
          workspaceFolder.uri.fsPath,
          (blameData, parseError) => {
            if (parseError) {
              callback(null, parseError);
            } else {
              callback(blameData, null);
            }
          }
        );
      } catch (parseError) {
        callback(null, {
          type: 'PARSE_ERROR',
          message: `Failed to parse git blame output: ${parseError.message}`,
        });
      }
    });

    const timeoutHandler = setTimeout(() => {
      if (gitProcess && !gitProcess.killed) {
        gitProcess.kill('SIGTERM');
        callback(null, {
          type: 'TIMEOUT',
          message: `Git operation timed out after ${operationTimeout / 1000} seconds`,
        });
      }
    }, operationTimeout);

    gitProcess.on('exit', () => {
      clearTimeout(timeoutHandler);
    });
  } catch (error) {
    callback(null, {
      type: 'EXECUTION_ERROR',
      message: `Failed to execute git command: ${error.message}`,
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

function parseBlameOutput(stdout, cwd, callback) {
  try {
    const lines = stdout.trim().split('\n');
    if (lines.length === 0) {
      callback(null, { type: 'PARSE_ERROR', message: 'Empty blame output' });
      return;
    }

    const firstLine = lines[0];
    if (!firstLine) {
      callback(null, {
        type: 'PARSE_ERROR',
        message: 'Invalid blame output format',
      });
      return;
    }

    const hash = firstLine.split(' ')[0];
    if (!hash || hash.length < 8) {
      callback(null, {
        type: 'PARSE_ERROR',
        message: 'Invalid commit hash in blame output',
      });
      return;
    }

    if (hash.startsWith('00000000')) {
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

    const metadata = {};
    let summary = '';

    for (const line of lines) {
      const spaceIndex = line.indexOf(' ');
      if (spaceIndex > -1) {
        const key = line.substring(0, spaceIndex);
        const value = line.substring(spaceIndex + 1);
        metadata[key] = value;
      } else if (line.startsWith('\t')) {
        summary = line.substring(1);
      }
    }

    const author = metadata['author'] || 'Unknown';
    const authorTime = parseInt(metadata['author-time'] || '0', 10);
    const authorEmail = metadata['author-mail'] || '';

    if (authorTime === 0) {
      callback(null, {
        type: 'PARSE_ERROR',
        message: 'Invalid author time in blame output',
      });
      return;
    }

    getCurrentGitUser(cwd, currentUser => {
      const isCurrentUser =
        currentUser &&
        (currentUser.email === authorEmail || currentUser.name === author);

      getPRInfo(cwd, hash, prData => {
        if (prData && prData.title) {
          callback(
            {
              author: isCurrentUser ? 'You' : author,
              time: authorTime,
              summary: prData.title,
              hash: hash.substring(0, 8),
              prNumber: prData.number,
            },
            null
          );
        } else {
          getFullCommitMessage(cwd, hash, fullMessage => {
            const displaySummary =
              fullMessage || summary || 'No commit message';
            callback(
              {
                author: isCurrentUser ? 'You' : author,
                time: authorTime,
                summary: displaySummary,
                hash: hash.substring(0, 8),
                prNumber: null,
              },
              null
            );
          });
        }
      });
    });
  } catch (error) {
    callback(null, {
      type: 'PARSE_ERROR',
      message: `Failed to parse git blame output: ${error.message}`,
    });
  }
}

function getFullCommitMessage(cwd, hash, callback) {
  const cacheKey = `${cwd}:${hash}`;
  const cached = commitCache.get(cacheKey);
  if (cached !== undefined) {
    callback(cached);
    return;
  }

  const args = ['log', '--format=%s', '-n', '1', hash];
  const opts = { cwd, timeout: 5000 };

  execFile('git', args, opts, (err, stdout) => {
    const result = err ? null : stdout ? stdout.trim() : null;
    commitCache.set(cacheKey, result);

    if (commitCache.size > CACHE_CLEANUP_THRESHOLD) {
      const firstKey = commitCache.keys().next().value;
      commitCache.delete(firstKey);
    }

    callback(result);
  });
}

function getCurrentGitUser(cwd, callback) {
  if (userCache.has(cwd)) {
    callback(userCache.get(cwd));
    return;
  }

  const getUserName = new Promise(resolve => {
    execFile(
      'git',
      ['config', 'user.name'],
      { cwd, timeout: 3000 },
      (err, stdout) => {
        resolve(err ? null : stdout.trim());
      }
    );
  });

  const getUserEmail = new Promise(resolve => {
    execFile(
      'git',
      ['config', 'user.email'],
      { cwd, timeout: 3000 },
      (err, stdout) => {
        resolve(err ? null : stdout.trim());
      }
    );
  });

  Promise.all([getUserName, getUserEmail])
    .then(([name, email]) => {
      const user = name && email ? { name, email } : null;
      userCache.set(cwd, user);
      callback(user);
    })
    .catch(() => {
      userCache.set(cwd, null);
      callback(null);
    });
}

function getPRInfo(cwd, hash, callback) {
  const cacheKey = `${cwd}:${hash}`;
  const cached = prCache.get(cacheKey);
  if (cached !== undefined) {
    callback(cached);
    return;
  }

  const args = ['log', '--format=%s', '-n', '1', hash];
  const opts = { cwd, timeout: 5000 };

  execFile('git', args, opts, (err, stdout) => {
    if (err || !stdout) {
      prCache.set(cacheKey, null);
      callback(null);
      return;
    }

    const commitMessage = stdout.trim();
    const prPatterns = [
      { pattern: /^Merge pull request #(\d+) from .+/, numberIndex: 1 },
      { pattern: /^Merged in .+ \(pull request #(\d+)\)/, numberIndex: 1 },
      { pattern: /^(.+) \(#(\d+)\)$/, titleIndex: 1, numberIndex: 2 },
      { pattern: /^(.+) \(!(\d+)\)$/, titleIndex: 1, numberIndex: 2 },
      { pattern: /.*#(\d+).*/, numberIndex: 1 },
    ];

    let result = null;
    for (const { pattern, titleIndex, numberIndex } of prPatterns) {
      const match = commitMessage.match(pattern);
      if (match) {
        const prNumber = match[numberIndex];
        if (titleIndex && match[titleIndex]) {
          const prTitle = match[titleIndex];
          if (
            prTitle &&
            prTitle !== 'Merge pull request' &&
            prTitle !== 'Merged in'
          ) {
            result = { title: prTitle, number: prNumber };
            break;
          }
        }
        if (prNumber) {
          result = { title: commitMessage, number: prNumber };
          break;
        }
      }
    }

    prCache.set(cacheKey, result);

    if (prCache.size > CACHE_CLEANUP_THRESHOLD) {
      const firstKey = prCache.keys().next().value;
      prCache.delete(firstKey);
    }

    callback(result);
  });
}

function checkGitAvailability(callback) {
  execFile('git', ['--version'], { timeout: 3000 }, err => {
    callback(!err);
  });
}

function getFileLastCommit(file, callback) {
  const cacheKey = file;
  const cached = fileCache.get(cacheKey);
  if (cached !== undefined) {
    callback(cached.data, cached.error);
    return;
  }

  try {
    const gitConfig = config.getGitConfig();
    const operationTimeout = gitConfig.timeout;

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

    const opts = {
      cwd: workspaceFolder.uri.fsPath,
      timeout: operationTimeout,
    };
    const args = ['log', '-n', '1', '--format=%H|%an|%ae|%at', '--', file];

    execFile('git', args, opts, (err, stdout, stderr) => {
      if (err) {
        const error = categorizeGitError(err, stderr);
        fileCache.set(cacheKey, { data: null, error });
        callback(null, error);
        return;
      }

      if (!stdout || !stdout.trim()) {
        const error = {
          type: 'FILE_NOT_TRACKED',
          message: 'File has no git history',
        };
        fileCache.set(cacheKey, { data: null, error });
        callback(null, error);
        return;
      }

      try {
        const [hash, authorName, authorEmail, authorTime] = stdout
          .trim()
          .split('|');

        getCurrentGitUser(workspaceFolder.uri.fsPath, currentUser => {
          const isCurrentUser =
            currentUser &&
            (currentUser.email === authorEmail ||
              currentUser.name === authorName);

          const result = {
            author: isCurrentUser ? 'You' : authorName,
            time: parseInt(authorTime, 10),
            hash: hash.substring(0, 8),
          };

          fileCache.set(cacheKey, { data: result, error: null });

          if (fileCache.size > CACHE_CLEANUP_THRESHOLD) {
            const firstKey = fileCache.keys().next().value;
            fileCache.delete(firstKey);
          }

          callback(result, null);
        });
      } catch (parseError) {
        const error = {
          type: 'PARSE_ERROR',
          message: `Failed to parse git log output: ${parseError.message}`,
        };
        fileCache.set(cacheKey, { data: null, error });
        callback(null, error);
      }
    });
  } catch (error) {
    const err = {
      type: 'EXECUTION_ERROR',
      message: `Failed to execute git command: ${error.message}`,
    };
    fileCache.set(cacheKey, { data: null, error: err });
    callback(null, err);
  }
}

module.exports = {
  blameLine,
  getFullCommitMessage,
  getCurrentGitUser,
  getPRInfo,
  checkGitAvailability,
  getFileLastCommit,
};
