const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_GIT_ROOT_CACHE_SIZE } = require('./constants');

class LRUCache {
  constructor(limit = 100) {
    this.limit = Math.max(1, limit);
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    this.#evict();
    return this;
  }

  clear() {
    this.map.clear();
  }

  #evict() {
    while (this.map.size > this.limit) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }
}

const gitRootCache = new LRUCache(DEFAULT_GIT_ROOT_CACHE_SIZE);

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
  const absoluteFilePath = path.resolve(filePath);
  const cached = gitRootCache.get(absoluteFilePath);
  if (cached !== undefined) {
    return cached;
  }

  try {
    let currentDir = path.dirname(absoluteFilePath);
    let result = null;

    while (true) {
      if (isGitRepository(currentDir)) {
        result = currentDir;
        break;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }

      currentDir = parentDir;
    }

    if (result) {
      gitRootCache.set(absoluteFilePath, result);
    }

    return result;
  } catch (error) {
    return null;
  }
}

function isValidLinePosition(editor, line) {
  if (!editor || !editor.document) return false;
  const lineIndex = line - 1;
  return lineIndex >= 0 && lineIndex < editor.document.lineCount;
}

module.exports = {
  relativeTime,
  trimSummary,
  debounce,
  findGitRoot,
  isValidLinePosition,
  LRUCache,
};
