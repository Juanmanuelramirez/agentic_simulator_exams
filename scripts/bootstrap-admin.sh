#!/bin/bash
# =============================================================================
# bootstrap-admin.sh
# Promueve un usuario existente a administrador en Cognito.
# Lee el User Pool ID automáticamente del stack de CloudFormation.
#
# Uso:
#   ./scripts/bootstrap-admin.sh <email> [region]
#
# Ejemplo:
#   ./scripts/bootstrap-admin.sh nuevo.admin@empresa.com
# =============================================================================

set -e

USER_EMAIL="${1:-}"
REGION="${2:-us-east-1}"
AUTH_STACK="exam-simulator-auth"
APP_NAME="agentic-exam-simulator"

if [ -z "$USER_EMAIL" ]; then
  echo "Uso: ./scripts/bootstrap-admin.sh <email> [region]"
  echo "Ejemplo: ./scripts/bootstrap-admin.sh admin@empresa.com us-east-1"
  exit 1
fi

echo "🔍 Obteniendo User Pool ID del stack '$AUTH_STACK'..."

# Leer User Pool ID automáticamente desde CloudFormation
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$AUTH_STACK" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text 2>/dev/null)

if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" = "None" ]; then
  echo "❌ No se encontró el stack '$AUTH_STACK' en la región $REGION."
  echo "   Ejecuta primero: ./scripts/setup-aws-infra.sh"
  exit 1
fi

echo "✅ User Pool ID: $USER_POOL_ID"
echo "🔄 Promoviendo $USER_EMAIL a admin..."

# Verificar si el usuario existe
USER_EXISTS=$(aws cognito-idp list-users \
  --user-pool-id "$USER_POOL_ID" \
  --filter "email = \"${USER_EMAIL}\"" \
  --region "$REGION" \
  --query "Users[0].Username" \
  --output text 2>/dev/null)

if [ -z "$USER_EXISTS" ] || [ "$USER_EXISTS" = "None" ]; then
  echo "⚠️  El usuario $USER_EMAIL no existe en el pool."
  read -p "¿Deseas crearlo como admin? (s/N): " CREATE_USER
  if [[ "$CREATE_USER" =~ ^[sS]$ ]]; then
    TEMP_PASS="TempPass$(date +%s)!"
    aws cognito-idp admin-create-user \
      --user-pool-id "$USER_POOL_ID" \
      --username "$USER_EMAIL" \
      --user-attributes \
          Name=email,Value="$USER_EMAIL" \
          Name=email_verified,Value=true \
          Name="custom:role",Value=admin \
      --temporary-password "$TEMP_PASS" \
      --message-action SUPPRESS \
      --region "$REGION" > /dev/null
    echo "✅ Usuario admin creado: $USER_EMAIL"
    echo "⚠️  Contraseña temporal: $TEMP_PASS"
    echo "   El usuario deberá cambiarla en el primer login."
  else
    echo "Operación cancelada."
    exit 0
  fi
else
  # Solo actualizar el atributo de rol
  aws cognito-idp admin-update-user-attributes \
    --user-pool-id "$USER_POOL_ID" \
    --username "$USER_EMAIL" \
    --user-attributes Name="custom:role",Value=admin \
    --region "$REGION"
  echo "✅ $USER_EMAIL promovido a admin exitosamente."
fi
