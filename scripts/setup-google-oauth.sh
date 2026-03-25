#!/bin/bash
# Setup Google OAuth Client ID for the Recipes app
# This script guides you through creating the OAuth Client ID in GCP Console

echo ""
echo "=== Google OAuth Client ID Setup ==="
echo ""
echo "1. Opening the GCP Console Credentials page..."
echo ""
open "https://console.cloud.google.com/apis/credentials?project=math-quiz-app-2026"
echo ""
echo "2. In the GCP Console:"
echo "   a. Click '+ CREATE CREDENTIALS' at the top"
echo "   b. Select 'OAuth client ID'"
echo "   c. If asked to configure consent screen:"
echo "      - Choose 'External' user type"
echo "      - Fill in 'App name': המתכונים שלי"
echo "      - Fill in 'User support email': your email"
echo "      - Fill in 'Developer contact email': your email"
echo "      - Click 'Save and Continue' through all steps"
echo "   d. Back on Create OAuth client ID:"
echo "      - Application type: 'Web application'"
echo "      - Name: 'Recipes Web App'"
echo "      - Authorized JavaScript origins: add these:"
echo "        * http://localhost:5173"
echo "        * http://localhost:3001"
echo "        * https://recipes-app-586698331775.me-west1.run.app"
echo "      - Click 'Create'"
echo ""
echo "3. Copy the 'Client ID' (ends with .apps.googleusercontent.com)"
echo ""
read -p "Paste your Google Client ID here: " CLIENT_ID

if [ -z "$CLIENT_ID" ]; then
  echo "No Client ID provided. Exiting."
  exit 1
fi

# Add to .env
ENVFILE="$(dirname "$0")/../.env"
if grep -q "GOOGLE_CLIENT_ID" "$ENVFILE" 2>/dev/null; then
  sed -i '' "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$CLIENT_ID|" "$ENVFILE"
else
  echo "GOOGLE_CLIENT_ID=$CLIENT_ID" >> "$ENVFILE"
fi

echo ""
echo "✅ GOOGLE_CLIENT_ID saved to .env"
echo ""
echo "To redeploy to GCP Cloud Run:"
echo "  gcloud run deploy recipes-app --source . --region me-west1 --allow-unauthenticated \\"
echo "    --set-env-vars \"GEMINI_API_KEY=\$(grep GEMINI_API_KEY .env | cut -d= -f2),GOOGLE_CLIENT_ID=$CLIENT_ID,NODE_ENV=production,ALLOWED_ORIGINS=https://recipes-app-586698331775.me-west1.run.app\""
echo ""
