import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { fetchAuthSession } from "aws-amplify/auth";
import { createDynamoDBClient } from "./aws";
import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TABLES } from "./db";
import { subscriptionService, computeEffectiveStatus } from "./subscriptionService";
import { getOrganizationById } from "./organizationService";
import type { Subscription, SubscriptionStatus, OrgMember } from "../types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface IndividualStudentInfo {
  user_id: string;
  email: string;
  full_name: string;
  last_access?: string;
  subscription_status: SubscriptionStatus;
  admin_free_access: boolean;
}

// ── Cognito Client ───────────────────────────────────────────────────────────

const USER_POOL_ID = import.meta.env.VITE_AWS_USER_POOL_ID;
const REGION = import.meta.env.VITE_AWS_REGION || "us-east-1";

async function createCognitoClient(): Promise<CognitoIdentityProviderClient> {
  const session = await fetchAuthSession();
  const creds = session.credentials;
  if (!creds) {
    throw new Error("No hay sesión activa. El usuario debe estar autenticado.");
  }
  return new CognitoIdentityProviderClient({
    region: REGION,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
  });
}

// ── 4.1: getIndividualStudents ───────────────────────────────────────────────
// Requisitos: 1.1, 1.4

export async function getIndividualStudents(): Promise<IndividualStudentInfo[]> {
  const cognitoClient = await createCognitoClient();
  const students: IndividualStudentInfo[] = [];
  let paginationToken: string | undefined;

  // Paginate through all Cognito users and filter client-side
  // (ListUsers Filter doesn't support custom attributes)
  do {
    const response = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 60,
        PaginationToken: paginationToken,
      })
    );

    for (const user of response.Users || []) {
      const attrs = Object.fromEntries(
        (user.Attributes || []).map((a) => [a.Name, a.Value])
      );

      // Only include users with role 'user' or no role (default to user)
      const role = attrs["custom:role"];
      if (role === "admin" || role === "org_admin") continue;

      // Skip users that belong to an organization
      if (attrs["custom:org_id"]) continue;

      const userId = user.Username || attrs["sub"] || "";
      const email = attrs["email"] || "";
      const fullName = attrs["name"] || "";

      // Cross-reference with Subscriptions table
      let subscriptionStatus: SubscriptionStatus = "none";
      let adminFreeAccess = false;

      try {
        const sub = await subscriptionService.getSubscription(userId);
        if (sub) {
          subscriptionStatus = computeEffectiveStatus(sub);
          adminFreeAccess = sub.admin_free_access === true;
        }
      } catch {
        // If subscription lookup fails, default to 'none'
      }

      students.push({
        user_id: userId,
        email,
        full_name: fullName,
        last_access: user.UserLastModifiedDate?.toISOString(),
        subscription_status: subscriptionStatus,
        admin_free_access: adminFreeAccess,
      });
    }

    paginationToken = response.PaginationToken;
  } while (paginationToken);

  return students;
}

// ── 4.3: toggleFreeAccess ────────────────────────────────────────────────────
// Requisitos: 2.1, 2.2, 2.5, 10.2, 10.3, 10.5

export async function toggleFreeAccess(
  userId: string,
  enabled: boolean
): Promise<Subscription> {
  const now = new Date().toISOString();
  const existing = await subscriptionService.getSubscription(userId);

  if (enabled) {
    // When enabling: set admin_free_access=true and status='active'
    // Preserve existing PayPal fields if they exist
    const subscription: Subscription = {
      user_id: userId,
      status: "active",
      admin_free_access: true,
      selected_exam_ids: existing?.selected_exam_ids || [],
      trial_used: existing?.trial_used ?? false,
      exam_change_used_this_period: existing?.exam_change_used_this_period ?? false,
      // Preserve PayPal fields
      paypal_subscription_id: existing?.paypal_subscription_id,
      plan_type: existing?.plan_type,
      price_usd: existing?.price_usd,
      // Preserve date fields
      start_date: existing?.start_date,
      current_period_end: existing?.current_period_end,
      grace_period_end: existing?.grace_period_end,
      trial_start_date: existing?.trial_start_date,
      trial_end_date: existing?.trial_end_date,
      cancelled_at: existing?.cancelled_at,
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
  } else {
    // When disabling: set admin_free_access=false and recalculate status
    // Preserve existing PayPal fields
    const subscription: Subscription = {
      user_id: userId,
      status: existing?.status ?? "none",
      admin_free_access: false,
      selected_exam_ids: existing?.selected_exam_ids || [],
      trial_used: existing?.trial_used ?? false,
      exam_change_used_this_period: existing?.exam_change_used_this_period ?? false,
      // Preserve PayPal fields
      paypal_subscription_id: existing?.paypal_subscription_id,
      plan_type: existing?.plan_type,
      price_usd: existing?.price_usd,
      // Preserve date fields
      start_date: existing?.start_date,
      current_period_end: existing?.current_period_end,
      grace_period_end: existing?.grace_period_end,
      trial_start_date: existing?.trial_start_date,
      trial_end_date: existing?.trial_end_date,
      cancelled_at: existing?.cancelled_at,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    // Recalculate effective status without admin_free_access
    subscription.status = computeEffectiveStatus(subscription);

    const client = await createDynamoDBClient();
    await client.send(
      new PutCommand({
        TableName: TABLES.SUBSCRIPTIONS,
        Item: subscription,
      })
    );

    return subscription;
  }
}

// ── 4.5: extendOrgAccess ─────────────────────────────────────────────────────
// Requisitos: 4.1, 4.3, 4.4, 10.4, 10.6

const EXTENSION_DAYS = 90;

export async function extendOrgAccess(
  orgId: string,
  userId: string
): Promise<OrgMember> {
  const org = await getOrganizationById(orgId);
  if (!org) {
    throw new Error(`Organization with id "${orgId}" not found`);
  }

  const members = org.members || [];
  const memberIndex = members.findIndex((m) => m.user_id === userId);

  if (memberIndex === -1) {
    throw new Error("El usuario no pertenece a esta organización");
  }

  const member = members[memberIndex];
  const now = new Date();

  // Calculate new expiry: max(access_expires_at, now) + 90 days
  const currentExpiry = member.access_expires_at
    ? new Date(member.access_expires_at)
    : now;
  const base = currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(base.getTime() + EXTENSION_DAYS * 24 * 60 * 60 * 1000);

  const updatedMember: OrgMember = {
    ...member,
    access_expires_at: newExpiry.toISOString(),
  };

  // Update the members array in the organization record
  const updatedMembers = [...members];
  updatedMembers[memberIndex] = updatedMember;

  const client = await createDynamoDBClient();
  await client.send(
    new UpdateCommand({
      TableName: TABLES.ORGANIZATIONS,
      Key: { id: orgId },
      UpdateExpression: "SET members = :members, updated_at = :updatedAt",
      ExpressionAttributeValues: {
        ":members": updatedMembers,
        ":updatedAt": new Date().toISOString(),
      },
    })
  );

  return updatedMember;
}

// ── Exported Service Object ──────────────────────────────────────────────────

export const adminAccessService = {
  getIndividualStudents,
  toggleFreeAccess,
  extendOrgAccess,
};
