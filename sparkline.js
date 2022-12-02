const SPARKLINE_CHARS = '▁▂▃▄▅▆▇█';

/**
 * @param series {number[]} array of numbers.
 * @return string corresponding to a sparkline representation of the series.
 */
export function sparkline(series) {
  // First, bucket each value in the series into one of 8 buckets, corresponding
  // to the resolution of the sparkline graph.
  const min = Math.min(...series);
  const max = Math.max(...series);
  // Normalized is [0-1].
  const normalized = series.map(val => (val - min) / (max - min));
  const bucketed = normalized.map(norm =>
    Math.round(norm * (SPARKLINE_CHARS.length - 1)));
  const sparkline = bucketed.map(bucket => SPARKLINE_CHARS[bucket]).join('');
  // console.log(bucketed.length, sparkline.length);

  return sparkline;
}

/**
 * @param {number[]} series
 * @returns [min, max, mean] of the series.
 */
export function distinfo(series) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const mean = arrayMean(series);
  return {min, max, mean};
}

export function arrayMean(array) {
  return array.reduce((a, b) => a + b) / array.length;
}

export function isSuperLinearlyIncreasing(array) {
  let lastDelta = -Infinity;
  for (let i = 0; i < array.length - 1; i++) {
    const curr = array[i];
    const next = array[i + 1];
    const delta = next - curr;
    if (delta <= lastDelta) {
      return false;
    }
    lastDelta = delta;
  }
  return true;
}

export function isStrictlyDecreasing(array) {
  let lastDelta = -Infinity;
  for (let i = 0; i < array.length - 1; i++) {
    const curr = array[i];
    const next = array[i + 1];
    const delta = next - curr;
    if (delta > 0) {
      return false;
    }
  }
  return true;
}