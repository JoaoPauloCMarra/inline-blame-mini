const vscode = require('vscode');
const { CONFIG_SECTION } = require('./constants');

function toPosix(p) {
  return (p || '').replace(/\\/g, '/');
}

function simpleGlobMatch(pattern, str) {
  const pat = toPosix(pattern || '').replace(/^\.\//, '');
  const s = toPosix(str || '');

  if (pat === '**/*' || pat === '*') return true;
  if (!pat.includes('*') && !pat.includes('?')) return s.includes(pat);

  const regex = pat
    .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');

  return new RegExp(`^${regex}$`).test(s);
}

function getConfig() {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

function get(key, defaultValue = undefined) {
  const config = getConfig();
  return config.get(key, defaultValue);
}

function update(
  key,
  value,
  configurationTarget = vscode.ConfigurationTarget.Workspace
) {
  const config = getConfig();
  return config.update(key, value, configurationTarget);
}

function isEnabled() {
  return get('enabled', true);
}

function getDelay() {
  return Math.max(0, Math.min(2000, get('delay', 100)));
}

function getFormat() {
  return get('format', '{author}, {timeAgo} • {summary}');
}

function getSummaryMaxLength() {
  return Math.max(10, Math.min(200, get('summaryMaxLength', 60)));
}

function shouldShowOnlyWhenChanged() {
  return get('showOnlyWhenChanged', true);
}

function getStyleConfig() {
  return {
    color: get('style.color', 'rgba(136, 136, 136, 0.7)'),
    fontStyle: get('style.fontStyle', 'italic'),
    fontSize: get('style.fontSize', '0.9em'),
    margin: get('style.margin', '0 0 0 1rem'),
    position: get('style.position', 'end-of-line'),
  };
}

function getStatusBarConfig() {
  return {
    enabled: get('statusBar.enabled', true),
  };
}

function getFileFilters() {
  return {
    include: get('includeFiles', ['**/*']),
    exclude: get('excludeFiles', []),
  };
}

function shouldProcessFile(filePath) {
  const filters = getFileFilters();

  const isIncluded = filters.include.some(pattern =>
    simpleGlobMatch(pattern, filePath)
  );

  const isExcluded = filters.exclude.some(pattern =>
    simpleGlobMatch(pattern, filePath)
  );

  return isIncluded && !isExcluded;
}

function formatBlameText(data, template = null) {
  const format = template || getFormat();
  const prText = data.prNumber ? ` via PR #${data.prNumber}` : '';

  return format
    .replace('{author}', data.author || 'Unknown')
    .replace('{timeAgo}', data.timeAgo || 'unknown time')
    .replace('{summary}', data.summary || 'No message')
    .replace('{hash}', data.hash || '')
    .replace('{prNumber}', data.prNumber || '')
    .replace('{pr}', prText);
}

function onConfigurationChanged(callback) {
  return vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration(CONFIG_SECTION)) {
      callback(event);
    }
  });
}

module.exports = {
  get,
  update,
  isEnabled,
  getDelay,
  getFormat,
  getSummaryMaxLength,
  shouldShowOnlyWhenChanged,
  getStyleConfig,
  getStatusBarConfig,
  getFileFilters,
  shouldProcessFile,
  formatBlameText,
  onConfigurationChanged,
  CONFIG_SECTION,
};
