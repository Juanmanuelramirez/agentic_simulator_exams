#!/bin/bash
# =============================================================================
# delete-all-aws-resources.sh
# Elimina TODOS los recursos AWS del proyecto Agentic Exam Simulator
#
# ⚠️  IRREVERSIBLE - Elimina datos, usuarios, infraestructura completa
#
# Uso: ./scripts/delete-all-aws-resources.sh
# =============================================================================

set -e

REGION="us-east-1"
BUCKET_NAME="agentic-exam-simulator-prod"
DIST_ID="E220O4PZS2V3Y9"
APP_NAME="agentic-exam-simulator"
DB_STACK="exam-simulator-db"
AUTH_STACK="exam-simulator-auth"
SECRET_NAME="agentic-exam-simulator/config"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; }
step() { echo -e "\n${RED}▶ $1${NC}"; }

echo "============================================="
echo -e "${RED} ⚠️  ELIMINACIÓN TOTAL DE RECURSOS AWS${NC}"
echo " Proyecto: Agentic Exam Simulator"
echo " Región  : $REGION"
echo "============================================="
echo ""
read -p "¿Estás SEGURO de que quieres eliminar TODOS los recursos? (escribe 'ELIMINAR'): " CONFIRM
if [ "$CONFIRM" != "ELIMINAR" ]; then
  echo "Operación cancelada."
  exit 0
fi

# Verificar credenciales
echo ""
step "[0] Verificando credenciales AWS..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) \
  || { err "No se encontraron credenciales AWS. Ejecuta 'aws configure' primero."; exit 1; }
ok "Cuenta AWS: $ACCOUNT_ID"

# ── 1. Deshabilitar y eliminar CloudFront Distribution E220O4PZS2V3Y9 ────────
step "[1/8] Deshabilitando CloudFront distribution $DIST_ID..."

# Obtener ETag y config actual
DIST_CONFIG=$(aws cloudfront get-distribution-config --id "$DIST_ID" --region "$REGION" 2>/dev/null)
if [ $? -eq 0 ]; then
  ETAG=$(echo "$DIST_CONFIG" | python3 -c "import sys,json; print(json.load(sys.stdin)['ETag'])")
  
  # Deshabilitar la distribución
  echo "$DIST_CONFIG" | python3 -c "
import sys, json
data = json.load(sys.stdin)
config = data['DistributionConfig']
config['Enabled'] = False
print(json.dumps(config))
" > /tmp/cf-disable-config.json

  aws cloudfront update-distribution \
    --id "$DIST_ID" \
    --if-match "$ETAG" \
    --distribution-config file:///tmp/cf-disable-config.json \
    --region "$REGION" > /dev/null 2>&1
  ok "Distribución deshabilitada. Esperando a que se propague (esto puede tardar 5-15 min)..."

  # Esperar a que se despliegue completamente
  echo "   Esperando propagación (status: Deployed)..."
  aws cloudfront wait distribution-deployed --id "$DIST_ID" --region "$REGION" 2>/dev/null
  ok "Distribución desplegada con estado deshabilitado."

  # Obtener nuevo ETag para eliminar
  NEW_ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" --region "$REGION" \
    --query "ETag" --output text)
  
  aws cloudfront delete-distribution --id "$DIST_ID" --if-match "$NEW_ETAG" --region "$REGION"
  ok "CloudFront distribution $DIST_ID eliminada."
else
  warn "Distribution $DIST_ID no encontrada, puede ya estar eliminada."
fi

# ── 2. Verificar si hay otra distribución CloudFront (d3mbq53e5ir2xg) ────────
step "[2/8] Buscando distribución de imágenes (d3mbq53e5ir2xg)..."

IMG_DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?DomainName=='d3mbq53e5ir2xg.cloudfront.net'].Id" \
  --output text --region "$REGION" 2>/dev/null)

