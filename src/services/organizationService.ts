import { createDynamoDBClient } from "./aws";
import {
  PutCommand,
  ScanCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { TABLES, dbService } from "./db";
import type { Organization, OrgMember, Exam } from "../types";

// ── Validation helpers ──────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateOrganizationName(name: string): string | null {
  if (!name || name.length < 2) {
    return "Organization name must be at least 2 characters";
  }
  if (name.length > 100) {
    return "Organization name must be at most 100 characters";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email || !EMAIL_REGEX.test(email)) {
    return "Invalid email format";
  }
  return null;
}

// ── Name uniqueness check via GSI ───────────────────────────────────────────

async function isNameTaken(name: string, excludeId?: string): Promise<boolean> {
  const client = await createDynamoDBClient();
  const response = await client.send(
    new QueryCommand({
      TableName: TABLES.ORGANIZATIONS,
      IndexName: "OrgNameIndex",
      KeyConditionExpression: "#n = :name",
      ExpressionAttributeNames: { "#n": "name" },
      ExpressionAttributeValues: { ":name": name },
    })
  );
  const items = response.Items || [];
  if (excludeId) {
    return items.some((item) => item.id !== excludeId);
  }
  return items.length > 0;
}

// ── CRUD Operations ─────────────────────────────────────────────────────────

export interface CreateOrganizationInput {
  name: string;
  description: string;
  logo_url?: string;
  email: string;
  phone?: string;
  created_by: string;
}

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<Organization> {
  const nameError = validateOrganizationName(input.name);
  if (nameError) throw new Error(nameError);

  const emailError = validateEmail(input.email);
  if (emailError) throw new Error(emailError);

  if (await isNameTaken(input.name)) {
    throw new Error(`Organization name "${input.name}" already exists`);
  }

  const now = new Date().toISOString();
  const org: Organization = {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description,
    logo_url: input.logo_url,
    email: input.email,
    phone: input.phone,
    assigned_exam_ids: [],
    is_active: true,
    created_by: input.created_by,
    created_at: now,
    updated_at: now,
    members: [],
  };

  const client = await createDynamoDBClient();
  await client.send(new PutCommand({ TableName: TABLES.ORGANIZATIONS, Item: org }));

  return org;
}

export async function getOrganizations(): Promise<Organization[]> {
  const client = await createDynamoDBClient();
  const response = await client.send(
    new ScanCommand({ TableName: TABLES.ORGANIZATIONS })
  );
  return (response.Items as Organization[]) || [];
}

export async function getOrganizationById(
  id: string
): Promise<Organization | null> {
  const client = await createDynamoDBClient();
  const response = await client.send(
    new GetCommand({ TableName: TABLES.ORGANIZATIONS, Key: { id } })
  );
  return (response.Item as Organization) || null;
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
  logo_url?: string;
  email?: string;
  phone?: string;
}

