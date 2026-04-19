import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * Lemon Squeezy Webhook Handler
 * Processes subscription events and updates user subscription tier
 * 
 * Webhook Security:
 * - Verify X-Signature header using HMAC-SHA256
 * - Store event ID to prevent duplicate processing
 */

interface LemonSqueezyEvent {
  event_name: string;
  data: {
    type: string;
    attributes: {
      customer_id?: number;
      order_id?: number;
      order_number?: string;
      status?: string;
      user_email?: string;
      [key: string]: unknown;
    };
  };
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('base64');
  return signature === expectedSignature;
}

/**
 * Handle payment_success event - User purchased subscription
 */
async function handlePaymentSuccess(event: LemonSqueezyEvent): Promise<void> {
  const attributes = event.data.attributes;
  const customerId = attributes.customer_id?.toString();
  const userEmail = attributes.user_email as string;

  if (!customerId || !userEmail) {
    throw new Error('Missing required customer_id or user_email');
  }

  // Find or create user
  let user = await db.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        email: userEmail,
        subscriptionTier: 'PRO',
        lemonSqueezyCustomerId: customerId,
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
  } else {
    // Update existing user
    await db.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: 'PRO',
        lemonSqueezyCustomerId: customerId,
        subscriptionStatus: 'ACTIVE',
        lemonSqueezyOrderId: attributes.order_id?.toString(),
        subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`[Lemon Squeezy] Payment success for user: ${userEmail}`);
}

/**
 * Handle subscription_updated event
 */
async function handleSubscriptionUpdated(event: LemonSqueezyEvent): Promise<void> {
  const attributes = event.data.attributes;
  const customerId = attributes.customer_id?.toString();
  const status = attributes.status as string;

  if (!customerId) {
    throw new Error('Missing customer_id');
  }

  const user = await db.user.findFirst({
    where: { lemonSqueezyCustomerId: customerId },
  });

  if (!user) {
    console.warn(`[Lemon Squeezy] User not found for customer: ${customerId}`);
    return;
  }

  // Map Lemon Squeezy status to our subscription status
  const subscriptionStatus = status === 'active' ? 'ACTIVE' : 'CANCELLED';

  await db.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: subscriptionStatus as any,
    },
  });

  console.log(`[Lemon Squeezy] Subscription updated for user ${user.email}: ${subscriptionStatus}`);
}

/**
 * Handle subscription_cancelled event
 */
async function handleSubscriptionCancelled(event: LemonSqueezyEvent): Promise<void> {
  const attributes = event.data.attributes;
  const customerId = attributes.customer_id?.toString();

  if (!customerId) {
    throw new Error('Missing customer_id');
  }

  const user = await db.user.findFirst({
    where: { lemonSqueezyCustomerId: customerId },
  });

  if (!user) {
    console.warn(`[Lemon Squeezy] User not found for customer: ${customerId}`);
    return;
  }

  // Downgrade to FREE tier
  await db.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: 'FREE',
      subscriptionStatus: 'CANCELLED',
      subscriptionEndsAt: new Date(),
    },
  });

  console.log(`[Lemon Squeezy] Subscription cancelled for user: ${user.email}`);
}

/**
 * POST /api/webhooks/lemonsqueezy
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const signature = request.headers.get('x-signature');
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    if (!signature || !secret) {
      console.warn('[Lemon Squeezy] Missing signature or webhook secret');
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 403 }
      );
    }

    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      console.warn('[Lemon Squeezy] Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 403 }
      );
    }

    // Parse event
    let event: LemonSqueezyEvent;
    try {
      event = JSON.parse(rawBody);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in webhook body' },
        { status: 400 }
      );
    }

    // Extract event ID for deduplication
    const eventId = `${event.event_name}:${Date.now()}`;

    // Check if event was already processed
    const existingEvent = await db.lemonSqueezyEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      console.log('[Lemon Squeezy] Event already processed:', eventId);
      return NextResponse.json(
        { received: true, message: 'Event already processed' },
        { status: 200 }
      );
    }

    // Store event for audit trail
    await db.lemonSqueezyEvent.create({
      data: {
        eventId,
        eventName: event.event_name,
        payload: rawBody,
      },
    });

    // Process event
    switch (event.event_name) {
      case 'payment_success':
        await handlePaymentSuccess(event);
        break;
      case 'subscription_updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(event);
        break;
      default:
        console.log(`[Lemon Squeezy] Unhandled event: ${event.event_name}`);
    }

    // Mark event as processed
    await db.lemonSqueezyEvent.update({
      where: { eventId },
      data: { isProcessed: true, processedAt: new Date() },
    });

    return NextResponse.json(
      { received: true, event: event.event_name },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Lemon Squeezy] Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
