#!/bin/bash
# =============================================================================
# deploy.sh - Re-deploy rápido del frontend (sin recrear infraestructura)
#
# Uso: ./scripts/deploy.sh
#
# Lee la configuración de .env.deploy (generado por setup-aws-infra.sh)
# o de variables de entorno si están definidas.
# =============================================================================

set -e

# Cargar .env.deploy si existe
if [ -f ".env.deploy" ]; then
  export $(grep -v '^#' .env.deploy | xargs)
else
  # Intentar leer desde CloudFormation como fallback
  echo "⚠️  .env.deploy no encontrado, intentando leer desde CloudFormation..."
  REGION="${AWS_REGION:-us-east-1}"
  AUTH_STACK="exam-simulator-auth"
  APP_NAME="agentic-exam-simulator"

  BUCKET_NAME="${BUCKET_NAME:-agentic-exam-simulator-prod}"
  CLOUDFRONT_DIST_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[0].DomainName=='${BUCKET_NAME}.s3.${REGION}.amazonaws.com'].Id" \
    --output text 2>/dev/null)
fi

BUCKET_NAME="${BUCKET_NAME:-agentic-exam-simulator-prod}"
DIST_ID="${CLOUDFRONT_DIST_ID}"

if [ -z "$DIST_ID" ] || [ "$DIST_ID" = "None" ]; then
  echo "❌ No se encontró CLOUDFRONT_DIST_ID."
  echo "   Ejecuta primero: ./scripts/setup-aws-infra.sh"
  exit 1
fi

echo "🚀 Desplegando frontend..."
echo "   Bucket     : $BUCKET_NAME"
echo "   CloudFront : $DIST_ID"

# Build
npm run build

# Assets con cache largo (hash en nombre = inmutables)
# --exclude "exam-images/*" preserva las imágenes subidas por el admin
aws s3 sync dist/ "s3://${BUCKET_NAME}" --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" \
  --exclude "exam-images/*"

# index.html siempre fresco
aws s3 cp dist/index.html "s3://${BUCKET_NAME}/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"

# Invalidar toda la caché (necesario porque los hashes de assets cambian)
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" > /dev/null

echo "✅ Deploy completado"