export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput
): Promise<Organization> {
  if (input.name !== undefined) {
    const nameError = validateOrganizationName(input.name);
    if (nameError) throw new Error(nameError);

    if (await isNameTaken(input.name, id)) {
      throw new Error(`Organization name "${input.name}" already exists`);
    }
  }

  if (input.email !== undefined) {
    const emailError = validateEmail(input.email);
    if (emailError) throw new Error(emailError);
  }

  const existing = await getOrganizationById(id);
  if (!existing) throw new Error(`Organization with id "${id}" not found`);

  const expressionParts: string[] = [];
  const attrNames: Record<string, string> = {};
  const attrValues: Record<string, unknown> = {};

  if (input.name !== undefined) {
    expressionParts.push("#n = :name");
    attrNames["#n"] = "name";
    attrValues[":name"] = input.name;
  }
  if (input.description !== undefined) {
    expressionParts.push("description = :desc");
    attrValues[":desc"] = input.description;
  }
  if (input.logo_url !== undefined) {
    expressionParts.push("logo_url = :logo");
    attrValues[":logo"] = input.logo_url;
  }
  if (input.email !== undefined) {
    expressionParts.push("email = :email");
    attrValues[":email"] = input.email;
  }
  if (input.phone !== undefined) {
    expressionParts.push("phone = :phone");
    attrValues[":phone"] = input.phone;
  }

  // Always update updated_at
  expressionParts.push("updated_at = :updatedAt");
  attrValues[":updatedAt"] = new Date().toISOString();

  const client = await createDynamoDBClient();
  const result = await client.send(
    new UpdateCommand({
      TableName: TABLES.ORGANIZATIONS,
      Key: { id },
      UpdateExpression: "SET " + expressionParts.join(", "),
      ...(Object.keys(attrNames).length > 0 && {
        ExpressionAttributeNames: attrNames,
      }),
      ExpressionAttributeValues: attrValues,
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as Organization;
}

export async function deactivateOrganization(
  id: string
): Promise<Organization> {
  const existing = await getOrganizationById(id);
  if (!existing) throw new Error(`Organization with id "${id}" not found`);

  const client = await createDynamoDBClient();
  const result = await client.send(
    new UpdateCommand({
      TableName: TABLES.ORGANIZATIONS,
      Key: { id },
      UpdateExpression: "SET is_active = :inactive, updated_at = :updatedAt",
      ExpressionAttributeValues: {
        ":inactive": false,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as Organization;
}


// ── Exam Assignment Operations ──────────────────────────────────────────────

export async function assignExamsToOrg(
  orgId: string,
  examIds: string[]
): Promise<Organization> {
  const existing = await getOrganizationById(orgId);
  if (!existing) throw new Error(`Organization with id "${orgId}" not found`);

  // Merge without duplicates
  const currentIds = existing.assigned_exam_ids || [];
  const merged = Array.from(new Set([...currentIds, ...examIds]));

  const client = await createDynamoDBClient();
  const result = await client.send(
    new UpdateCommand({
      TableName: TABLES.ORGANIZATIONS,
      Key: { id: orgId },
      UpdateExpression:
        "SET assigned_exam_ids = :ids, updated_at = :updatedAt",
      ExpressionAttributeValues: {
        ":ids": merged,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as Organization;
}

export async function removeExamFromOrg(
  orgId: string,
  examId: string
): Promise<Organization> {
  const existing = await getOrganizationById(orgId);
  if (!existing) throw new Error(`Organization with id "${orgId}" not found`);

  const filtered = (existing.assigned_exam_ids || []).filter(
    (id) => id !== examId
  );

  const client = await createDynamoDBClient();
  const result = await client.send(
    new UpdateCommand({
      TableName: TABLES.ORGANIZATIONS,
      Key: { id: orgId },
      UpdateExpression:
        "SET assigned_exam_ids = :ids, updated_at = :updatedAt",
      ExpressionAttributeValues: {
        ":ids": filtered,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as Organization;
}

export async function getAvailableExams(): Promise<Exam[]> {
  const allExams = await dbService.getExams();
  return allExams.filter((exam) => exam.is_active === true);
}


// ── Member Management Operations ────────────────────────────────────────────

export async function addMember(
  orgId: string,
  member: OrgMember
): Promise<Organization> {
  const existing = await getOrganizationById(orgId);
  if (!existing) throw new Error(`Organization with id "${orgId}" not found`);

  const currentMembers = existing.members || [];
  const updatedMembers = [...currentMembers, member];

  const client = await createDynamoDBClient();
  const result = await client.send(
    new UpdateCommand({
      TableName: TABLES.ORGANIZATIONS,
      Key: { id: orgId },
      UpdateExpression: "SET members = :members, updated_at = :updatedAt",
      ExpressionAttributeValues: {
        ":members": updatedMembers,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as Organization;
}

export async function getStudentsByOrg(
  orgId: string
): Promise<OrgMember[]> {
  const org = await getOrganizationById(orgId);
  if (!org) throw new Error(`Organization with id "${orgId}" not found`);

  const members = org.members || [];
  return members.filter((member) => member.role === "user");
}
