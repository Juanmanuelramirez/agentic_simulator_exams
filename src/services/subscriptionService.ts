import { createDynamoDBClient } from "./aws";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TABLES } from "./db";
import type { Subscription, SubscriptionStatus, ActivateSubscriptionInput } from "../types";

// ── Trial Configuration ──────────────────────────────────────────────────────
export const MAX_TRIAL_SIMULATIONS = 3;

// ── CRUD Operations ──────────────────────────────────────────────────────────

async function getSubscription(userId: string): Promise<Subscription | null> {
  const client = await createDynamoDBClient();
  const response = await client.send(
    new GetCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Key: { user_id: userId },
    })
  );
  return (response.Item as Subscription) || null;
}

async function createTrialSubscription(
  userId: string,
  examIds: string[]
): Promise<Subscription> {
  const validation = validateExamSelection(examIds);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const now = new Date();

  const subscription: Subscription = {
    user_id: userId,
    status: "trial",
    selected_exam_ids: examIds,
    trial_start_date: now.toISOString(),
    trial_used: true,
    trial_simulations_used: 0,
    exam_change_used_this_period: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const client = await createDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Item: subscription,
    })
  );

  return subscription;
}

async function activateSubscription(
  userId: string,
  data: ActivateSubscriptionInput
): Promise<Subscription> {
  const validation = validateExamSelection(data.selected_exam_ids);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const now = new Date().toISOString();
  const existing = await getSubscription(userId);

  const subscription: Subscription = {
    user_id: userId,
    paypal_subscription_id: data.paypal_subscription_id,
    plan_type: data.plan_type,
    status: "active",
    selected_exam_ids: data.selected_exam_ids,
    price_usd: data.price_usd,
    start_date: now,
    trial_used: existing?.trial_used ?? false,
    exam_change_used_this_period: false,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  const client = await createDynamoDBClient();
  await client.send(
    new PutCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Item: subscription,
    })
  );

  return subscription;
}

async function cancelSubscription(userId: string): Promise<Subscription> {
  const now = new Date().toISOString();
  const client = await createDynamoDBClient();

  await client.send(
    new UpdateCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Key: { user_id: userId },
      UpdateExpression: "SET #s = :status, cancelled_at = :now, updated_at = :now",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":status": "cancelled",
        ":now": now,
      },
    })
  );

  const updated = await getSubscription(userId);
  if (!updated) {
    throw new Error("Subscription not found after cancel");
  }
  return updated;
}

async function updateSelectedExams(
  userId: string,
  examIds: string[]
): Promise<Subscription> {
  const validation = validateExamSelection(examIds);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const existing = await getSubscription(userId);
  if (!existing) {
    throw new Error("No subscription found for user");
  }

  if (existing.exam_change_used_this_period && !existing.admin_free_access) {
    throw new Error("Exam change already used this billing period");
  }

  const now = new Date().toISOString();
  const client = await createDynamoDBClient();

  await client.send(
    new UpdateCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Key: { user_id: userId },
      UpdateExpression:
        "SET selected_exam_ids = :exams, exam_change_used_this_period = :used, updated_at = :now",
      ExpressionAttributeValues: {
        ":exams": examIds,
        ":used": true,
        ":now": now,
      },
    })
  );

  const updated = await getSubscription(userId);
  if (!updated) {
    throw new Error("Subscription not found after update");
  }
  return updated;
}

// ── Business Logic Functions ─────────────────────────────────────────────────

/**
 * State machine for computing effective subscription status.
 * Handles transitions:
 *  - trial → expired (used all 3 trial simulations)
 *  - cancelled → expired (past current_period_end)
 *  - expired → grace_period (within grace_period_end)
 */
export function computeEffectiveStatus(
  subscription: Subscription,
  now: Date = new Date()
): SubscriptionStatus {
  if (subscription.admin_free_access === true) {
    return 'active';
  }

  const { status } = subscription;

  if (status === "trial") {
    const used = subscription.trial_simulations_used ?? 0;
    if (used >= MAX_TRIAL_SIMULATIONS) {
      return "expired";
    }
    return "trial";
  }

  if (status === "active") {
    // If active via PayPal, it stays active (PayPal manages billing)
    if (subscription.paypal_subscription_id) {
      return "active";
    }
    // If active via trial/coupon (no PayPal), check if current_period_end has passed
    if (subscription.current_period_end && now >= new Date(subscription.current_period_end)) {
      return "expired";
    }
    // If active via trial, check trial_end_date
    if (subscription.trial_end_date && now >= new Date(subscription.trial_end_date)) {
      return "expired";
    }
    // If there's a valid future date, it's still active
    if (subscription.current_period_end || subscription.trial_end_date) {
      return "active";
    }
    // No PayPal, no valid dates, and trial was used — stale record
    // (e.g., admin free access was revoked after trial expired)
    if (subscription.trial_used) {
      return "expired";
    }
    return "active";
  }

  if (status === "cancelled") {
    if (subscription.current_period_end && now >= new Date(subscription.current_period_end)) {
      // Past billing period — check grace
      if (subscription.grace_period_end && now < new Date(subscription.grace_period_end)) {
        return "grace_period";
      }
      return "expired";
    }
    return "cancelled";
  }

  if (status === "expired") {
    if (subscription.grace_period_end && now < new Date(subscription.grace_period_end)) {
      return "grace_period";
    }
    return "expired";
  }

  if (status === "grace_period") {
    if (subscription.grace_period_end && now >= new Date(subscription.grace_period_end)) {
      return "expired";
    }
    return "grace_period";
  }

  return status;
}

