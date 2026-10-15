export type PaymentMethod = "cod";

export type OrderStatus = "pending";

export interface OrderInput {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
}

export interface OrderPricing {
  bookPrice: number;
  deliveryCharge: number;
  totalAmount: number;
}

export interface OrderRecord extends OrderInput, OrderPricing {
  bookId: string;
  bookTitle: string;
  currency: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderResponse {
  orderId: string;
  book: {
    id: string;
    title: string;
  };
  pricing: OrderPricing;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  /** Field-level validation errors, keyed by form field name. */
  fieldErrors?: Record<string, string>;
}
