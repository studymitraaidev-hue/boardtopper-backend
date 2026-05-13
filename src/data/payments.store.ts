import supabase from '../config/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredPayment {
  id: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'pending';
  plan: 'monthly' | 'yearly';
  createdAt: Date;
  updatedAt: Date;
}

// ─── DB row → TS model ────────────────────────────────────────────────────────

interface PaymentRow {
  id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'pending';
  plan: 'monthly' | 'yearly';
  created_at: string;
  updated_at: string;
}

function toStoredPayment(row: PaymentRow): StoredPayment {
  return {
    id:                row.id,
    userId:            row.user_id,
    razorpayOrderId:   row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id ?? undefined,
    amount:            row.amount,
    currency:          row.currency,
    status:            row.status,
    plan:              row.plan,
    createdAt:         new Date(row.created_at),
    updatedAt:         new Date(row.updated_at),
  };
}

// ─── Store Functions ──────────────────────────────────────────────────────────

export async function createPaymentRecord(data: {
  userId: string;
  razorpayOrderId: string;
  amount: number;
  plan: 'monthly' | 'yearly';
}): Promise<StoredPayment> {
  const { data: row, error } = await supabase
    .from('payments')
    .insert({
      user_id:           data.userId,
      razorpay_order_id: data.razorpayOrderId,
      amount:            data.amount,
      currency:          'INR',
      status:            'created',
      plan:              data.plan,
    })
    .select()
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? 'Failed to create payment record');
  }

  return toStoredPayment(row as PaymentRow);
}

export async function getPaymentByOrderId(
  orderId: string
): Promise<StoredPayment | undefined> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('razorpay_order_id', orderId)
    .single();

  if (error || !data) return undefined;
  return toStoredPayment(data as PaymentRow);
}

export async function updatePaymentStatus(
  orderId: string,
  paymentId: string,
  status: 'paid' | 'failed' | 'pending'
): Promise<StoredPayment | undefined> {
  const { data, error } = await supabase
    .from('payments')
    .update({
      razorpay_payment_id: paymentId,
      status,
    })
    .eq('razorpay_order_id', orderId)
    .select()
    .single();

  if (error || !data) return undefined;
  return toStoredPayment(data as PaymentRow);
}

export async function getPaymentsByUser(
  userId: string
): Promise<StoredPayment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as PaymentRow[]).map(toStoredPayment);
}

export async function getPaymentById(
  id: string
): Promise<StoredPayment | undefined> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;
  return toStoredPayment(data as PaymentRow);
}
