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

test('thug clothing gains distinct variants without losing shade or alpha', () => {
  for (const [kind, original] of [
    ['thug', [190, 35, 45, 255, 90, 15, 20, 128]],
  ]) {
    const one = shiftClothingPixels(new Uint8ClampedArray(original), kind, 1);
    const two = shiftClothingPixels(new Uint8ClampedArray(original), kind, 2);
    assert.notDeepEqual([...one], original);
    assert.notDeepEqual([...one], [...two]);
    assert.equal(one[3], 255); assert.equal(one[7], 128);
    assert.ok(Math.max(...one.slice(0, 3)) > Math.max(...one.slice(4, 7)));
  }
});

test('Yankee jacket uses one palette for every variant and both teal/blue source shades',()=>{
  const source=[20,130,120,255,20,90,120,255,10,65,60,128];
  const base=shiftClothingPixels(new Uint8ClampedArray(source),'yankee',0);
  for(const variant of [1,2])assert.deepEqual(shiftClothingPixels(new Uint8ClampedArray(source),'yankee',variant),base);
  assert.equal(base[3],255);assert.equal(base[11],128);
  assert.ok(Math.max(...base.slice(0,3))>Math.max(...base.slice(8,11)));
  assert.ok(Math.abs(base[1]/base[2]-base[5]/base[6])<.02);
});

test('original palette and unsupported enemy styles stay unchanged', () => {
  for (const [kind, variant] of [['thug', 0], ['boss', 1], ['brute', 2]]) {
    const pixels = new Uint8ClampedArray([180, 20, 30, 255]);
    shiftClothingPixels(pixels, kind, variant);
    assert.deepEqual([...pixels], [180, 20, 30, 255]);
  }
});
