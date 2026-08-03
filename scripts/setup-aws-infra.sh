#!/bin/bash
# =============================================================================
# setup-aws-infra.sh
# Setup COMPLETAMENTE AUTOMATIZADO de infraestructura AWS para Exam Simulator
#
# Uso:
#   ./scripts/setup-aws-infra.sh [REGION] [ADMIN_EMAIL] [BUCKET_NAME]
#
# Ejemplo:
#   ./scripts/setup-aws-infra.sh us-east-1 admin@midominio.com
#
# Qué hace este script:
#   1. Verifica credenciales AWS
#   2. Despliega DynamoDB (CloudFormation)
#   3. Despliega Cognito User Pool + App Client + Dominio (CloudFormation)
#   4. Crea bucket S3 con acceso bloqueado
#   5. Crea distribución CloudFront con OAC
#   6. Actualiza Cognito con la URL de CloudFront como callback
#   7. Genera .env.production automáticamente
#   8. Build + deploy del frontend
#   9. Promueve el admin inicial
# =============================================================================

set -e

# ── Parámetros ────────────────────────────────────────────────────────────────
REGION="${1:-us-east-1}"
ADMIN_EMAIL="${2:-}"
BUCKET_NAME="${3:-agentic-exam-simulator-prod}"
APP_NAME="agentic-exam-simulator"
DB_STACK="exam-simulator-db"
AUTH_STACK="exam-simulator-auth"

# ── Colores para output ───────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }
step() { echo -e "\n${YELLOW}▶ $1${NC}"; }

echo "============================================="
echo " Exam Simulator - Setup Automatizado AWS"
echo " Región: $REGION | Bucket: $BUCKET_NAME"
echo "============================================="

# ── Validaciones previas ──────────────────────────────────────────────────────
if [ -z "$ADMIN_EMAIL" ]; then
  read -p "📧 Email del administrador inicial: " ADMIN_EMAIL
  [ -z "$ADMIN_EMAIL" ] && err "Se requiere un email de administrador."
fi

# Verificar dependencias
command -v aws    >/dev/null 2>&1 || err "AWS CLI no instalado. Instala desde https://aws.amazon.com/cli/"
command -v node   >/dev/null 2>&1 || err "Node.js no instalado."
command -v npm    >/dev/null 2>&1 || err "npm no instalado."
command -v python3 >/dev/null 2>&1 || err "python3 no instalado (requerido para parsear JSON)."

# ── 1. Verificar credenciales AWS ─────────────────────────────────────────────
step "[1/9] Verificando credenciales AWS..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) \
  || err "No se encontraron credenciales AWS. Ejecuta 'aws configure' o configura AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY."
ok "Cuenta AWS: $ACCOUNT_ID | Región: $REGION"

# ── 2. DynamoDB via CloudFormation ────────────────────────────────────────────
step "[2/9] Desplegando tablas DynamoDB..."
aws cloudformation deploy \
  --template-file infra/dynamodb.yml \
  --stack-name "$DB_STACK" \
  --region "$REGION" \
  --no-fail-on-empty-changeset
ok "Tablas DynamoDB listas (ExamSimulator-Simulators, Questions, Attempts)"

# ── 3. Cognito via CloudFormation ─────────────────────────────────────────────
step "[3/9] Desplegando Cognito User Pool..."

# Primera pasada: callback temporal (localhost) para que el stack se cree
aws cloudformation deploy \
  --template-file infra/cognito.yml \
  --stack-name "$AUTH_STACK" \
  --region "$REGION" \
  --parameter-overrides \
      AppName="$APP_NAME" \
      AdminEmail="$ADMIN_EMAIL" \
      CallbackUrl="http://localhost:5173/" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

# Leer outputs del stack de Cognito
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$AUTH_STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name "$AUTH_STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
  --output text)

COGNITO_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name "$AUTH_STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='CognitoDomain'].OutputValue" \
  --output text)

IDENTITY_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$AUTH_STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='IdentityPoolId'].OutputValue" \
  --output text)

ok "Cognito User Pool: $USER_POOL_ID"
ok "App Client: $USER_POOL_CLIENT_ID"
ok "Identity Pool: $IDENTITY_POOL_ID"
ok "Dominio Cognito: $COGNITO_DOMAIN"

# ── 4. Bucket S3 ──────────────────────────────────────────────────────────────
step "[4/9] Configurando bucket S3: $BUCKET_NAME..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null; then
  warn "Bucket ya existe, omitiendo creación."
else
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  ok "Bucket creado: $BUCKET_NAME"
fi

# Bloquear acceso público (solo CloudFront accede via OAC)
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
ok "Acceso público bloqueado en S3"

# ── 5. CloudFront OAC + Distribution ─────────────────────────────────────────
step "[5/9] Configurando CloudFront..."

# Crear o reutilizar OAC
OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='${APP_NAME}-oac'].Id" \
  --output text 2>/dev/null)

