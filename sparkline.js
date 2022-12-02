const SPARKLINE_CHARS = '▁▂▃▄▅▆▇█';

/**
 * @param series {number[]} array of numbers.
 * @return string corresponding to a sparkline representation of the series.
 */
export function seriesToSparklineString(series) {
  // First, bucket each value in the series into one of 8 buckets, corresponding
  // to the resolution of the sparkline graph.
  const min = Math.min(...series);
  const max = Math.max(...series);
  // Normalized is [0-1].
  const normalized = series.map(val => (val - min) / (max - min));
  const bucketed = normalized.map(norm =>
    Math.floor(norm * (SPARKLINE_CHARS.length - 1)));
  const sparkline = bucketed.map(bucket => SPARKLINE_CHARS[bucket]).join('');
  // console.log(bucketed.length, sparkline.length);

  return sparkline;
}