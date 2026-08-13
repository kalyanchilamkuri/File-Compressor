import { describe, expect, it } from 'vitest';
import {
  compressedName,
  formatBytes,
  formatDuration,
  parseSize,
  percentSaved,
  uniqueNames,
} from '../../src/lib/format';
import { applyPattern } from '../../src/lib/rename';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [100 * 1024, '100 KB'],
    [19.1 * 1024 * 1024, '19.1 MB'],
    [3 * 1024 ** 3, '3 GB'],
  ])('%d → %s', (n, s) => expect(formatBytes(n)).toBe(s));

  it('handles bad input', () => {
    expect(formatBytes(-1)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
  });
});

describe('percentSaved', () => {
  it('rounds the saving', () => expect(percentSaved(1000, 180)).toBe(82));
  it('is negative when the file grew', () => expect(percentSaved(100, 150)).toBe(-50));
  it('is 0 for empty input', () => expect(percentSaved(0, 0)).toBe(0));
});

describe('parseSize', () => {
  it.each([
    ['100', 'KB', 100 * 1024],
    ['100kb', 'MB', 100 * 1024],
    ['1.5 MB', 'KB', 1.5 * 1024 * 1024],
    ['2,5', 'MB', 2.5 * 1024 * 1024],
    ['500 b', 'KB', 500],
  ] as const)('%s (%s) → %d', (input, unit, bytes) => expect(parseSize(input, unit)).toBe(bytes));

  it('rejects nonsense and zero', () => {
    expect(parseSize('abc')).toBeNull();
    expect(parseSize('0')).toBeNull();
    expect(parseSize('-5')).toBeNull();
  });
});

describe('names', () => {
  it('adds -compressed and swaps the extension', () => {
    expect(compressedName('photo.large.JPG', 'webp')).toBe('photo.large-compressed.webp');
    expect(compressedName('scan.pdf')).toBe('scan-compressed.pdf');
    expect(compressedName('README')).toBe('README-compressed');
  });

  it('makes ZIP entry names unique, case-insensitively', () => {
    expect(uniqueNames(['a.jpg', 'A.jpg', 'a.jpg', 'dir/b.png', 'dir/b.png'])).toEqual([
      'a.jpg',
      'A (2).jpg',
      'a (3).jpg',
      'dir/b.png',
      'dir/b (2).png',
    ]);
  });

  it('applies rename patterns and keeps the output extension', () => {
    expect(applyPattern('{name}-web', 'IMG_1.HEIC', 'IMG_1-compressed.jpg')).toBe('IMG_1-web.jpg');
    expect(applyPattern('trip-{n}', 'a.png', 'a-compressed.png', 7)).toBe('trip-7.png');
    expect(applyPattern('a/b:c', 'x.jpg', 'x-compressed.jpg')).toBe('a-b-c.jpg');
    expect(applyPattern('', 'x.jpg', 'x-compressed.jpg')).toBe('x-compressed.jpg');
  });

  it('formats durations', () => {
    expect(formatDuration(42)).toBe('42s');
    expect(formatDuration(125)).toBe('2m 05s');
    expect(formatDuration(3700)).toBe('1h 01m');
  });
});