if [ -n "$IMG_DIST_ID" ] && [ "$IMG_DIST_ID" != "None" ] && [ "$IMG_DIST_ID" != "$DIST_ID" ]; then
  echo "   Encontrada distribución de imágenes: $IMG_DIST_ID"
  
  IMG_DIST_CONFIG=$(aws cloudfront get-distribution-config --id "$IMG_DIST_ID" --region "$REGION")
  IMG_ETAG=$(echo "$IMG_DIST_CONFIG" | python3 -c "import sys,json; print(json.load(sys.stdin)['ETag'])")
  
  echo "$IMG_DIST_CONFIG" | python3 -c "
import sys, json
data = json.load(sys.stdin)
config = data['DistributionConfig']
config['Enabled'] = False
print(json.dumps(config))
" > /tmp/cf-img-disable-config.json

  aws cloudfront update-distribution \
    --id "$IMG_DIST_ID" \
    --if-match "$IMG_ETAG" \
    --distribution-config file:///tmp/cf-img-disable-config.json \
    --region "$REGION" > /dev/null 2>&1
  ok "Distribución de imágenes deshabilitada. Esperando propagación..."
  
  aws cloudfront wait distribution-deployed --id "$IMG_DIST_ID" --region "$REGION" 2>/dev/null
  
  NEW_IMG_ETAG=$(aws cloudfront get-distribution-config --id "$IMG_DIST_ID" --region "$REGION" \
    --query "ETag" --output text)
  aws cloudfront delete-distribution --id "$IMG_DIST_ID" --if-match "$NEW_IMG_ETAG" --region "$REGION"
  ok "Distribución de imágenes eliminada."
else
  warn "No se encontró distribución de imágenes adicional (o ya fue eliminada)."
fi

# ── 3. Vaciar y eliminar bucket S3 ───────────────────────────────────────────
step "[3/8] Vaciando y eliminando bucket S3: $BUCKET_NAME..."

if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null; then
  # Vaciar el bucket (incluye todas las versiones si tiene versionado)
  aws s3 rm "s3://${BUCKET_NAME}" --recursive
  
  # Eliminar versiones de objetos si el bucket tiene versionado habilitado
  VERSIONS=$(aws s3api list-object-versions --bucket "$BUCKET_NAME" \
    --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --output json 2>/dev/null)
  if [ "$VERSIONS" != '{"Objects": null}' ] && [ "$VERSIONS" != "null" ]; then
    echo "$VERSIONS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('Objects'):
    # Process in batches of 1000
    objects = data['Objects']
    for i in range(0, len(objects), 1000):
        batch = objects[i:i+1000]
        delete_payload = json.dumps({'Objects': batch, 'Quiet': True})
        print(delete_payload)
" | while read -r payload; do
      echo "$payload" > /tmp/delete-objects.json
      aws s3api delete-objects --bucket "$BUCKET_NAME" --delete file:///tmp/delete-objects.json 2>/dev/null
    done
  fi
  
  # Eliminar delete markers
  DELETE_MARKERS=$(aws s3api list-object-versions --bucket "$BUCKET_NAME" \
    --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' --output json 2>/dev/null)
  if [ "$DELETE_MARKERS" != '{"Objects": null}' ] && [ "$DELETE_MARKERS" != "null" ]; then
    echo "$DELETE_MARKERS" > /tmp/delete-markers.json
    aws s3api delete-objects --bucket "$BUCKET_NAME" --delete file:///tmp/delete-markers.json 2>/dev/null
  fi
  
  # Eliminar el bucket
  aws s3api delete-bucket --bucket "$BUCKET_NAME" --region "$REGION"
  ok "Bucket $BUCKET_NAME eliminado."
else
  warn "Bucket $BUCKET_NAME no existe o ya fue eliminado."
fi

# ── 4. Eliminar CloudFormation stack de autenticación ─────────────────────────
step "[4/8] Eliminando stack CloudFormation: $AUTH_STACK..."

if aws cloudformation describe-stacks --stack-name "$AUTH_STACK" --region "$REGION" 2>/dev/null; then
  aws cloudformation delete-stack --stack-name "$AUTH_STACK" --region "$REGION"
  echo "   Esperando eliminación del stack (Cognito + IAM)..."
  aws cloudformation wait stack-delete-complete --stack-name "$AUTH_STACK" --region "$REGION"
  ok "Stack $AUTH_STACK eliminado (Cognito User Pool, Identity Pool, IAM Role)."
else
  warn "Stack $AUTH_STACK no encontrado."
fi

# ── 5. Eliminar CloudFormation stack de base de datos ─────────────────────────
step "[5/8] Eliminando stack CloudFormation: $DB_STACK..."

if aws cloudformation describe-stacks --stack-name "$DB_STACK" --region "$REGION" 2>/dev/null; then
  aws cloudformation delete-stack --stack-name "$DB_STACK" --region "$REGION"
  echo "   Esperando eliminación del stack (DynamoDB tables)..."
  aws cloudformation wait stack-delete-complete --stack-name "$DB_STACK" --region "$REGION"
  ok "Stack $DB_STACK eliminado (todas las tablas DynamoDB)."
else
  warn "Stack $DB_STACK no encontrado."
fi

# ── 6. Eliminar CloudFront OAC ───────────────────────────────────────────────
step "[6/8] Eliminando CloudFront Origin Access Control..."

OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='${APP_NAME}-oac'].Id" \
  --output text 2>/dev/null)

