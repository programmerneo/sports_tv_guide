/**
 * Tests for color utility functions used in the predictor bar
 */

import {
  parseHex,
  colorDistance,
  lightenColor,
  ensureContrastingColors,
} from '../BoxScoreModal';

describe('parseHex', () => {
  it('parses hex with # prefix', () => {
    expect(parseHex('#ff0000')).toEqual([255, 0, 0]);
  });

  it('parses hex without # prefix', () => {
    expect(parseHex('003087')).toEqual([0, 48, 135]);
  });

  it('parses black', () => {
    expect(parseHex('#000000')).toEqual([0, 0, 0]);
  });

  it('parses white', () => {
    expect(parseHex('#ffffff')).toEqual([255, 255, 255]);
  });
});

describe('colorDistance', () => {
  it('returns 0 for identical colors', () => {
    expect(colorDistance('#003087', '#003087')).toBe(0);
  });

  it('returns max distance for black vs white', () => {
    const dist = colorDistance('#000000', '#ffffff');
    expect(dist).toBeCloseTo(Math.sqrt(255 ** 2 * 3), 5);
  });

  it('returns small distance for similar dark blues', () => {
    // These are the colors from the original bug report
    const dist = colorDistance('#092C5C', '#0C2340');
    expect(dist).toBeLessThan(80);
  });

  it('returns large distance for distinct colors', () => {
    const dist = colorDistance('#ff0000', '#0000ff');
    expect(dist).toBeGreaterThan(80);
  });
});

describe('lightenColor', () => {
  it('returns original color when amount is 0', () => {
    expect(lightenColor('#003087', 0)).toBe('#003087');
  });

  it('returns white when amount is 1', () => {
    expect(lightenColor('#003087', 1)).toBe('#ffffff');
  });

  it('lightens a dark color by 50%', () => {
    const result = lightenColor('#000000', 0.5);
    // Each channel: 0 + (255 - 0) * 0.5 = 128 (rounded) = 0x80
    expect(result).toBe('#808080');
  });

  it('preserves # prefix in output', () => {
    expect(lightenColor('#112233', 0.1)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('ensureContrastingColors', () => {
  it('returns original colors when already distinct', () => {
    const [away, home] = ensureContrastingColors('#ff0000', '#0000ff');
    expect(away).toBe('#ff0000');
    expect(home).toBe('#0000ff');
  });

  it('lightens away color when colors are too similar', () => {
    // Similar dark blues from the bug report
    const [away, home] = ensureContrastingColors('#092C5C', '#0C2340');
    // Away should be lightened, home unchanged
    expect(home).toBe('#0C2340');
    expect(away).not.toBe('#092C5C');
  });

  it('does not modify home color', () => {
    const [, home] = ensureContrastingColors('#111111', '#121212');
    expect(home).toBe('#121212');
  });

  it('produces colors that are more distinguishable after adjustment', () => {
    const awayOrig = '#092C5C';
    const homeOrig = '#0C2340';
    const origDist = colorDistance(awayOrig, homeOrig);
    const [awayNew, homeNew] = ensureContrastingColors(awayOrig, homeOrig);
    const newDist = colorDistance(awayNew, homeNew);
    expect(newDist).toBeGreaterThan(origDist);
  });
});
