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
  if (summary.length <= maxLength) return summary;
  return summary.substring(0, maxLength - 1) + '…';
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

module.exports = {
  relativeTime,
  trimSummary,
  debounce,
};
