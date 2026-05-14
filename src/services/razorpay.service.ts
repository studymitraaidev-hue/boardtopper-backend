import crypto from 'crypto';
import config from '../config/env';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBasicAuthHeader(): string {
  const credentials = `${config.RAZORPAY_KEY_ID}:${config.RAZORPAY_KEY_SECRET}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Creates a Razorpay order via the REST API.
 * @param amount - Amount in paise (₹99 = 9900 paise)
 * @param receipt - Unique receipt identifier for this order
 */
export async function createOrder(
  amount: number,
  receipt: string
): Promise<RazorpayOrder> {
  let response: Response;

  try {
    response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getBasicAuthHeader(),
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt,
      }),
    });
  } catch (err) { console.error('Razorpay fetch error:', err);
    throw new Error('Payment service unavailable');
  }

  if (!response.ok) {
    const errBody = await response.text();
    console.error('Razorpay API error:', errBody);
    throw new Error('Payment service unavailable');
  }

  const data = (await response.json()) as RazorpayOrder;
  return data;
}

/**
 * Verifies a Razorpay webhook signature.
 * HMAC-SHA256 of the raw request body using RAZORPAY_WEBHOOK_SECRET as key.
 * The webhookSecret must match the secret set in Razorpay Dashboard → Webhooks.
 *
 * @param rawBody       - Raw request body string (must be pre-read, not parsed)
 * @param signature     - x-razorpay-signature header value
 * @param webhookSecret - RAZORPAY_WEBHOOK_SECRET from env
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!webhookSecret) return false;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (err) { console.error('Razorpay fetch error:', err);
    return false;
  }
}

/**
 * Verifies a Razorpay payment signature after checkout completes.
 * HMAC-SHA256 of "{orderId}|{paymentId}" using RAZORPAY_KEY_SECRET as key.
 * This is the mandatory security check — never skip this.
 *
 * @param orderId     - razorpay_order_id returned by checkout
 * @param paymentId   - razorpay_payment_id returned by checkout
 * @param signature   - razorpay_signature returned by checkout
 * @returns true if signature is valid, false otherwise
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (err) { console.error('Razorpay fetch error:', err);
    // Buffer length mismatch means invalid signature
    return false;
  }
}

