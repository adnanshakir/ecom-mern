export function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);

  const ranges = [
    ["y", 31536000],
    ["mo", 2592000],
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
  ];

  for (const [label, secondsInUnit] of ranges) {
    const value = Math.floor(seconds / secondsInUnit);
    if (value >= 1) return `${value}${label} ago`;
  }
  return "just now";
}