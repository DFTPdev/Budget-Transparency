// Minimal order mock data

export const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

export const _orders = [
  {
    id: 'order-1',
    orderNumber: 'ORD-001',
    status: 'completed',
    totalAmount: 99.99,
    createdAt: new Date(),
  },
];

export const _order = _orders[0];
