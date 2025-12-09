const CACHE_ENABLED = true;
const CACHE_MAX_SIZE = 500;

const UNCOMMITTED_HASH_PREFIX = '00000000';

const IGNORE_EMPTY_LINES = true;

const DEFAULT_GIT_ROOT_CACHE_SIZE = 100;

const CONFIG_SECTION = 'inline-blame-mini';

const DEBOUNCE_DELAY = 75;
const SAVE_DEBOUNCE_DELAY = 25;
const CHANGE_DEBOUNCE_DELAY = 150;

const GIT_TIMEOUT_MS = 5000;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_LINES = 50000;

const PREFETCH_LINE_RADIUS = 5;

const STATUS_STATES = {
  DISABLED: { icon: '$(eye-closed)', priority: 1 },
  ERROR: { icon: '$(error)', priority: 2 },
  WARNING: { icon: '$(warning)', priority: 3 },
  PROCESSING: { icon: '$(sync~spin)', priority: 4 },
  INFO: { icon: '$(info)', priority: 5 },
  SUCCESS: { icon: '$(check)', priority: 6 },
  EDIT: { icon: '$(edit)', priority: 7 },
  NEW_FILE: { icon: '$(new-file)', priority: 8 },
};

module.exports = {
  CACHE_ENABLED,
  CACHE_MAX_SIZE,
  UNCOMMITTED_HASH_PREFIX,
  IGNORE_EMPTY_LINES,
  DEFAULT_GIT_ROOT_CACHE_SIZE,
  CONFIG_SECTION,
  DEBOUNCE_DELAY,
  SAVE_DEBOUNCE_DELAY,
  CHANGE_DEBOUNCE_DELAY,
  GIT_TIMEOUT_MS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_LINES,
  PREFETCH_LINE_RADIUS,
  STATUS_STATES,
};