if [ -n "$OAC_ID" ] && [ "$OAC_ID" != "None" ]; then
  OAC_ETAG=$(aws cloudfront get-origin-access-control --id "$OAC_ID" \
    --query "ETag" --output text 2>/dev/null)
  aws cloudfront delete-origin-access-control --id "$OAC_ID" --if-match "$OAC_ETAG"
  ok "OAC eliminado: $OAC_ID"
else
  warn "OAC no encontrado."
fi

# ── 7. Eliminar Secrets Manager secret ────────────────────────────────────────
step "[7/8] Eliminando secret de Secrets Manager: $SECRET_NAME..."

if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$REGION" 2>/dev/null; then
  aws secretsmanager delete-secret \
    --secret-id "$SECRET_NAME" \
    --force-delete-without-recovery \
    --region "$REGION"
  ok "Secret eliminado: $SECRET_NAME"
else
  warn "Secret $SECRET_NAME no encontrado."
fi

# ── 8. Verificación final ────────────────────────────────────────────────────
step "[8/8] Verificación final - Buscando recursos remanentes..."

echo ""
echo "--- Verificando CloudFormation stacks ---"
REMAINING_STACKS=$(aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?contains(StackName,'exam-simulator')].StackName" \
  --output text --region "$REGION" 2>/dev/null)
if [ -n "$REMAINING_STACKS" ] && [ "$REMAINING_STACKS" != "None" ]; then
  err "Stacks restantes: $REMAINING_STACKS"
else
  ok "No hay stacks de CloudFormation restantes."
fi

echo ""
echo "--- Verificando tablas DynamoDB ---"
REMAINING_TABLES=$(aws dynamodb list-tables \
  --query "TableNames[?contains(@,'ExamSimulator')]" \
  --output text --region "$REGION" 2>/dev/null)
if [ -n "$REMAINING_TABLES" ] && [ "$REMAINING_TABLES" != "None" ]; then
  err "Tablas DynamoDB restantes: $REMAINING_TABLES"
else
  ok "No hay tablas DynamoDB restantes."
fi

echo ""
echo "--- Verificando Cognito User Pools ---"
REMAINING_POOLS=$(aws cognito-idp list-user-pools --max-results 20 \
  --query "UserPools[?contains(Name,'${APP_NAME}')].{Name:Name,Id:Id}" \
  --output text --region "$REGION" 2>/dev/null)
if [ -n "$REMAINING_POOLS" ] && [ "$REMAINING_POOLS" != "None" ]; then
  err "User Pools restantes: $REMAINING_POOLS"
else
  ok "No hay Cognito User Pools restantes."
fi

