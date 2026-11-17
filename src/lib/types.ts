export type OrderStatus = 'cooking' | 'ready' | 'delivered' | 'cancelled';

export type MenuItem = {
  id: string;
  name: string;
  priceTickets: number;
  sortOrder: number;
  imagePath: string | null;
  isVisible: boolean;
  isSoldOut: boolean;
};

export type OrderLine = { name: string; quantity: number };

export type MyOrder = {
  number: number;
  status: OrderStatus;
  items: OrderLine[];
  totalTickets: number;
  aheadCount: number;
  waitingTotal: number;
};

export type StaffOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  createdAt: string;
  readyAt: string | null;
  items: OrderLine[];
  totalTickets: number;
};

export type SalesSummary = {
  ticketsTotal: number;
  deliveredCount: number;
  cancelledCount: number;
  items: { name: string; quantity: number; tickets: number }[];
  dates: string[];
};

export type StaffAction = 'complete' | 'deliver' | 'revert' | 'cancel';
