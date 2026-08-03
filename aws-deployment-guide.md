# Guía de Despliegue - Agentic Exam Simulator

## Arquitectura de seguridad

```
Usuario (browser)
    │
    ▼
Cognito User Pool  ──► Login web (email/password, Google)
    │                    custom:role (admin/org_admin/user)
    │                    custom:org_id (UUID organización)
    ▼
Cognito Identity Pool  ──► STS AssumeRoleWithWebIdentity
    │                        (credenciales temporales, expiran en 1h)
    ▼
IAM Role (authenticated)
    ├── DynamoDB:  ExamSimulator-* (CRUD, incluye Organizations)
    ├── Bedrock:   InvokeModel (Claude 3 Haiku/Sonnet)
    ├── Translate: TranslateText
    └── Cognito:   AdminCreateUser, AdminGetUser (invitaciones)

⚠️  NUNCA se usan Access Keys estáticas en el frontend.
    Las credenciales son temporales y se renuevan automáticamente por Amplify.
```

```
GitHub / Local
    │
    ▼
setup-aws-infra.sh
    ├── CloudFormation: DynamoDB (6 tablas, incluye Organizations, Coupons, Subscriptions)
    ├── CloudFormation: Cognito User Pool + Identity Pool + IAM Role
    │     └── custom:role (admin/org_admin/user) + custom:org_id
    ├── S3 Bucket (privado, solo CloudFront via OAC)
    ├── CloudFront Distribution (HTTPS, SPA routing)
    ├── Actualiza Cognito callback con URL real de CloudFront
    ├── Guarda config en AWS Secrets Manager  ◄── fuente de verdad
    ├── Genera .env.production automáticamente
    ├── Build + Deploy del frontend
    └── Crea usuario admin inicial en Cognito
```

---

## Prerrequisitos

| Herramienta | Versión mínima | Instalación |
|---|---|---|
| AWS CLI | v2 | https://aws.amazon.com/cli/ |
| Node.js | v18+ | https://nodejs.org |
| Python 3 | v3.8+ | https://python.org |

### Configurar credenciales AWS (solo para el deployer, una vez)

```bash
aws configure
# AWS Access Key ID     : <access key del usuario IAM deployer>
# AWS Secret Access Key : <secret key del usuario IAM deployer>
# Default region name   : us-east-1
# Default output format : json
```

El usuario IAM `exam-simulator-deployer` debe tener adjunta la política `deployment-policy.json`.

Para crear el usuario y adjuntar la política:

```bash
# Crear usuario
aws iam create-user --user-name exam-simulator-deployer

# Crear la política
POLICY_ARN=$(aws iam create-policy \
  --policy-name ExamSimulatorDeployPolicy \
  --policy-document file://deployment-policy.json \
  --query Policy.Arn --output text)

# Adjuntar al usuario
aws iam attach-user-policy \
  --user-name exam-simulator-deployer \
  --policy-arn "$POLICY_ARN"

# Crear access keys
aws iam create-access-key --user-name exam-simulator-deployer
```

---

## Setup inicial (primera vez)

Un solo comando despliega toda la infraestructura:

```bash
./scripts/setup-aws-infra.sh [REGION] [ADMIN_EMAIL] [BUCKET_NAME]
```

**Ejemplo:**
```bash
./scripts/setup-aws-infra.sh us-east-1 admin@miempresa.com
```

El script realiza automáticamente estos 9 pasos:

1. Verifica credenciales AWS del deployer
2. Despliega tablas DynamoDB via CloudFormation
3. Crea Cognito User Pool + Identity Pool + IAM Role via CloudFormation
4. Crea bucket S3 con acceso público bloqueado
5. Crea distribución CloudFront con Origin Access Control (OAC)
6. Actualiza Cognito con la URL real de CloudFront como callback
7. Guarda toda la config en **AWS Secrets Manager** y genera `.env.production`
8. Ejecuta build y sube el frontend a S3
9. Crea el usuario administrador inicial en Cognito

Al finalizar:
```
✅ SETUP COMPLETADO EXITOSAMENTE
 URL de la aplicación : https://xxxx.cloudfront.net
 User Pool ID         : us-east-1_XXXXXXX
 Identity Pool ID     : us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 Configuración en     : AWS Secrets Manager / agentic-exam-simulator/config
```

---

## Re-deploys (cambios de código)

```bash
./scripts/deploy.sh
```

