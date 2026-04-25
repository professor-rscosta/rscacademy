/**
 * YouTube URL utilities - handles ALL YouTube URL formats
 * Fixes error 153 by removing invalid tracking params (?si=...)
 */

export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  var clean = url.trim();
  var patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];
  for (var i = 0; i < patterns.length; i++) {
    var match = clean.match(patterns[i]);
    if (match && match[1]) return match[1];
  }
  return null;
}

export function toYouTubeEmbed(url) {
  var id = extractYouTubeId(url);
  if (!id) return null;
  return 'https://www.youtube.com/embed/' + id + '?rel=0&modestbranding=1';
}

export function getYouTubeThumbnail(url, quality) {
  var id = extractYouTubeId(url);
  if (!id) return null;
  return 'https://img.youtube.com/vi/' + id + '/' + (quality || 'mqdefault') + '.jpg';
}

export function isYouTubeUrl(url) {
  return !!extractYouTubeId(url);
}