if [ -z "$OAC_ID" ] || [ "$OAC_ID" = "None" ]; then
  OAC_ID=$(aws cloudfront create-origin-access-control \
    --origin-access-control-config \
      "Name=${APP_NAME}-oac,Description=OAC for ${APP_NAME},SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query "OriginAccessControl.Id" --output text)
  ok "OAC creado: $OAC_ID"
else
  ok "OAC reutilizado: $OAC_ID"
fi

# Verificar si ya existe distribución para este bucket
S3_DOMAIN="${BUCKET_NAME}.s3.${REGION}.amazonaws.com"
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[0].DomainName=='${S3_DOMAIN}'].Id" \
  --output text 2>/dev/null)

if [ -z "$DIST_ID" ] || [ "$DIST_ID" = "None" ]; then
  echo "   Creando distribución CloudFront (puede tardar 5-10 min)..."
  DIST_JSON=$(aws cloudfront create-distribution --distribution-config "{
    \"CallerReference\": \"${APP_NAME}-$(date +%s)\",
    \"Comment\": \"${APP_NAME} PoC\",
    \"DefaultRootObject\": \"index.html\",
    \"Origins\": {
      \"Quantity\": 1,
      \"Items\": [{
        \"Id\": \"S3-${BUCKET_NAME}\",
        \"DomainName\": \"${S3_DOMAIN}\",
        \"S3OriginConfig\": {\"OriginAccessIdentity\": \"\"},
        \"OriginAccessControlId\": \"${OAC_ID}\"
      }]
    },
    \"DefaultCacheBehavior\": {
      \"TargetOriginId\": \"S3-${BUCKET_NAME}\",
      \"ViewerProtocolPolicy\": \"redirect-to-https\",
      \"CachePolicyId\": \"658327ea-f89d-4fab-a63d-7e88639e58f6\",
      \"Compress\": true,
      \"AllowedMethods\": {
        \"Quantity\": 2,
        \"Items\": [\"GET\", \"HEAD\"],
        \"CachedMethods\": {\"Quantity\": 2, \"Items\": [\"GET\", \"HEAD\"]}
      }
    },
    \"CustomErrorResponses\": {
      \"Quantity\": 2,
      \"Items\": [
        {\"ErrorCode\": 403, \"ResponsePagePath\": \"/index.html\", \"ResponseCode\": \"200\", \"ErrorCachingMinTTL\": 0},
        {\"ErrorCode\": 404, \"ResponsePagePath\": \"/index.html\", \"ResponseCode\": \"200\", \"ErrorCachingMinTTL\": 0}
      ]
    },
    \"Enabled\": true,
    \"HttpVersion\": \"http2\",
    \"PriceClass\": \"PriceClass_100\"
  }")

  DIST_ID=$(echo "$DIST_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['Distribution']['Id'])")
  DIST_DOMAIN=$(echo "$DIST_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['Distribution']['DomainName'])")
  ok "CloudFront creado: $DIST_ID"
else
  DIST_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" \
    --query "Distribution.DomainName" --output text)
  ok "CloudFront reutilizado: $DIST_ID"
fi

APP_URL="https://${DIST_DOMAIN}/"
ok "URL de la aplicación: $APP_URL"

# Actualizar bucket policy para OAC
cat > /tmp/cf-bucket-policy.json << POLICY
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontOAC",
    "Effect": "Allow",
    "Principal": {"Service": "cloudfront.amazonaws.com"},
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${BUCKET_NAME}/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::${ACCOUNT_ID}:distribution/${DIST_ID}"
      }
    }
  }]
}
POLICY
aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/cf-bucket-policy.json
ok "Bucket policy actualizada para CloudFront OAC"

# ── 6. Actualizar Cognito con URL real de CloudFront ──────────────────────────
step "[6/9] Actualizando Cognito con URL de CloudFront..."
aws cloudformation deploy \
  --template-file infra/cognito.yml \
  --stack-name "$AUTH_STACK" \
  --region "$REGION" \
  --parameter-overrides \
      AppName="$APP_NAME" \
      AdminEmail="$ADMIN_EMAIL" \
      CallbackUrl="$APP_URL" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset
ok "Cognito actualizado con callback: $APP_URL"

# ── 7. Guardar config en Secrets Manager + generar .env.production ────────────
step "[7/9] Guardando configuración en AWS Secrets Manager..."

SECRET_NAME="${APP_NAME}/config"
SECRET_VALUE=$(cat <<JSON
{
  "USER_POOL_ID": "${USER_POOL_ID}",
  "USER_POOL_CLIENT_ID": "${USER_POOL_CLIENT_ID}",
  "COGNITO_DOMAIN": "${COGNITO_DOMAIN}",
  "IDENTITY_POOL_ID": "${IDENTITY_POOL_ID}",
  "BUCKET_NAME": "${BUCKET_NAME}",
  "CLOUDFRONT_DIST_ID": "${DIST_ID}",
  "REGION": "${REGION}",
  "ADMIN_EMAIL": "${ADMIN_EMAIL}"
}
JSON
)

# Crear o actualizar el secret
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$REGION" 2>/dev/null; then
  aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_VALUE" \
    --region "$REGION" > /dev/null
  ok "Secret actualizado: $SECRET_NAME"
