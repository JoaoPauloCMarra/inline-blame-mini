const vscode = require('vscode');
const { CONFIG_SECTION } = require('./constants');

let cachedSettings = null;

function createGlobMatcher(pattern) {
  const normalizedPattern = pattern.replaceAll('\\', '/');
  if (normalizedPattern === '**/*' || normalizedPattern === '*') {
    return () => true;
  }

  if (!normalizedPattern.includes('*') && !normalizedPattern.includes('?')) {
    return filePath => filePath.includes(normalizedPattern);
  }

  let regex = '';
  for (let index = 0; index < normalizedPattern.length; index++) {
    const character = normalizedPattern[index];
    if (character === '*' && normalizedPattern[index + 1] === '*') {
      if (normalizedPattern[index + 2] === '/') {
        regex += '(?:.*/)?';
        index += 2;
      } else {
        regex += '.*';
        index += 1;
      }
    } else if (character === '*') {
      regex += '[^/]*';
    } else if (character === '?') {
      regex += '[^/]';
    } else {
      regex += character.replace(/[|\\{}()[\]^$+?.-]/g, '\\$&');
    }
  }

  const matcher = new RegExp(`^${regex}$`);
  return filePath => matcher.test(filePath);
}

function getConfig() {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

function readSettings() {
  const config = getConfig();
  const includeFiles = config.get('includeFiles', ['**/*']);
  const excludeFiles = config.get('excludeFiles', []);

  return {
    enabled: config.get('enabled', true),
    format: config.get('format', '{author}, {timeAgo} • {summary}'),
    summaryMaxLength: Math.max(
      10,
      Math.min(200, config.get('summaryMaxLength', 60))
    ),
    style: {
      color: config.get('style.color', 'rgba(136, 136, 136, 0.7)'),
      fontStyle: config.get('style.fontStyle', 'italic'),
      fontSize: config.get('style.fontSize', '0.9em'),
      margin: config.get('style.margin', '0 0 0 1rem'),
      position: config.get('style.position', 'end-of-line'),
    },
    statusBarEnabled: config.get('statusBar.enabled', true),
    includeFiles,
    excludeFiles,
    includeMatchers: includeFiles.map(createGlobMatcher),
    excludeMatchers: excludeFiles.map(createGlobMatcher),
  };
}

function getSettings() {
  if (!cachedSettings) {
    cachedSettings = readSettings();
  }

  return cachedSettings;
}

function clearCache() {
  cachedSettings = null;
}

async function update(
  key,
  value,
  configurationTarget = vscode.ConfigurationTarget.Workspace
) {
  const config = getConfig();
  await config.update(key, value, configurationTarget);
  clearCache();
}

function isEnabled() {
  return getSettings().enabled;
}

function getFormat() {
  return getSettings().format;
}

function getSummaryMaxLength() {
  return getSettings().summaryMaxLength;
}

function getStyleConfig() {
  return getSettings().style;
}

function getStatusBarConfig() {
  return {
    enabled: getSettings().statusBarEnabled,
  };
}

function getFileFilters() {
  const settings = getSettings();
  return {
    include: settings.includeFiles,
    exclude: settings.excludeFiles,
  };
}

function shouldProcessFile(filePath) {
  const settings = getSettings();
  const relativePath = vscode.workspace
    .asRelativePath(filePath, false)
    .replaceAll('\\', '/');

  const isIncluded = settings.includeMatchers.some(matches =>
    matches(relativePath)
  );
  const isExcluded = settings.excludeMatchers.some(matches =>
    matches(relativePath)
  );

  return isIncluded && !isExcluded;
}

function formatBlameText(data, template = null) {
  const format = template || getFormat();

  return format
    .replaceAll('{author}', data.author || 'Unknown')
    .replaceAll('{timeAgo}', data.timeAgo || 'unknown time')
    .replaceAll('{summary}', data.summary || 'No message')
    .replaceAll('{hash}', data.hash || '');
}

module.exports = {
  clearCache,
  update,
  isEnabled,
  getFormat,
  getSummaryMaxLength,
  getStyleConfig,
  getStatusBarConfig,
  getFileFilters,
  shouldProcessFile,
  formatBlameText,
  CONFIG_SECTION,
};
