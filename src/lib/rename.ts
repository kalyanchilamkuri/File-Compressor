export const DEFAULT_PATTERN = '{name}-compressed';

/**
 * Builds a download name from a pattern. Tokens: {name} original name without extension,
 * {n} position in the batch (1-based). The output extension is always kept.
 */
export function applyPattern(
  pattern: string,
  originalName: string,
  outputName: string,
  n = 1,
): string {
  const dot = originalName.lastIndexOf('.');
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  const outDot = outputName.lastIndexOf('.');
  const ext = outDot > 0 ? outputName.slice(outDot) : '';
  const stem = (pattern.trim() || DEFAULT_PATTERN)
    .replaceAll('{name}', base)
    .replaceAll('{n}', String(n))
    .replace(/[\\/:*?"<>|]+/g, '-');
  return `${stem || base}${ext}`;
}