echo ""
echo "--- Verificando Identity Pools ---"
REMAINING_ID_POOLS=$(aws cognito-identity list-identity-pools --max-results 20 \
  --query "IdentityPools[?contains(IdentityPoolName,'${APP_NAME}')].{Name:IdentityPoolName,Id:IdentityPoolId}" \
  --output text --region "$REGION" 2>/dev/null)
if [ -n "$REMAINING_ID_POOLS" ] && [ "$REMAINING_ID_POOLS" != "None" ]; then
  err "Identity Pools restantes: $REMAINING_ID_POOLS"
else
  ok "No hay Cognito Identity Pools restantes."
fi

echo ""
echo "--- Verificando bucket S3 ---"
if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null; then
  err "Bucket $BUCKET_NAME aún existe."
else
  ok "Bucket S3 eliminado."
fi

echo ""
echo "--- Verificando CloudFront distributions ---"
REMAINING_CF=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Comment,'${APP_NAME}') || Origins.Items[0].DomainName=='${BUCKET_NAME}.s3.${REGION}.amazonaws.com'].Id" \
  --output text 2>/dev/null)
if [ -n "$REMAINING_CF" ] && [ "$REMAINING_CF" != "None" ]; then
  err "Distribuciones CloudFront restantes: $REMAINING_CF"
else
  ok "No hay distribuciones CloudFront restantes."
fi

echo ""
echo "--- Verificando IAM roles del proyecto ---"
REMAINING_ROLES=$(aws iam list-roles \
  --query "Roles[?contains(RoleName,'${APP_NAME}')].RoleName" \
  --output text 2>/dev/null)
if [ -n "$REMAINING_ROLES" ] && [ "$REMAINING_ROLES" != "None" ]; then
  err "Roles IAM restantes: $REMAINING_ROLES"
else
  ok "No hay roles IAM restantes."
fi

echo ""
echo "--- Verificando Secrets Manager ---"
REMAINING_SECRETS=$(aws secretsmanager list-secrets \
  --query "SecretList[?contains(Name,'${APP_NAME}')].Name" \
  --output text --region "$REGION" 2>/dev/null)
if [ -n "$REMAINING_SECRETS" ] && [ "$REMAINING_SECRETS" != "None" ]; then
  err "Secrets restantes: $REMAINING_SECRETS"
else
  ok "No hay secrets restantes."
fi

echo ""
echo "--- Verificando CloudFront OAC ---"
REMAINING_OAC=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?contains(Name,'${APP_NAME}')].Name" \
  --output text 2>/dev/null)
if [ -n "$REMAINING_OAC" ] && [ "$REMAINING_OAC" != "None" ]; then
  err "OAC restantes: $REMAINING_OAC"
else
  ok "No hay OAC restantes."
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
echo ""
echo "============================================="
echo -e "${GREEN} ✅ ELIMINACIÓN COMPLETADA${NC}"
echo "============================================="
echo " Recursos eliminados:"
echo "   - CloudFront Distribution: $DIST_ID"
echo "   - S3 Bucket: $BUCKET_NAME"
echo "   - CloudFormation Stack: $AUTH_STACK (Cognito + IAM)"
echo "   - CloudFormation Stack: $DB_STACK (DynamoDB)"
echo "   - CloudFront OAC: ${APP_NAME}-oac"
echo "   - Secrets Manager: $SECRET_NAME"
echo ""
echo " DynamoDB tables eliminadas:"
echo "   - ExamSimulator-Simulators"
echo "   - ExamSimulator-Questions"
echo "   - ExamSimulator-Attempts"
echo "   - ExamSimulator-Organizations"
echo "   - ExamSimulator-Coupons"
echo "   - ExamSimulator-Subscriptions"
echo ""
echo " Cognito eliminado:"
echo "   - User Pool: us-east-1_mKyMujzYr"
echo "   - Identity Pool: us-east-1:1014262b-bc47-43cf-a6b8-b41fee27d98d"
echo "   - Dominio: agentic-exam-simulator-auth"
echo ""
echo " Si la distribución de imágenes (d3mbq53e5ir2xg) no se eliminó,"
echo " revísala manualmente en la consola de CloudFront."
echo "============================================="