/**
 * Returns remaining trial simulations or null if not in trial / trial exhausted.
 */
export function getRemainingTrialSimulations(
  subscription: Subscription
): number | null {
  if (subscription.status !== 'trial' && computeEffectiveStatus(subscription) !== 'trial') {
    return null;
  }
  const used = subscription.trial_simulations_used ?? 0;
  const remaining = MAX_TRIAL_SIMULATIONS - used;
  return remaining > 0 ? remaining : null;
}

/**
 * @deprecated Use getRemainingTrialSimulations instead. Kept for backward compatibility.
 * Returns remaining trial time as {days, hours} or null if not in trial / trial expired.
 */
export function getRemainingTrialTime(
  subscription: Subscription,
  now: Date = new Date()
): { days: number; hours: number } | null {
  if (!subscription.trial_end_date) return null;

  const end = new Date(subscription.trial_end_date);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  return {
    days: Math.floor(totalHours / 24),
    hours: totalHours % 24,
  };
}

/**
 * Returns remaining grace period time as {days, hours} or null if not in grace / grace expired.
 */
export function getRemainingGraceTime(
  subscription: Subscription,
  now: Date = new Date()
): { days: number; hours: number } | null {
  if (!subscription.grace_period_end) return null;

  const end = new Date(subscription.grace_period_end);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  return {
    days: Math.floor(totalHours / 24),
    hours: totalHours % 24,
  };
}

/**
 * Trial is available if there's no subscription or trial_used is false.
 */
export function isTrialAvailable(subscription: Subscription | null): boolean {
  if (subscription === null) return true;
  return !subscription.trial_used;
}

/**
 * Increments the trial simulation counter. Called when a user completes a simulation during trial.
 * Returns the updated subscription.
 */
async function incrementTrialSimulation(userId: string): Promise<Subscription> {
  const client = await createDynamoDBClient();
  const now = new Date().toISOString();

  await client.send(
    new UpdateCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Key: { user_id: userId },
      UpdateExpression:
        "SET trial_simulations_used = if_not_exists(trial_simulations_used, :zero) + :one, updated_at = :now",
      ExpressionAttributeValues: {
        ":zero": 0,
        ":one": 1,
        ":now": now,
      },
    })
  );

  const updated = await getSubscription(userId);
  if (!updated) {
    throw new Error("Subscription not found after incrementing trial simulation");
  }
  return updated;
}

/**
 * Validates exam selection: must be 1-3 items.
 */
export function validateExamSelection(
  examIds: string[]
): { valid: boolean; error?: string } {
  if (examIds.length === 0) {
    return { valid: false, error: "At least 1 exam must be selected" };
  }
  if (examIds.length > 3) {
    return { valid: false, error: "Maximum of 3 exams can be selected" };
  }
  return { valid: true };
}

// ── Exam Change Classification ───────────────────────────────────────────────

export type ExamChangeType = 'add_to_slots' | 'full_change';

/**
 * Classifies an exam change as either adding to empty slots or a full change.
 * Returns 'add_to_slots' if no existing exams were removed (only additions).
 * Returns 'full_change' if any existing exam was removed.
 */
export function classifyExamChange(
  currentIds: string[],
  newIds: string[]
): ExamChangeType {
  const removedAny = currentIds.some(id => !newIds.includes(id));
  if (removedAny) return 'full_change';
  return 'add_to_slots';
}

/**
 * Adds exams to available slots WITHOUT marking exam_change_used_this_period.
 * Filters duplicates and validates that total doesn't exceed 3.
 */
async function addExamsToSlots(
  userId: string,
  newExamIds: string[]
): Promise<Subscription> {
  const existing = await getSubscription(userId);
  if (!existing) {
    throw new Error("No subscription found for user");
  }

  // Filter out duplicates (exams already selected)
  const uniqueNewIds = newExamIds.filter(
    id => !existing.selected_exam_ids.includes(id)
  );

  const mergedIds = [...existing.selected_exam_ids, ...uniqueNewIds];

  if (mergedIds.length > 3) {
    throw new Error("Adding these exams would exceed the maximum of 3");
  }

  const validation = validateExamSelection(mergedIds);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const now = new Date().toISOString();
  const client = await createDynamoDBClient();

  await client.send(
    new UpdateCommand({
      TableName: TABLES.SUBSCRIPTIONS,
      Key: { user_id: userId },
      UpdateExpression:
        "SET selected_exam_ids = :exams, updated_at = :now",
      ExpressionAttributeValues: {
        ":exams": mergedIds,
        ":now": now,
      },
    })
  );

  const updated = await getSubscription(userId);
  if (!updated) {
    throw new Error("Subscription not found after update");
  }
  return updated;
}

// ── Exported Service Object ──────────────────────────────────────────────────

export const subscriptionService = {
  getSubscription,
  createTrialSubscription,
  activateSubscription,
  cancelSubscription,
  updateSelectedExams,
  computeEffectiveStatus,
  getRemainingTrialTime,
  getRemainingTrialSimulations,
  getRemainingGraceTime,
  isTrialAvailable,
  incrementTrialSimulation,
  validateExamSelection,
  classifyExamChange,
  addExamsToSlots,
};
