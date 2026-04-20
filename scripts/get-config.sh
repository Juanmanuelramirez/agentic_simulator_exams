#!/bin/bash
# =============================================================================
# get-config.sh
# Recupera la configuración desde AWS Secrets Manager y regenera .env.production
#
# Uso: ./scripts/get-config.sh [REGION]
# Útil en: CI/CD, máquina nueva, después de rotar credenciales
# =============================================================================

set -e

REGION="${1:-us-east-1}"
APP_NAME="agentic-exam-simulator"
SECRET_NAME="${APP_NAME}/config"

echo "🔍 Recuperando configuración desde Secrets Manager: $SECRET_NAME..."

SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --query SecretString \
  --output text 2>/dev/null) || {
  echo "❌ No se encontró el secret '$SECRET_NAME'."
  echo "   Ejecuta primero: ./scripts/setup-aws-infra.sh"
  exit 1
}

# Parsear valores del secret
USER_POOL_ID=$(echo "$SECRET_JSON"       | python3 -c "import sys,json; print(json.load(sys.stdin)['USER_POOL_ID'])")
USER_POOL_CLIENT_ID=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['USER_POOL_CLIENT_ID'])")
COGNITO_DOMAIN=$(echo "$SECRET_JSON"     | python3 -c "import sys,json; print(json.load(sys.stdin)['COGNITO_DOMAIN'])")
IDENTITY_POOL_ID=$(echo "$SECRET_JSON"   | python3 -c "import sys,json; print(json.load(sys.stdin)['IDENTITY_POOL_ID'])")
BUCKET_NAME=$(echo "$SECRET_JSON"        | python3 -c "import sys,json; print(json.load(sys.stdin)['BUCKET_NAME'])")
DIST_ID=$(echo "$SECRET_JSON"            | python3 -c "import sys,json; print(json.load(sys.stdin)['CLOUDFRONT_DIST_ID'])")
REGION_VAL=$(echo "$SECRET_JSON"         | python3 -c "import sys,json; print(json.load(sys.stdin)['REGION'])")
ADMIN_EMAIL=$(echo "$SECRET_JSON"        | python3 -c "import sys,json; print(json.load(sys.stdin)['ADMIN_EMAIL'])")

# Regenerar .env.production
cat > .env.production << ENV
# Recuperado desde AWS Secrets Manager / ${SECRET_NAME}
# $(date)
# ⚠️  NO agregar Access Keys aquí.
VITE_AWS_USER_POOL_ID=${USER_POOL_ID}
VITE_AWS_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
VITE_AWS_COGNITO_DOMAIN=${COGNITO_DOMAIN}
VITE_AWS_IDENTITY_POOL_ID=${IDENTITY_POOL_ID}
VITE_AWS_REGION=${REGION_VAL}
VITE_DEV_ADMIN_EMAIL=${ADMIN_EMAIL}
ENV

# Regenerar .env.deploy
cat > .env.deploy << DEPLOY
BUCKET_NAME=${BUCKET_NAME}
CLOUDFRONT_DIST_ID=${DIST_ID}
AWS_REGION=${REGION_VAL}
DEPLOY

echo "✅ .env.production y .env.deploy regenerados desde Secrets Manager"
echo "   User Pool ID     : $USER_POOL_ID"
echo "   Identity Pool ID : $IDENTITY_POOL_ID"
echo "   CloudFront ID    : $DIST_ID"
