const MESSAGES: Record<string, string> = {
  sold_out: '売り切れになった商品があります。メニューを確認してください',
  item_unavailable: '選べなくなった商品があります。メニューを確認してください',
  invalid_quantity: '数量は1〜10個で選んでください',
  empty_order: '商品を選んでください',
};

export function messageForOrderError(code: string): string {
  return MESSAGES[code] ?? '注文できませんでした。もう一度お試しください';
}

/** Errors after which the menu must be refetched because an item changed. */
export function isMenuChangedError(code: string): boolean {
  return code === 'sold_out' || code === 'item_unavailable';
}
