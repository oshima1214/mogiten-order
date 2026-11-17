import type { MenuItem } from '@/lib/types';

export type MenuRow = {
  id: string;
  name: string;
  price_tickets: number;
  sort_order: number;
  image_path: string | null;
  is_visible: boolean;
  is_sold_out: boolean;
};

export const MENU_COLUMNS = 'id, name, price_tickets, sort_order, image_path, is_visible, is_sold_out';

export function mapMenuRow(r: MenuRow): MenuItem {
  return {
    id: r.id,
    name: r.name,
    priceTickets: r.price_tickets,
    sortOrder: r.sort_order,
    imagePath: r.image_path,
    isVisible: r.is_visible,
    isSoldOut: r.is_sold_out,
  };
}
