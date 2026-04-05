---
name: deploy-gcp
description: Deploy the Recipes app to Google Cloud Run, auto-incrementing the version number
user_invocable: true
---

# Deploy to GCP Cloud Run

Follow these steps to deploy the Recipes app to Google Cloud Run:

## Step 1: Bump the version

1. Read `version.json` from the project root
2. Parse the current version (semver format: MAJOR.MINOR.PATCH)
3. Increment the PATCH number by 1 (e.g., 1.0.0 → 1.0.1)
4. Write the updated version back to `version.json`
5. Also update the `version` field in the root `package.json` to match

## Step 2: Commit the version bump

1. Stage `version.json` and `package.json`
2. Commit with message: `chore: bump version to X.Y.Z for deployment`

## Step 3: Build and deploy to Cloud Run

Run the following gcloud command:

```bash
gcloud run deploy recipes-app \
  --source . \
  --region me-west1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,JWT_SECRET=JWT_SECRET:latest
```

IMPORTANT: Never pass secrets as `--set-env-vars` inline. Always use `--set-secrets` with GCP Secret Manager.

If additional environment variables are needed (non-secret), use `--set-env-vars` only for non-sensitive values like `NODE_ENV=production`.

## Step 4: Verify

After deployment completes, report the deployed URL and the new version number to the user.