Lee automáticamente `.env.deploy`. Si no existe, lo recupera de CloudFront directamente.

---

## Recuperar configuración en máquina nueva o CI/CD

Si necesitas regenerar `.env.production` sin correr el setup completo:

```bash
./scripts/get-config.sh [REGION]
```

Lee desde Secrets Manager y regenera ambos archivos `.env.production` y `.env.deploy`.

---

## Gestión de administradores

```bash
# Promover usuario existente
./scripts/bootstrap-admin.sh admin@empresa.com

# Crear nuevo usuario admin desde cero
./scripts/bootstrap-admin.sh nuevo@empresa.com
# Responde 's' cuando pregunte si deseas crearlo
```

El script lee el User Pool ID automáticamente desde CloudFormation.

---

## Infraestructura como Código (IaC)

| Archivo | Recursos creados |
|---|---|
| `infra/dynamodb.yml` | 6 tablas DynamoDB (Simulators, Questions, Attempts, Organizations, Coupons, Subscriptions) |
| `infra/cognito.yml` | User Pool (con custom:role y custom:org_id), App Client (Google IdP), Dominio, Identity Pool, IAM Role (incluye Cognito Admin API) |

Para actualizar infraestructura individualmente:

```bash
# Solo DynamoDB
aws cloudformation deploy \
  --template-file infra/dynamodb.yml \
  --stack-name exam-simulator-db \
  --region us-east-1

# Solo Cognito + Identity Pool
aws cloudformation deploy \
  --template-file infra/cognito.yml \
  --stack-name exam-simulator-auth \
  --region us-east-1 \
  --parameter-overrides \
      AppName=agentic-exam-simulator \
      AdminEmail=admin@empresa.com \
      CallbackUrl=https://xxxx.cloudfront.net \
  --capabilities CAPABILITY_NAMED_IAM
```

---

## Permisos IAM

### Usuario deployer (`deployment-policy.json`)

Permisos mínimos para ejecutar el setup y re-deploys:

| Servicio | Acciones | Scope |
|---|---|---|
| S3 | CRUD bucket + objetos | `agentic-exam-simulator-*` |
| CloudFront | Crear/actualizar distribución, invalidar caché | `*` |
| CloudFormation | Crear/actualizar stacks | `exam-simulator-*` |
| DynamoDB | Crear/describir tablas | `ExamSimulator-*` |
| Cognito User Pool | Crear pool, clientes, usuarios | `*` |
| Cognito Identity | Crear/configurar Identity Pool | `*` |
| Secrets Manager | Crear/leer/actualizar secrets | `agentic-exam-simulator/*` |
| IAM | Crear roles, adjuntar políticas | `agentic-exam-simulator-*` |

### Rol de usuarios autenticados (creado automáticamente por CloudFormation)

Permisos que recibe cada usuario al hacer login:

| Servicio | Acciones | Scope |
|---|---|---|
| DynamoDB | GetItem, PutItem, Query, Scan, Delete | `ExamSimulator-*` (incluye Organizations) |
| Bedrock | InvokeModel | Claude 3 Haiku/Sonnet en us-east-1 |
| Translate | TranslateText | `*` |
| Cognito Admin API | AdminCreateUser, AdminGetUser | User Pool ARN (para invitaciones) |

---

## Flujo de credenciales en producción

```
1. Usuario hace login en la web (email/password o Google/Amazon)
2. Cognito User Pool valida credenciales y emite tokens JWT
3. Amplify intercambia el JWT por credenciales temporales STS
   via Cognito Identity Pool (válidas por 1 hora, auto-renovadas)
4. Los clientes AWS (Bedrock, DynamoDB, Translate) usan esas
   credenciales temporales — nunca Access Keys estáticas
5. Al cerrar sesión, las credenciales expiran automáticamente
```

---

## Costos estimados (Free Tier)

| Servicio | Free Tier | Uso estimado PoC |
|---|---|---|
| S3 | 5 GB almacenamiento | ~1 MB ✅ |
| CloudFront | 1 TB + 10M requests/mes | Mínimo ✅ |
| DynamoDB | 25 GB + 25 WCU/RCU | Mínimo ✅ |
| Cognito User Pool | 50,000 MAU | < 100 usuarios ✅ |
| Cognito Identity | Gratuito | ✅ |
| Secrets Manager | $0.40/secret/mes | ~$0.40 ⚠️ |
| Bedrock | Sin free tier | Pago por token ⚠️ |
| CloudFormation | Gratuito | ✅ |

