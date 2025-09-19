# MemLoop Extension - CI/CD Setup

This document describes the CI/CD pipeline for the MemLoop Chrome Extension, based on the unified-ci-cd pattern.

## Overview

The CI/CD pipeline automatically builds, tests, and deploys the MemLoop extension across different environments (dev, staging, prod) using GitHub Actions.

## Workflow Structure

### 1. Build & Test Job
- **Trigger**: Push to main/develop, PRs, or manual dispatch
- **Actions**: 
  - Installs dependencies
  - Runs linting
  - Builds configuration from SSM parameters
  - Validates manifest and configuration files
  - Runs extension tests
  - Packages extension for distribution

### 2. Deploy to S3 Job
- **Trigger**: After successful build (non-PR only)
- **Actions**:
  - Uploads packaged extension to S3
  - Creates CloudFront invalidation
  - Updates version metadata

### 3. Smoke Test Job
- **Trigger**: After successful deployment
- **Actions**:
  - Downloads extension from S3
  - Validates package integrity
  - Tests configuration endpoints

## Scripts

### `scripts/ci-build.sh`
Main build script that:
- Installs dependencies
- Runs linting
- Builds configuration from SSM
- Validates all files
- Prepares extension for packaging

**Usage:**
```bash
./scripts/ci-build.sh [dev|staging|prod]
```

### `scripts/package-extension.sh`
Creates distributable extension packages:
- Copies extension files (excludes dev files)
- Creates ZIP and CRX packages
- Generates version metadata

**Usage:**
```bash
./scripts/package-extension.sh [dev|staging|prod] [output-dir]
```

### `scripts/test-extension.sh`
Validates extension locally:
- Builds extension
- Validates manifest structure
- Checks required permissions
- Tests configuration files
- Verifies service worker

**Usage:**
```bash
./scripts/test-extension.sh [dev|staging|prod]
```

## Environment Variables

The pipeline uses these environment variables:

### Required
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `AWS_REGION` - AWS region (default: eu-west-1)

### Optional
- `TENANT` - Tenant name (default: carousel-labs)
- `NODE_VERSION` - Node.js version (default: 18)

## SSM Parameters

The build process fetches configuration from SSM:

```
/tf/{stage}/{tenant}/services/mem0/cognito_config
```

Expected structure:
```json
{
  "domainUrl": "https://auth.example.com",
  "webClientId": "client-id",
  "tokenEndpoint": "https://auth.example.com/oauth2/token",
  "authorizationEndpoint": "https://auth.example.com/oauth2/authorize",
  "jwksUri": "https://auth.example.com/.well-known/jwks.json"
}
```

## S3 Deployment Structure

Extensions are deployed to:
```
s3://{bucket}/extensions/memloop/{stage}/
├── memloop-{version}-{stage}.zip     # Extension package
├── memloop-{version}-{stage}.crx     # Chrome package
├── latest/
│   ├── memloop-latest.zip
│   └── memloop-latest.crx
└── metadata.json                     # Version info
```

## Local Development

### Build for development:
```bash
npm run build:dev
```

### Test locally:
```bash
npm run test
```

### Package for distribution:
```bash
npm run package:dev
```

## Manual Deployment

To manually deploy a specific version:

1. Go to GitHub Actions
2. Select "MemLoop Extension - Build & Deploy"
3. Click "Run workflow"
4. Select stage (dev/staging/prod)
5. Click "Run workflow"

## Troubleshooting

### Common Issues

1. **SSM Parameter Not Found**
   - Ensure SSM parameters exist for the target stage
   - Run: `npm run seed-config:dev` to create missing parameters

2. **AWS Permissions**
   - Verify GitHub Actions has proper AWS credentials
   - Check IAM permissions for SSM, S3, and CloudFront

3. **Build Failures**
   - Check Node.js version compatibility
   - Ensure all required files are present
   - Validate manifest.json structure

4. **Configuration Issues**
   - Verify SSM parameter structure matches expected format
   - Check OIDC well-known endpoint accessibility
   - Validate Cognito configuration

### Debug Commands

```bash
# Check current configuration
jq . config/auth.defaults.json

# Validate manifest
jq . manifest.json

# Test SSM parameter access
aws ssm get-parameter --name "/tf/dev/carousel-labs/services/mem0/cognito_config"

# Check S3 deployment
aws s3 ls s3://your-bucket/extensions/memloop/dev/
```

## Security Considerations

- Never commit AWS credentials to repository
- Use GitHub Secrets for sensitive environment variables
- Validate all configuration before deployment
- Ensure S3 bucket policies are properly configured
- Use least-privilege IAM permissions

## Monitoring

The pipeline includes:
- Build status notifications
- Deployment success/failure alerts
- Extension validation checks
- CloudFront cache invalidation confirmation

For issues, check:
1. GitHub Actions logs
2. AWS CloudWatch logs
3. S3 access logs
4. CloudFront distribution status