else
  aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "Configuración de infraestructura para ${APP_NAME}" \
    --secret-string "$SECRET_VALUE" \
    --region "$REGION" > /dev/null
  ok "Secret creado: $SECRET_NAME"
fi

# Generar .env.production leyendo desde Secrets Manager (fuente de verdad)
echo "   Generando .env.production desde Secrets Manager..."
cat > .env.production << ENV
# Generado automáticamente por setup-aws-infra.sh
# Fuente de verdad: AWS Secrets Manager / ${SECRET_NAME}
# $(date)
# ⚠️  NO agregar Access Keys aquí. Las credenciales AWS se obtienen
#     automáticamente via Cognito Identity Pool (STS).
VITE_AWS_USER_POOL_ID=${USER_POOL_ID}
VITE_AWS_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
VITE_AWS_COGNITO_DOMAIN=${COGNITO_DOMAIN}
VITE_AWS_IDENTITY_POOL_ID=${IDENTITY_POOL_ID}
VITE_AWS_REGION=${REGION}
VITE_DEV_ADMIN_EMAIL=${ADMIN_EMAIL}
ENV
ok ".env.production generado"

# .env.deploy para re-deploys (solo IDs de infraestructura, sin credenciales)
cat > .env.deploy << DEPLOY
# Generado automáticamente por setup-aws-infra.sh
# Para recuperar: ./scripts/get-config.sh
# $(date)
BUCKET_NAME=${BUCKET_NAME}
CLOUDFRONT_DIST_ID=${DIST_ID}
AWS_REGION=${REGION}
DEPLOY
ok ".env.deploy generado"

# ── 8. Build + Deploy del frontend ───────────────────────────────────────────
step "[8/9] Build y deploy del frontend..."
npm ci --silent
npm run build

# Assets con cache largo (Vite les pone hash en el nombre = inmutables)
aws s3 sync dist/ "s3://${BUCKET_NAME}" --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

# index.html siempre fresco
aws s3 cp dist/index.html "s3://${BUCKET_NAME}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"

ok "Frontend desplegado en S3"

# Invalidar caché de CloudFront
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" > /dev/null
ok "Caché de CloudFront invalidada"

# ── 9. Promover admin inicial ─────────────────────────────────────────────────
step "[9/9] Configurando administrador inicial: $ADMIN_EMAIL..."

# Crear el usuario admin en Cognito si no existe
USER_EXISTS=$(aws cognito-idp list-users \
  --user-pool-id "$USER_POOL_ID" \
  --filter "email = \"${ADMIN_EMAIL}\"" \
  --region "$REGION" \
  --query "Users[0].Username" \
  --output text 2>/dev/null)

if [ -z "$USER_EXISTS" ] || [ "$USER_EXISTS" = "None" ]; then
  # Generar contraseña temporal segura
  TEMP_PASS="TempPass$(date +%s)!"
  aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$ADMIN_EMAIL" \
    --user-attributes \
        Name=email,Value="$ADMIN_EMAIL" \
        Name=email_verified,Value=true \
        Name="custom:role",Value=admin \
    --temporary-password "$TEMP_PASS" \
    --message-action SUPPRESS \
    --region "$REGION" > /dev/null
  ok "Usuario admin creado: $ADMIN_EMAIL"
  warn "Contraseña temporal: $TEMP_PASS (cámbiala en el primer login)"
else
  # Usuario ya existe, solo actualizar el rol
  aws cognito-idp admin-update-user-attributes \
    --user-pool-id "$USER_POOL_ID" \
    --username "$ADMIN_EMAIL" \
    --user-attributes Name="custom:role",Value=admin \
    --region "$REGION"
  ok "Rol admin asignado a: $ADMIN_EMAIL"
fi

# ── Resumen final ─────────────────────────────────────────────────────────────
echo ""
echo "============================================="
echo -e "${GREEN} ✅ SETUP COMPLETADO EXITOSAMENTE${NC}"
echo "============================================="
echo " URL de la aplicación : $APP_URL"
echo " Cuenta AWS           : $ACCOUNT_ID"
echo " Región               : $REGION"
echo " Bucket S3            : $BUCKET_NAME"
echo " CloudFront ID        : $DIST_ID"
echo " User Pool ID         : $USER_POOL_ID"
echo " App Client ID        : $USER_POOL_CLIENT_ID"
echo " Identity Pool ID     : $IDENTITY_POOL_ID"
echo " Admin               : $ADMIN_EMAIL"
echo ""
echo " Configuración guardada en Secrets Manager: ${APP_NAME}/config"
echo " Archivos generados:"
echo "   .env.production  (variables para el frontend)"
echo "   .env.deploy      (variables para re-deploys)"
echo ""
echo " Para re-desplegar el frontend en el futuro:"
echo "   ./scripts/deploy.sh"
echo ""
echo " Para promover otro usuario a admin:"
echo "   ./scripts/bootstrap-admin.sh <email>"
echo "============================================="
