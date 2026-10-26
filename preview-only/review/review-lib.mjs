export function formatReviewTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso || '');
  const stamp = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
  return `${stamp} ET`;
}

export function fitReviewFrame(size, {availableWidth, maxHeight} = {}) {
  const frameWidth = Math.max(1, Number(size?.width) || 1);
  const frameHeight = Math.max(1, Number(size?.height) || 1);
  const boxWidth = Math.max(1, Number(availableWidth) || frameWidth);
  const boxHeight = Math.max(1, Number(maxHeight) || frameHeight);
  const scale = Math.max(0.12, Math.min(1, boxWidth / frameWidth, boxHeight / frameHeight));
  return {
    scale,
    frameWidth,
    frameHeight,
    clipWidth: Math.round(frameWidth * scale),
    clipHeight: Math.round(frameHeight * scale)
  };
}
