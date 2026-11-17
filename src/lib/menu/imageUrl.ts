export const MENU_IMAGE_BUCKET = 'menu-images';

export function menuImageUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MENU_IMAGE_BUCKET}/${path}`;
}
