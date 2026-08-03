import { createDynamoDBClient } from "./aws";
import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TABLES } from "./db";
import { getOrganizations } from "./organizationService";
import { subscriptionService } from "./subscriptionService";
import type { Coupon, Subscription } from "../types";

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface CreateCouponInput {
  type: 'time' | 'percentage';
  value: number;
  expires_at: string;
  max_uses: number;
  created_by: string;
}

export interface ValidateCouponResult {
  valid: boolean;
  coupon?: Coupon;
  error?: string;
  preview?: CouponPreviewData;
}

export interface CouponPreviewData {
  code: string;
  type: 'time' | 'percentage';
  value: number;
  description: string;
}

// ── Code Generation ──────────────────────────────────────────────────────────

const ALPHANUMERIC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 12;

/**
 * Generates a random 12-character alphanumeric coupon code
 * using crypto.getRandomValues() for cryptographic randomness.
 */
function generateCouponCode(): string {
  const randomValues = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(randomValues);

  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHANUMERIC_CHARS[randomValues[i] % ALPHANUMERIC_CHARS.length];
  }
  return code;
}

// ── CRUD Operations ──────────────────────────────────────────────────────────

/**
 * Creates a new coupon with a unique auto-generated code.
 * Verifies code uniqueness via GetItem and retries up to 3 times on collision.
 */
async function createCoupon(input: CreateCouponInput): Promise<Coupon> {
  const client = await createDynamoDBClient();
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateCouponCode();

    // Verify uniqueness
    const existing = await client.send(
      new GetCommand({
        TableName: TABLES.COUPONS,
        Key: { code },
      })
    );

    if (existing.Item) {
      // Code collision — retry
      if (attempt === maxRetries - 1) {
        throw new Error("Failed to generate a unique coupon code after 3 attempts");
      }
      continue;
    }

    const now = new Date().toISOString();
    const coupon: Coupon = {
      code,
      type: input.type,
      value: input.value,
      status: 'active',
      current_uses: 0,
      max_uses: input.max_uses,
      expires_at: input.expires_at,
      created_by: input.created_by,
      created_at: now,
      updated_at: now,
    };

    await client.send(
      new PutCommand({
        TableName: TABLES.COUPONS,
        Item: coupon,
      })
    );

    return coupon;
  }

  // This should never be reached due to the throw inside the loop,
  // but TypeScript needs it for exhaustive return.
  throw new Error("Failed to generate a unique coupon code after 3 attempts");
}

/**
 * Retrieves a coupon by its code. Returns null if not found.
 */
async function getCouponByCode(code: string): Promise<Coupon | null> {
  const client = await createDynamoDBClient();
  const response = await client.send(
    new GetCommand({
      TableName: TABLES.COUPONS,
      Key: { code },
    })
  );
  return (response.Item as Coupon) || null;
}

/**
 * Retrieves all coupons from the table via Scan.
 */
async function getAllCoupons(): Promise<Coupon[]> {
  const client = await createDynamoDBClient();
  const response = await client.send(
    new ScanCommand({ TableName: TABLES.COUPONS })
  );
  return (response.Items as Coupon[]) || [];
}

/**
 * Deactivates a coupon by setting its status to 'inactive'.
 */
async function deactivateCoupon(code: string): Promise<Coupon> {
  const now = new Date().toISOString();
  const client = await createDynamoDBClient();

  await client.send(
    new UpdateCommand({
      TableName: TABLES.COUPONS,
      Key: { code },
      UpdateExpression: "SET #s = :status, updated_at = :now",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":status": "inactive",
        ":now": now,
      },
    })
  );

  const updated = await getCouponByCode(code);
  if (!updated) {
    throw new Error("Coupon not found after deactivation");
  }
  return updated;
}

// ── Validation & Application ─────────────────────────────────────────────────

/**
 * Checks if a user belongs to any active organization.
 * Uses getOrganizations() from organizationService and checks membership lists.
 */
async function isUserInOrganization(userId: string): Promise<boolean> {
  const organizations = await getOrganizations();
  return organizations.some(
    (org) =>
      org.is_active &&
      org.members?.some((member) => member.user_id === userId)
  );
}

/**
 * Validates a coupon code for a given user.
 * Validation order:
 * 1. Check if user is in an organization (reject if yes)
 * 2. Get coupon by code (reject if not found)
 * 3. Check status is 'active' (reject if inactive)
 * 4. Check not expired (reject if expired)
 * 5. Check current_uses < max_uses (reject if at limit)
 * 6. If time coupon, check user doesn't have active paid subscription
 */
