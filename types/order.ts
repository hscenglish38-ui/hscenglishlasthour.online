export type PaymentMethod = "cod";

export type OrderStatus = "pending";

export interface OrderInput {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  /** Number of books ordered, an integer from 1 to 20. */
  quantity: number;
}

export interface OrderPricing {
  /** Unit price charged per book (offer price when set). */
  unitPrice: number;
  /** Number of books ordered. */
  quantity: number;
  /** `unitPrice * quantity`. */
  subtotal: number;
  /** Delivery charge applied once per order. */
  deliveryCharge: number;
  /** `subtotal + deliveryCharge`. */
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
