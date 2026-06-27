/**
 * paymentService.ts — Day 6
 *
 * Centralises all payment-related API calls.
 * Frontend must NEVER unlock Pro based only on a Razorpay callback —
 * it must always confirm with the backend subscription-status endpoint.
 */

import { api } from '../utils/api';

export interface SubscriptionStatus {
  plan: 'free' | 'pro';
  isPro: boolean;
  subscription: {
    id: string;
    plan: 'monthly' | 'yearly';
    status: 'active' | 'cancelled' | 'expired' | 'failed' | 'pending';
    endsAt: string;
  } | null;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: string;
}

export interface VerifyPaymentResponse {
  token: string;
  message: string;
  plan: string;
}

/**
 * Fetch authoritative subscription state from backend.
 * Call this after every payment attempt to confirm Pro access.
 */
export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  return api.get<SubscriptionStatus>('/api/payments/subscription-status');
}

/**
 * Create a Razorpay order on the backend.
 * Amount is server-determined — never passed from frontend.
 */
export async function createPaymentOrder(
  plan: 'monthly' | 'yearly'
): Promise<CreateOrderResponse> {
  return api.post<CreateOrderResponse>('/api/payments/create-order', { plan });
}

/**
 * Submit payment verification to backend after Razorpay checkout completes.
 * Returns a new JWT with plan: 'pro' if verification succeeds.
 */
export async function verifyPayment(data: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<VerifyPaymentResponse> {
  return api.post<VerifyPaymentResponse>('/api/payments/verify', data);
}

/**
 * Cancel the current Pro subscription.
 * User retains Pro access until ends_at; plan downgrade happens automatically via cron.
 */
export async function cancelSubscription(): Promise<{ message: string; endsAt: string }> {
  return api.post('/api/payments/cancel-subscription', {});
}
