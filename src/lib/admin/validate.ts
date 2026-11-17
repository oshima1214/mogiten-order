export type Valid<T> = { ok: true; value: T } | { ok: false; error: string };

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Vercel rejects request bodies over 4.5MB
export const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function validName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const name = input.trim();
  return name.length >= 1 && [...name].length <= 30 ? name : null;
}

export function validateItemName(input: unknown): Valid<string> {
  const name = validName(input);
  return name ? { ok: true, value: name } : { ok: false, error: '商品名は1〜30文字で入力してください' };
}

export function validatePriceTickets(input: unknown): Valid<number> {
  return typeof input === 'number' && Number.isInteger(input) && input >= 1 && input <= 99
    ? { ok: true, value: input }
    : { ok: false, error: '金券の枚数は1〜99の整数で入力してください' };
}

export function validateMenuInput(input: { name?: unknown; priceTickets?: unknown }): Valid<{
  name: string;
  priceTickets: number;
}> {
  const name = validateItemName(input.name);
  if (!name.ok) return name;
  const price = validatePriceTickets(input.priceTickets);
  if (!price.ok) return price;
  return { ok: true, value: { name: name.value, priceTickets: price.value } };
}

export function validateShopName(input: unknown): Valid<string> {
  const name = validName(input);
  return name ? { ok: true, value: name } : { ok: false, error: '店名は1〜30文字で入力してください' };
}

export function validateImage(file: { type: string; size: number }): string | null {
  if (!(file.type in IMAGE_TYPES)) return 'JPEG・PNG・WebPの画像を選んでください';
  if (file.size > MAX_IMAGE_BYTES) return '画像は4MB以下にしてください';
  return null;
}
