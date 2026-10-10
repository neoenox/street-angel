const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shiftClothingPixels } = require('../visual-style.js');

test('palette swaps keep skin, whites, outlines and transparent pixels intact', () => {
  for (const kind of ['thug', 'yankee']) {
    const original = [230, 175, 135, 255, 240, 240, 235, 255, 15, 12, 20, 255, 200, 30, 30, 0];
    const pixels = new Uint8ClampedArray(original);
    shiftClothingPixels(pixels, kind, 1);
    assert.deepEqual([...pixels], original);
  }
});

test('red and teal clothing gain distinct variants without losing shade or alpha', () => {
  for (const [kind, original] of [
    ['thug', [190, 35, 45, 255, 90, 15, 20, 128]],
    ['yankee', [20, 130, 120, 255, 10, 65, 60, 128]],
  ]) {
    const one = shiftClothingPixels(new Uint8ClampedArray(original), kind, 1);
    const two = shiftClothingPixels(new Uint8ClampedArray(original), kind, 2);
    assert.notDeepEqual([...one], original);
    assert.notDeepEqual([...one], [...two]);
    assert.equal(one[3], 255); assert.equal(one[7], 128);
    assert.ok(Math.max(...one.slice(0, 3)) > Math.max(...one.slice(4, 7)));
  }
});

test('original palette and unsupported enemy styles stay unchanged', () => {
  for (const [kind, variant] of [['thug', 0], ['boss', 1], ['brute', 2]]) {
    const pixels = new Uint8ClampedArray([180, 20, 30, 255]);
    shiftClothingPixels(pixels, kind, variant);
    assert.deepEqual([...pixels], [180, 20, 30, 255]);
  }
});
