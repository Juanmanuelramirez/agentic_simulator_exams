# AWS Deployment Guide - Manual Steps

## Current Status
- ✅ Application built and verified in `dist/`
- ✅ DynamoDB and Cognito infrastructure deployed
- 📦 Deployment-ready bundle: ~513 KB

## 🔐 Cognito Pre-configuration

Before deploying the frontend, ensure your AWS Cognito User Pool is correctly configured:

### 1. Custom Attributes
The application requires a custom attribute to handle multi-persona dashboards:
- **Attribute Name**: `role` (will be mapped to `custom:role`)
- **Type**: `String`
- **Mutable**: `Yes`

### 2. Social Identity Providers
Configure the following in the Cognito Console:
- **Google**: Set up a Google Cloud Project with OAuth 2.0 credentials.
- **Amazon**: Set up Login with Amazon (LWA) security profile.
- Add the `callback` and `sign-out` URLs matching your domain (e.g., `http://localhost:5173` for dev or your CloudFront URL for prod).

## Manual Deployment Steps

### Option 1: AWS Console (S3 + CloudFront)

#### Step 1: Create S3 Bucket
1. Go to AWS S3 Console: https://s3.console.aws.amazon.com/
2. Click "Create bucket"
3. Bucket name: `agentic-exam-simulator-prod` (or your preferred name)
4. Region: `us-east-1`
5. Uncheck "Block all public access" (we'll use CloudFront)
6. Click "Create bucket"

#### Step 2: Enable Static Website Hosting
1. Select your bucket
2. Go to "Properties" tab
3. Scroll to "Static website hosting"
4. Click "Edit"
5. Enable static website hosting
6. Index document: `index.html`
7. Error document: `index.html` (for React Router)
8. Save changes

#### Step 3: Upload Build Files
1. Go to "Objects" tab
2. Click "Upload"
3. Upload all files from the `dist/` folder
4. Click "Upload"

#### Step 4: Set Bucket Policy
1. Go to "Permissions" tab
2. Click "Bucket Policy"
3. Add this policy (replace YOUR-BUCKET-NAME):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

#### Step 5: Create CloudFront Distribution
1. Go to CloudFront Console: https://console.aws.amazon.com/cloudfront/
2. Click "Create distribution"
3. Origin domain: Select your S3 bucket
4. Origin access: "Origin access control settings (recommended)"
5. Create new OAC if needed
6. Viewer protocol policy: "Redirect HTTP to HTTPS"
7. Default root object: `index.html`
8. Custom error responses:
   - Error code: 403
   - Response page path: `/index.html`
   - HTTP response code: 200
   - Error code: 404
   - Response page path: `/index.html`
   - HTTP response code: 200
9. Click "Create distribution"
10. Wait 5-15 minutes for deployment

#### Step 6: Update S3 Bucket Policy for CloudFront
After creating CloudFront, update your S3 bucket policy to allow CloudFront access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::198449458161:distribution/YOUR-DISTRIBUTION-ID"
        }
      }
    }
  ]
}
```

### Option 2: AWS Amplify Console

#### Step 1: Push to Git Repository
1. Ensure your code is in a Git repository (GitHub, GitLab, Bitbucket)
2. Commit and push all changes

#### Step 2: Connect to Amplify
1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/
2. Click "New app" > "Host web app"
3. Select your Git provider
4. Authorize AWS Amplify
5. Select your repository and branch
6. Build settings (auto-detected):

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

7. Click "Save and deploy"
8. Wait for deployment (usually 3-5 minutes)

### Option 3: Using AWS CLI with Proper Permissions

If you can configure a user with proper permissions, run:

```bash
# Create bucket
aws s3 mb s3://agentic-exam-simulator-prod --region us-east-1

# Configure for static website
aws s3 website s3://agentic-exam-simulator-prod \
  --index-document index.html \
  --error-document index.html

# Upload files
aws s3 sync dist/ s3://agentic-exam-simulator-prod --delete

# Make public
aws s3api put-bucket-policy \
  --bucket agentic-exam-simulator-prod \
  --policy file://bucket-policy.json
```

## Required IAM Permissions

To deploy via CLI, the user needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:GetBucketWebsite",
        "s3:PutBucketWebsite",
        "s3:PutBucketPolicy",
        "s3:GetBucketPolicy",
        "s3:DeleteBucketPolicy",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::agentic-exam-simulator-*",
        "arn:aws:s3:::agentic-exam-simulator-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateDistribution",
        "cloudfront:GetDistribution",
        "cloudfront:UpdateDistribution",
        "cloudfront:DeleteDistribution",
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
```

## Post-Deployment Steps

1. **Test the deployment**: Visit your CloudFront URL or Amplify URL
2. **Configure custom domain** (optional):
   - Purchase domain in Route 53 or use existing
   - Create SSL certificate in ACM (us-east-1 for CloudFront)
   - Add CNAME record pointing to CloudFront distribution
3. **Set up monitoring**:
   - Enable CloudWatch logs
   - Set up billing alerts
4. **Configure CI/CD** (if using Amplify):
   - Automatic deployments on git push
   - Preview deployments for pull requests

## Estimated Costs

- **S3**: ~$0.023 per GB stored + $0.09 per GB transferred
- **CloudFront**: First 1TB free tier, then ~$0.085 per GB
- **Amplify**: First 1000 build minutes free, then $0.01 per minute
- **Estimated monthly cost**: $5-20 for low traffic

## Current Build Information

- Build folder: `dist/`
- Main bundle: 510 KB (consider code splitting for optimization)
- Assets: CSS (3 KB), HTML (0.47 KB)
- Total size: ~513 KB

## Next Steps

Choose one of the deployment options above based on your preferences:
- **Fastest**: AWS Amplify (automated, CI/CD included)
- **Most control**: S3 + CloudFront (manual setup, more configuration)
- **CLI**: Requires IAM permission updates first
