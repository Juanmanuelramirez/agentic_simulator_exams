import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  type AdminCreateUserCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import { fetchAuthSession } from "aws-amplify/auth";

/**
 * Invitation Service — Cognito Admin API
 *
 * Crea usuarios en Cognito User Pool usando AdminCreateUser.
 * Las credenciales temporales se obtienen via Cognito Identity Pool
 * (mismo patrón que aws.ts). El usuario invitado recibe su contraseña
 * temporal por email (DesiredDeliveryMediums=['EMAIL']).
 */

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

export interface InviteUserInput {
  email: string;
  full_name: string;
  role: "org_admin" | "user";
  org_id: string;
  description?: string;
  phone?: string;
}

export interface InviteUserResult {
  user_id: string;
  email: string;
  status: string;
}

/**
 * Invita a un usuario creándolo en Cognito con AdminCreateUser.
 * Asigna custom:role y custom:org_id como atributos, y envía la
 * contraseña temporal por email.
 */
export async function inviteUser(
  input: InviteUserInput
): Promise<InviteUserResult> {
  const client = await createCognitoClient();

  const userAttributes = [
    { Name: "email", Value: input.email },
    { Name: "email_verified", Value: "true" },
    { Name: "name", Value: input.full_name },
    { Name: "custom:role", Value: input.role },
    { Name: "custom:org_id", Value: input.org_id },
  ];

  if (input.phone) {
    userAttributes.push({ Name: "phone_number", Value: input.phone });
  }

  const params: AdminCreateUserCommandInput = {
    UserPoolId: USER_POOL_ID,
    Username: input.email,
    UserAttributes: userAttributes,
    DesiredDeliveryMediums: ["EMAIL"],
  };

  try {
    const response = await client.send(new AdminCreateUserCommand(params));

    return {
      user_id: response.User?.Username || input.email,
      email: input.email,
      status: response.User?.UserStatus || "FORCE_CHANGE_PASSWORD",
    };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === "UsernameExistsException"
    ) {
      throw new Error(
        `El email "${input.email}" ya está registrado en el sistema. Por favor use otro email.`
      );
    }
    throw error;
  }
}
