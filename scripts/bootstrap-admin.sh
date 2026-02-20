#!/bin/bash
# Script para promover un usuario a Admin en Cognito
USER_EMAIL=$1
USER_POOL_ID=$2
REGION=${3:-us-east-1}

if [ -z "$USER_EMAIL" ] || [ -z "$USER_POOL_ID" ]; then
  echo "Uso: ./bootstrap-admin.sh <email> <user_pool_id> [region]"
  echo "Ejemplo: ./bootstrap-admin.sh juan.ramirez@example.com us-east-1_XXXXX"
  exit 1
fi

echo "Promoviendo usuario $USER_EMAIL en el pool $USER_POOL_ID (región: $REGION)..."

aws cognito-idp admin-update-user-attributes \
  --user-pool-id "$USER_POOL_ID" \
  --username "$USER_EMAIL" \
  --user-attributes Name="custom:role",Value="admin" \
  --region "$REGION"

if [ $? -eq 0 ]; then
  echo "✅ Usuario $USER_EMAIL promovido a admin exitosamente."
else
  echo "❌ Error al promover al usuario. Verifica que el atributo 'custom:role' exista en el User Pool y que tengas permisos de AWS CLI."
fi
