const vscode = require('vscode');
const { execFile } = require('child_process');

const userCache = new Map();

function blameLine(file, line, callback) {
  try {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(file)
    );
    if (!workspaceFolder) {
      callback(null);
      return;
    }

    const opts = { cwd: workspaceFolder.uri.fsPath };
    const args = [
      'blame',
      `-L`,
      `${line},${line}`,
      '--line-porcelain',
      '--',
      file,
    ];

    execFile('git', args, opts, (err, stdout, stderr) => {
      if (err || !stdout || stderr) {
        callback(null);
        return;
      }

      try {
        const lines = stdout.trim().split('\n');
        if (lines.length === 0) {
          callback(null);
          return;
        }

        const firstLine = lines[0];
        if (!firstLine) {
          callback(null);
          return;
        }

        const hash = firstLine.split(' ')[0];
        if (!hash || hash.length < 8) {
          callback(null);
          return;
        }

        if (hash.startsWith('00000000')) {
          callback({
            author: 'You',
            time: Date.now() / 1000,
            summary: 'Not committed yet',
            hash: 'uncommitted',
            isUncommitted: true,
          });
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

        getCurrentGitUser(workspaceFolder.uri.fsPath, currentUser => {
          const isCurrentUser =
            currentUser &&
            (currentUser.email === authorEmail || currentUser.name === author);

          getPRInfo(workspaceFolder.uri.fsPath, hash, prData => {
            if (prData && prData.title) {
              callback({
                author: isCurrentUser ? 'You' : author,
                time: authorTime,
                summary: prData.title,
                hash: hash.substring(0, 8),
                prNumber: prData.number,
              });
            } else {
              getFullCommitMessage(
                workspaceFolder.uri.fsPath,
                hash,
                fullMessage => {
                  const displaySummary =
                    fullMessage || summary || 'No commit message';
                  callback({
                    author: isCurrentUser ? 'You' : author,
                    time: authorTime,
                    summary: displaySummary,
                    hash: hash.substring(0, 8),
                    prNumber: null,
                  });
                }
              );
            }
          });
        });
      } catch (parseError) {
        callback(null);
      }
    });
  } catch (error) {
    callback(null);
  }
}

function getFullCommitMessage(cwd, hash, callback) {
  const args = ['log', '--format=%s', '-n', '1', hash];
  execFile('git', args, { cwd }, (err, stdout) => {
    callback(err || !stdout ? null : stdout.trim());
  });
}

function getCurrentGitUser(cwd, callback) {
  if (userCache.has(cwd)) {
    callback(userCache.get(cwd));
    return;
  }

  const getUserName = new Promise(resolve => {
    execFile('git', ['config', 'user.name'], { cwd }, (err, stdout) => {
      resolve(err ? null : stdout.trim());
    });
  });

  const getUserEmail = new Promise(resolve => {
    execFile('git', ['config', 'user.email'], { cwd }, (err, stdout) => {
      resolve(err ? null : stdout.trim());
    });
  });

  Promise.all([getUserName, getUserEmail]).then(([name, email]) => {
    const user = name && email ? { name, email } : null;
    userCache.set(cwd, user);
    callback(user);
  });
}

function getPRInfo(cwd, hash, callback) {
  const args = ['log', '--format=%s', '-n', '1', hash];

  execFile('git', args, { cwd }, (err, stdout) => {
    if (err || !stdout) {
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
            callback({ title: prTitle, number: prNumber });
            return;
          }
        }
        if (prNumber) {
          callback({ title: commitMessage, number: prNumber });
          return;
        }
      }
    }

    callback(null);
  });
}

function checkGitAvailability(callback) {
  execFile('git', ['--version'], err => {
    callback(!err);
  });
}

module.exports = {
  blameLine,
  getFullCommitMessage,
  getCurrentGitUser,
  getPRInfo,
  checkGitAvailability,
};
