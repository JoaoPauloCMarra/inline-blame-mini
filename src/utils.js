const path = require('path');
const fs = require('fs');

const gitRootCache = new Map();
const DEFAULT_GIT_ROOT_CACHE_SIZE = 50;

function relativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const years = Math.floor(days / 365);

  if (years > 0) return years === 1 ? '1 year ago' : `${years} years ago`;
  if (days > 0) return days === 1 ? '1 day ago' : `${days} days ago`;
  if (hours > 0) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (minutes > 0) return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
  return 'just now';
}

function trimSummary(summary, maxLength) {
  if (!summary || summary.length <= maxLength) return summary || '';
  return summary.substring(0, maxLength - 1) + '…';
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

function isGitRepository(folderPath) {
  try {
    const gitPath = path.join(folderPath, '.git');
    const stat = fs.statSync(gitPath);
    return stat.isDirectory() || stat.isFile();
  } catch (error) {
    return false;
  }
}

function findGitRoot(filePath) {
  const cached = gitRootCache.get(filePath);
  if (cached !== undefined) {
    return cached;
  }

  try {
    let currentDir = path.dirname(filePath);
    const root = path.parse(currentDir).root;
    let result = null;

    while (currentDir !== root) {
      if (isGitRepository(currentDir)) {
        result = currentDir;
        break;
      }
      currentDir = path.dirname(currentDir);
    }

    gitRootCache.set(filePath, result);

    if (gitRootCache.size > DEFAULT_GIT_ROOT_CACHE_SIZE) {
      const firstKey = gitRootCache.keys().next().value;
      gitRootCache.delete(firstKey);
    }

    return result;
  } catch (error) {
    gitRootCache.set(filePath, null);
    return null;
  }
}

function getFileRelativeToGit(filePath) {
  const gitRoot = findGitRoot(filePath);
  if (!gitRoot) return null;

  try {
    return path.relative(gitRoot, filePath);
  } catch (error) {
    return null;
  }
}

function validateLinePosition(editor, line) {
  if (!editor || !editor.document) {
    return { valid: false, error: 'No active editor' };
  }

  const lineIndex = line - 1;
  if (lineIndex < 0) {
    return { valid: false, error: 'Line number cannot be negative' };
  }

  if (lineIndex >= editor.document.lineCount) {
    return { valid: false, error: 'Line number exceeds document length' };
  }

  return { valid: true };
}

module.exports = {
  relativeTime,
  trimSummary,
  debounce,
  isGitRepository,
  findGitRoot,
  getFileRelativeToGit,
  validateLinePosition,
};