**Costo mensual estimado para PoC: ~$0.40 + uso de Bedrock**

---

## Login Social (Google)

El User Pool tiene Google configurado como identity provider. Para configurarlo en un nuevo entorno:

### Prerrequisitos
1. Crear credenciales OAuth 2.0 en [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Tipo: Aplicación web
   - Orígenes autorizados de JavaScript: `https://<cognito-domain>.auth.<region>.amazoncognito.com`
   - URI de redirección autorizados: `https://<cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse`

### Configurar en Cognito via CLI

```bash
# Crear identity provider Google
aws cognito-idp create-identity-provider \
  --user-pool-id <USER_POOL_ID> \
  --provider-name Google \
  --provider-type Google \
  --provider-details '{"client_id":"<GOOGLE_CLIENT_ID>","client_secret":"<GOOGLE_CLIENT_SECRET>","authorize_scopes":"openid email profile"}' \
  --attribute-mapping '{"email":"email","username":"sub"}' \
  --region us-east-1

# Actualizar App Client para soportar Google
aws cognito-idp update-user-pool-client \
  --user-pool-id <USER_POOL_ID> \
  --client-id <CLIENT_ID> \
  --supported-identity-providers COGNITO Google \
  --callback-urls "https://<CLOUDFRONT_URL>" \
  --logout-urls "https://<CLOUDFRONT_URL>" \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes email openid profile \
  --allowed-o-auth-flows-user-pool-client \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --read-attributes email custom:role custom:org_id \
  --write-attributes email custom:org_id \
  --region us-east-1
```

---

## Gestión de Organizaciones (Multi-tenant)

La plataforma soporta una jerarquía de roles:

```
Super Admin (admin)
    └── Crea organizaciones, asigna exámenes y org_admins
Organization Admin (org_admin)
    └── Gestiona estudiantes dentro de su organización
Student (user)
    └── Ve solo los exámenes asignados a su organización
```

### Tabla DynamoDB: ExamSimulator-Organizations

| Atributo | Tipo | Clave |
|---|---|---|
| `id` | String | Partition Key |
| `name` | String | GSI `OrgNameIndex` |

### Atributos Cognito personalizados

| Atributo | Tipo | Valores |
|---|---|---|
| `custom:role` | String | `admin`, `org_admin`, `user` |
| `custom:org_id` | String | UUID de la organización |

### Flujo de invitación

1. Super Admin o Org Admin invita usuario desde la UI
2. `invitationService.ts` llama `AdminCreateUser` con `custom:role` y `custom:org_id`
3. Cognito envía email con contraseña temporal
4. Usuario hace login, cambia contraseña, y accede al dashboard según su rol

---

## Solución de problemas

**Error: "No se encontraron credenciales AWS"**
```bash
aws configure
# o
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_DEFAULT_REGION=us-east-1
```

**Error en CloudFormation: "ROLLBACK_COMPLETE"**
```bash
aws cloudformation delete-stack --stack-name exam-simulator-auth --region us-east-1
./scripts/setup-aws-infra.sh
```

**La app carga pero no puede llamar a Bedrock/DynamoDB**
- Verifica que `VITE_AWS_IDENTITY_POOL_ID` esté en `.env.production`
- Ejecuta `./scripts/get-config.sh` para regenerar desde Secrets Manager
- Ejecuta `./scripts/deploy.sh` para re-desplegar con las variables actualizadas

**Bedrock: "AccessDeniedException"**
- Activa el modelo en la consola: https://console.aws.amazon.com/bedrock/
- Ve a "Model access" y solicita acceso a Claude 3 Haiku

**Secrets Manager: "ResourceNotFoundException"**
```bash
# El secret no existe, ejecuta el setup completo
./scripts/setup-aws-infra.sh us-east-1 admin@empresa.com
```

---

## Eliminación total de recursos AWS

Para eliminar TODOS los recursos del proyecto (irreversible):

```bash
./scripts/delete-all-aws-resources.sh
```

El script elimina en orden:
1. CloudFront Distributions (principal + imágenes)
2. S3 Bucket (vacía contenido primero)
3. CloudFormation stack `exam-simulator-auth` (Cognito + IAM)
4. CloudFormation stack `exam-simulator-db` (DynamoDB)
5. CloudFront OAC
6. Secret en Secrets Manager

Incluye verificación final automática de que no quedan recursos.
