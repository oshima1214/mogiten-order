import { describe, expect, it } from 'vitest';
import { validateImage, validateMenuInput, validateShopName } from './validate';

const NAME_ERR = '商品名は1〜30文字で入力してください';
const PRICE_ERR = '金券の枚数は1〜99の整数で入力してください';

describe('validateMenuInput', () => {
  it('trims the name', () =>
    expect(validateMenuInput({ name: '  焼きそば ', priceTickets: 3 })).toEqual({
      ok: true,
      value: { name: '焼きそば', priceTickets: 3 },
    }));

  it.each(['', '   ', 'あ'.repeat(31), 5, undefined])('rejects name %j', (name) =>
    expect(validateMenuInput({ name, priceTickets: 3 })).toEqual({ ok: false, error: NAME_ERR }));

  it('accepts a 30 character name', () =>
    expect(validateMenuInput({ name: 'あ'.repeat(30), priceTickets: 1 }).ok).toBe(true));

  it.each([0, 100, 1.5, '3', undefined, Number.NaN])('rejects priceTickets %j', (priceTickets) =>
    expect(validateMenuInput({ name: '焼きそば', priceTickets })).toEqual({ ok: false, error: PRICE_ERR }));

  it('accepts 1 and 99', () => {
    expect(validateMenuInput({ name: 'a', priceTickets: 1 }).ok).toBe(true);
    expect(validateMenuInput({ name: 'a', priceTickets: 99 }).ok).toBe(true);
  });
});

describe('validateImage', () => {
  it('rejects other formats', () =>
    expect(validateImage({ type: 'image/gif', size: 100 })).toBe('JPEG・PNG・WebPの画像を選んでください'));
  it('rejects files over 5MB', () =>
    expect(validateImage({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toBe('画像は5MB以下にしてください'));
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) =>
    expect(validateImage({ type, size: 1024 })).toBeNull());
});

describe('validateShopName', () => {
  it('trims and accepts', () => expect(validateShopName(' 3年1組 ')).toEqual({ ok: true, value: '3年1組' }));
  it.each(['', '  ', 'あ'.repeat(31), null])('rejects %j', (v) =>
    expect(validateShopName(v)).toEqual({ ok: false, error: '店名は1〜30文字で入力してください' }));
});
