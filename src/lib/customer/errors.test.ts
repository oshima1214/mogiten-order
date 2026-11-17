import { describe, expect, it } from 'vitest';
import { messageForOrderError } from './errors';

describe('messageForOrderError', () => {
  it.each([
    ['sold_out', '売り切れになった商品があります。メニューを確認してください'],
    ['item_unavailable', '選べなくなった商品があります。メニューを確認してください'],
    ['invalid_quantity', '数量は1〜10個で選んでください'],
    ['empty_order', '商品を選んでください'],
    ['something_else', '注文できませんでした。もう一度お試しください'],
  ])('%s', (code, message) => expect(messageForOrderError(code)).toBe(message));
});