async function validateCoupon(code: string, userId: string): Promise<ValidateCouponResult> {
  // 1. Check organization membership
  const inOrg = await isUserInOrganization(userId);
  if (inOrg) {
    return { valid: false, error: 'coupon_error_org_member' };
  }

  // 2. Get coupon by code
  const coupon = await getCouponByCode(code);
  if (!coupon) {
    return { valid: false, error: 'coupon_error_invalid' };
  }

  // 3. Check status is active
  if (coupon.status !== 'active') {
    return { valid: false, error: 'coupon_error_inactive' };
  }

  // 4. Check not expired
  if (new Date() >= new Date(coupon.expires_at)) {
    return { valid: false, error: 'coupon_error_expired' };
  }

  // 5. Check usage limit
  if (coupon.current_uses >= coupon.max_uses) {
    return { valid: false, error: 'coupon_error_max_uses' };
  }

  // 6. If time coupon, check no active paid subscription
  if (coupon.type === 'time') {
    const subscription = await subscriptionService.getSubscription(userId);
    if (
      subscription &&
      subscription.status === 'active' &&
      subscription.paypal_subscription_id
    ) {
      return { valid: false, error: 'coupon_error_active_sub' };
    }
  }

  const preview = formatCouponPreview(coupon);
  return { valid: true, coupon, preview };
}

/**
 * Formats a coupon into a CouponPreviewData object with localized description.
 */
function formatCouponPreview(coupon: Coupon): CouponPreviewData {
  const description =
    coupon.type === 'time'
      ? `Suscripción gratuita por ${coupon.value} días`
      : `Descuento del ${coupon.value}% en tu suscripción`;

  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    description,
  };
}

/**
 * Calculates the discounted price given an original price and discount percentage.
 * Returns the result rounded to 2 decimal places.
 */
function calculateDiscountedPrice(originalPrice: number, discountPercent: number): number {
  return Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100;
}

/**
 * Applies a time coupon: creates/updates a subscription with free days,
 * then atomically increments the coupon's current_uses counter.
 */
async function applyTimeCoupon(
  code: string,
  userId: string,
  examIds: string[]
): Promise<Subscription> {
  const coupon = await getCouponByCode(code);
  if (!coupon) {
    throw new Error('Coupon not found');
  }

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + coupon.value);

  const subscription: Subscription = {
    user_id: userId,
    status: 'active',
    selected_exam_ids: examIds,
    start_date: now.toISOString(),
    current_period_end: endDate.toISOString(),
    trial_used: true,
    exam_change_used_this_period: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const client = await createDynamoDBClient();

  // Create/update subscription
  await client.send(
    new PutCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Item: subscription,
    })
  );

  // Atomically increment current_uses
  await client.send(
    new UpdateCommand({
      TableName: TABLES.COUPONS,
      Key: { code },
      UpdateExpression: "SET current_uses = current_uses + :inc, updated_at = :now",
      ExpressionAttributeValues: {
        ":inc": 1,
        ":now": now.toISOString(),
      },
    })
  );

  return subscription;
}

/**
 * Applies a percentage coupon: stores the coupon reference in the user's subscription,
 * then atomically increments the coupon's current_uses counter.
 */
async function applyPercentageCoupon(code: string, userId: string): Promise<void> {
  const coupon = await getCouponByCode(code);
  if (!coupon) {
    throw new Error('Coupon not found');
  }

  const now = new Date().toISOString();
  const client = await createDynamoDBClient();

  // Update subscription with coupon reference
  await client.send(
    new UpdateCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Key: { user_id: userId },
      UpdateExpression:
        "SET applied_coupon_code = :code, applied_coupon_discount = :discount, updated_at = :now",
      ExpressionAttributeValues: {
        ":code": coupon.code,
        ":discount": coupon.value,
        ":now": now,
      },
    })
  );

  // Atomically increment current_uses
  await client.send(
    new UpdateCommand({
      TableName: TABLES.COUPONS,
      Key: { code },
      UpdateExpression: "SET current_uses = current_uses + :inc, updated_at = :now",
      ExpressionAttributeValues: {
        ":inc": 1,
        ":now": now,
      },
    })
  );
}

// ── Exported Service Object ──────────────────────────────────────────────────

export const couponService = {
  generateCouponCode,
  createCoupon,
  getCouponByCode,
  getAllCoupons,
  deactivateCoupon,
  isUserInOrganization,
  validateCoupon,
  formatCouponPreview,
  calculateDiscountedPrice,
  applyTimeCoupon,
  applyPercentageCoupon,
};
